import express from 'express';
import { ethers } from 'ethers';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import githubService from '../services/githubService.js';
import bountyService from '../services/bountyService.js';
import { isAdmin } from '../utils/adminUtils.js';

const router = express.Router();

const resolvePayoutAddress = () => {
  const directAddress = String(process.env.PAYOUT_WALLET_ADDRESS || '').trim();
  const privateKey = String(process.env.PAYOUT_WALLET_PRIVATE_KEY || '').trim();

  if (privateKey) {
    const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    return new ethers.Wallet(formattedKey).address;
  }

  if (directAddress) {
    if (ethers.isAddress(directAddress)) {
      return directAddress;
    }

    if (/^(0x)?[0-9a-fA-F]{64}$/.test(directAddress)) {
      const formattedKey = directAddress.startsWith('0x') ? directAddress : `0x${directAddress}`;
      return new ethers.Wallet(formattedKey).address;
    }
  }

  return null;
};

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

// Get already listed repositories
router.get('/listed', optionalAuth, async (req, res) => {
  try {
    console.log('🔍 Fetching listed repositories...');
    const listedReposResult = await bountyService.getListedRepositories();
    console.log('📊 Repository listing query result:', {
      success: listedReposResult.success,
      total: listedReposResult.total,
      dataLength: listedReposResult.data?.length
    });
    
    if (listedReposResult.success) {
      // Log detailed information about each repository
      listedReposResult.data.forEach((repo, index) => {
        console.log(`📦 Repo ${index + 1}:`, {
          blockchainId: repo.blockchainId,
          cid: repo.cid,
          owner: repo.owner,
          githubId: repo.githubId,
          name: repo.name,
          hasMetadata: !!repo.metadata
        });
      });
      
      res.json({
        success: true,
        listedRepos: listedReposResult.data,
        total: listedReposResult.total,
        message: `Found ${listedReposResult.total} listed repositories`
      });
    } else {
      console.error('❌ Failed to fetch listed repositories:', listedReposResult);
      // Fail-soft so the UI can still load other sections even if listing data is unavailable.
      res.json({
        success: true,
        listedRepos: [],
        total: 0,
        warning: listedReposResult.message || 'Repository listing is temporarily unavailable',
        error: listedReposResult.error || null,
        message: 'No listed repositories available right now'
      });
    }
  } catch (error) {
    console.error('💥 Get listed repositories error:', error);
    // Keep API contract stable for frontend consumers.
    res.json({
      success: true,
      listedRepos: [],
      total: 0,
      warning: 'Failed to get listed repositories',
      error: error.message,
      message: 'No listed repositories available right now'
    });
  }
});

// Test endpoint (no auth required) for debugging
router.get('/listed/debug', async (req, res) => {
  try {
    console.log('🔧 DEBUG: Fetching listed repositories without authentication...');
    const listedReposResult = await bountyService.getListedRepositories();
    
    res.json({
      success: true,
      debug: true,
      result: listedReposResult,
      message: 'Debug data for listed repositories'
    });
  } catch (error) {
    console.error('💥 Debug endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      debug: true
    });
  }
});

// Get specific repository with issues
router.get('/github/:owner/:repo', requireAuth, async (req, res) => {
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

    // Create metadata object for local storage
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
      status: 'active',
      fullName: req.body.fullName || `${req.user.username}/${name}`,
      html_url: req.body.html_url || `https://github.com/${req.user.username}/${name}`,
      language: req.body.language || 'Unknown',
      open_issues_count: req.body.open_issues_count || 0,
      stargazers_count: req.body.stargazers_count || 0,
      forks_count: req.body.forks_count || 0
    };

    console.log(`📝 Registering repository in local listing:`, {
      repoId: repoMetadata.repoId,
      name: repoMetadata.name,
      owner: req.user.username
    });

    // Local metadata ID (no Lighthouse/IPFS dependency)
    const localCid = `local-repo-${repoMetadata.repoId}-${Date.now()}`;
    bountyService.setRepoMetadata(localCid, repoMetadata);
    console.log(`✅ Stored repository metadata locally with ID: ${localCid}`);

    // Register repository in local service
    const registrationData = {
      repoId: repoMetadata.repoId,
      cid: localCid,
      isPublic: true,
      issueIds: [] // Will be populated when issues are added
    };

    const registrationResult = await bountyService.registerRepository(registrationData);

    if (registrationResult.success) {
      console.log(`🎉 Repository listed successfully:`, {
        repoId: registrationResult.data.repoId,
        transactionHash: registrationResult.data.transactionHash,
        cid: registrationResult.data.cid
      });

      res.json({
        success: true,
        repo: repoMetadata,
        registration: registrationResult.data,
        storage: {
          cid: localCid,
          type: 'local-memory'
        },
        message: 'Repository listed successfully'
      });
    } else {
      console.error('❌ Repository listing failed:', registrationResult.error);
      
      // Even if listing fails, metadata is kept locally
      res.json({
        success: true,
        repo: repoMetadata,
        storage: {
          cid: localCid,
          type: 'local-memory'
        },
        registration: {
          error: registrationResult.error,
          message: registrationResult.message
        },
        message: 'Repository metadata stored locally. Listing can be retried.',
        warning: 'Repository listing failed - repository may not appear in listings until registration succeeds'
      });
    }

  } catch (error) {
    console.error('Create repository listing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create repository listing',
      error: error.message
    });
  }
});

