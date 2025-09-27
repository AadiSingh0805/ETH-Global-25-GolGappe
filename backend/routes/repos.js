import express from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import githubService from '../services/githubService.js';
import bountyService from '../services/bountyService.js';
import { uploadRepoMetadata } from '../services/lightHouseService.js';

const router = express.Router();

// Get user repositories from GitHub
router.get('/', requireAuth, async (req, res) => {
  try {
    if (!req.user.github?.accessToken) {
      return res.status(400).json({
        success: false,
        message: 'GitHub authentication required. Please connect your GitHub account.'
      });
    }

    const result = await githubService.getUserRepositories(req.user.github.accessToken);
    
    if (result.success) {
      res.json({
        success: true,
        repos: result.data,
        count: result.data.length,
        message: 'Repositories fetched successfully'
      });
    } else {
      res.status(result.status || 500).json({
        success: false,
        message: result.error || 'Failed to fetch repositories'
      });
    }
  } catch (error) {
    console.error('Get repositories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get repositories'
    });
  }
});

// Get specific repository with issues
router.get('/:owner/:repo', requireAuth, async (req, res) => {
  try {
    const { owner, repo } = req.params;
    
    if (!req.user.github?.accessToken) {
      return res.status(400).json({
        success: false,
        message: 'GitHub authentication required. Please connect your GitHub account.'
      });
    }

    // Get repository metadata and issues in parallel
    const [repoResult, issuesResult] = await Promise.all([
      githubService.getRepositoryMetadata(owner, repo, req.user.github.accessToken),
      githubService.getRepositoryIssues(owner, repo, req.user.github.accessToken)
    ]);

    if (!repoResult.success) {
      return res.status(repoResult.status || 404).json({
        success: false,
        message: repoResult.error || 'Repository not found'
      });
    }

    res.json({
      success: true,
      repo: {
        ...repoResult.data,
        issues: issuesResult.success ? issuesResult.data : []
      },
      message: 'Repository details fetched successfully'
    });
  } catch (error) {
    console.error('Get repository error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get repository'
    });
  }
});

// Create/List repository with bounty metadata
router.post('/', requireAuth, async (req, res) => {
  try {
    const { repoId, name, description, bountyData } = req.body;
    
    if (!repoId || !name) {
      return res.status(400).json({
        success: false,
        message: 'Repository ID and name are required'
      });
    }

    // Create metadata object for storing in Filecoin
    const repoMetadata = {
      repoId: parseInt(repoId),
      name,
      description: description || '',
      owner: {
        id: req.user._id,
        username: req.user.username,
        githubId: req.user.github?.id
      },
      bountyData: bountyData || {},
      listedAt: new Date().toISOString(),
      status: 'active'
    };

    res.json({
      success: true,
      repo: repoMetadata,
      message: 'Repository listing created successfully'
    });
  } catch (error) {
    console.error('Create repository listing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create repository listing'
    });
  }
});

// Create bounty for repository issue
router.post('/:repoId/issues/:issueId/bounty', requireAuth, async (req, res) => {
  try {
    const { repoId, issueId } = req.params;
    const { amount, description, deadline, requirements, privateKey } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid bounty amount is required'
      });
    }

    // Create bounty metadata for storing in Filecoin
    const bountyData = {
      repoId: parseInt(repoId),
      issueId: parseInt(issueId),
      amount: parseFloat(amount),
      description: description || '',
      deadline: deadline || null,
      requirements: requirements || [],
      creator: {
        id: req.user._id,
        username: req.user.username,
        githubId: req.user.github?.id
      },
      assignee: null
    };

    // Use bounty service to create bounty and store in Filecoin + blockchain
    const result = await bountyService.createBounty(bountyData, privateKey);
    
    if (result.success) {
      res.json({
        success: true,
        bounty: result.data.bounty,
        metadataCID: result.data.metadataCID,
        ipfsUrl: result.data.ipfsUrl,
        transactionHash: result.data.transactionHash,
        message: 'Bounty created and stored in Filecoin successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Create bounty error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create bounty'
    });
  }
});

// Assign bounty to contributor
router.post('/:repoId/issues/:issueId/assign', requireAuth, async (req, res) => {
  try {
    const { repoId, issueId } = req.params;
    const { assigneeId, assigneeUsername, assigneeGithubId, metadataCID, privateKey } = req.body;

    if (!assigneeId || !metadataCID) {
      return res.status(400).json({
        success: false,
        message: 'Assignee ID and metadata CID are required'
      });
    }

    const assigneeData = {
      id: assigneeId,
      username: assigneeUsername,
      githubId: assigneeGithubId,
      assignedBy: {
        id: req.user._id,
        username: req.user.username
      }
    };

    const result = await bountyService.assignBounty(
      repoId, 
      issueId, 
      assigneeData, 
      metadataCID, 
      privateKey
    );

    if (result.success) {
      res.json({
        success: true,
        bounty: result.data.bounty,
        newMetadataCID: result.data.newCID,
        message: 'Bounty assigned successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Assign bounty error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign bounty'
    });
  }
});

// Complete bounty and release payment
router.post('/:repoId/issues/:issueId/complete', requireAuth, async (req, res) => {
  try {
    const { repoId, issueId } = req.params;
    const { contributorAddress, metadataCID, privateKey } = req.body;

    if (!contributorAddress || !metadataCID) {
      return res.status(400).json({
        success: false,
        message: 'Contributor address and metadata CID are required'
      });
    }

    const result = await bountyService.completeBounty(
      repoId,
      issueId,
      contributorAddress,
      metadataCID,
      privateKey
    );

    if (result.success) {
      res.json({
        success: true,
        bounty: result.data.bounty,
        transactionHash: result.data.transactionHash,
        contributorAddress,
        message: 'Bounty completed and payment released'
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Complete bounty error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete bounty'
    });
  }
});

// Get bounty details
router.get('/bounty/:cid', optionalAuth, async (req, res) => {
  try {
    const { cid } = req.params;
    
    const result = await bountyService.getBountyByCID(cid);
    
    if (result.success) {
      res.json({
        success: true,
        bounty: result.data.bounty,
        cid: result.data.cid,
        ipfsUrl: result.data.ipfsUrl,
        message: 'Bounty details retrieved successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Get bounty error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve bounty details'
    });
  }
});

// Get repository bounties (blockchain data)
router.get('/:repoId/bounties', optionalAuth, async (req, res) => {
  try {
    const { repoId } = req.params;
    
    // Get project pool balance
    const poolResult = await bountyService.getProjectPool(repoId);
    
    res.json({
      success: true,
      repoId: parseInt(repoId),
      projectPool: poolResult.success ? poolResult.data : null,
      message: 'Repository bounty information retrieved'
    });
  } catch (error) {
    console.error('Get repository bounties error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve repository bounties'
    });
  }
});

// Get repository issues
router.get('/:owner/:repo/issues', requireAuth, async (req, res) => {
  try {
    const { owner, repo } = req.params;
    
    if (!req.user.github?.accessToken) {
      return res.status(400).json({
        success: false,
        message: 'GitHub authentication required. Please connect your GitHub account.'
      });
    }

    const result = await githubService.getRepositoryIssues(owner, repo, req.user.github.accessToken);
    
    if (result.success) {
      res.json({
        success: true,
        issues: result.data,
        count: result.data.length,
        message: 'Issues fetched successfully'
      });
    } else {
      res.status(result.status || 500).json({
        success: false,
        message: result.error || 'Failed to fetch issues'
      });
    }
  } catch (error) {
    console.error('Get repository issues error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get repository issues'
    });
  }
});

export default router;