// Create bounty for repository issue
router.post('/:repoId/issues/:issueId/bounty', requireAuth, async (req, res) => {
  try {
    const { repoId, issueId } = req.params;
    const { amount, description, deadline, requirements, issueUrl, title } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid bounty amount is required'
      });
    }

    // Check if user is admin first
    const userIsAdmin = isAdmin(req.user);
    
    console.log(`� Creating bounty for user ${req.user.username} on repo ${repoId} (skipping ownership validation)`);

    // Create bounty metadata for storing in Filecoin
    const bountyData = {
      repoId: parseInt(repoId),
      issueId: parseInt(issueId),
      amount: parseFloat(amount),
      title: title || `Issue #${issueId}`,
      issueUrl: issueUrl || null,
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

    // Always use admin override to bypass all ownership checks
    console.log(`✅ User ${req.user.username} creating bounty with admin override (ownership validation skipped)`);
    const result = await bountyService.createBounty(bountyData);
    
    if (result.success) {
      const responseMessage = result.data.bounty.adminCreated
        ? (userIsAdmin
          ? 'Bounty created by admin successfully'
          : 'Bounty created with admin assistance successfully')
        : 'Bounty created successfully';
        
      res.json({
        success: true,
        bounty: result.data.bounty,
        metadataCID: result.data.metadataCID,
        ipfsUrl: result.data.ipfsUrl,
        assignTransactionHash: result.data.assignTransactionHash,
        fundTransactionHash: result.data.fundTransactionHash,
        adminCreated: result.data.bounty.adminCreated,
        userIsAdmin: userIsAdmin,
        githubRepoId: result.data.bounty.githubRepoId,
        blockchainRepoId: result.data.bounty.blockchainRepoId,
        message: responseMessage
      });
    } else {
      console.error('Bounty creation failed:', {
        githubRepoId: repoId,
        issueId,
        amount,
        error: result.error,
        message: result.message,
        user: req.user.username
      });
      
      // Provide helpful error messages for common issues
      let userFriendlyMessage = result.message;
      if (result.error && result.error.includes('not found')) {
        userFriendlyMessage = `Repository not found. Please make sure the repository is listed first. ${result.error}`;
      } else if (result.error && result.error.includes('Insufficient funds')) {
        userFriendlyMessage = `Insufficient funds in project pool. Please donate to the project first. ${result.error}`;
      } else if (result.error && result.error.includes('Not repo owner')) {
        userFriendlyMessage = 'You are not the owner of this repository. Only repository owners can create bounties.';
      }
      
      res.status(500).json({
        success: false,
        message: userFriendlyMessage,
        error: result.error,
        githubRepoId: repoId,
        debugInfo: result.availableRepos ? `Available repositories: ${JSON.stringify(result.availableRepos)}` : undefined
      });
    }
  } catch (error) {
    console.error('Create bounty error:', {
      repoId: req.params.repoId,
      issueId: req.params.issueId,
      amount: req.body.amount,
      user: req.user?.username,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: 'Failed to create bounty',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
    const { contributorAddress } = req.body;

    const forcePayoutWallet = String(process.env.FORCE_PAYOUT_WALLET || 'false') === 'true';
    const envPayoutWallet = resolvePayoutAddress();
    const payoutAddress = forcePayoutWallet && envPayoutWallet
      ? envPayoutWallet
      : contributorAddress;

    if (!payoutAddress) {
      return res.status(400).json({
        success: false,
        message: forcePayoutWallet
          ? 'PAYOUT_WALLET_ADDRESS must be set in backend/.env when FORCE_PAYOUT_WALLET=true'
          : 'Contributor address is required'
      });
    }

    const result = await bountyService.completeBounty(
      repoId,
      issueId,
      payoutAddress
    );

    if (result.success) {
      res.json({
        success: true,
        bounty: result.data.bounty,
        transactionHash: result.data.transactionHash,
        contributorAddress: payoutAddress,
        payoutSource: forcePayoutWallet ? 'env:PAYOUT_WALLET_ADDRESS' : 'request:contributorAddress',
        message: 'Bounty completed successfully'
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

// Get repository bounties
router.get('/:repoId/bounties', optionalAuth, async (req, res) => {
  try {
    const { repoId } = req.params;
    
    // Validate repoId is a number
    if (!repoId || isNaN(parseInt(repoId))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid repository ID'
      });
    }
    
    // Get repository bounties and pool information
    const result = await bountyService.getRepositoryBounties(parseInt(repoId));
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get repository bounties error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve repository bounties'
    });
  }
});

// Register repository
router.post('/:repoId/register', requireAuth, async (req, res) => {
  try {
    const { repoId } = req.params;
    const { cid, isPublic, issueIds } = req.body;
    
    // Validate input
    if (!repoId || isNaN(parseInt(repoId))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid repository ID'
      });
    }

    if (!cid) {
      return res.status(400).json({
        success: false,
        message: 'Repository metadata ID is required'
      });
    }
    
    // Register repository
    const result = await bountyService.registerRepository({
      repoId: parseInt(repoId),
      cid,
      isPublic: isPublic || true,
      issueIds: issueIds || []
    });
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Register repository error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register repository'
    });
  }
});

// Donate to project pool
router.post('/:repoId/donate', requireAuth, async (req, res) => {
  try {
    const { repoId } = req.params;
    const { amount } = req.body;
    
    // Validate input
    if (!repoId || isNaN(parseInt(repoId))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid repository ID'
      });
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }
    
    // Donate to project pool
    const result = await bountyService.donateToProject(parseInt(repoId), parseFloat(amount));
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Donate to project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to donate to project'
    });
  }
});

// Get repository issues
router.get('/github/:owner/:repo/issues', requireAuth, async (req, res) => {
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
