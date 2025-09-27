import express from 'express';
import { ethers } from 'ethers';
import { 
  getProvider, 
  getRepoRegistryContract, 
  getBountyEscrowContract,
  getSigner 
} from '../config/blockchain.js';
import GitHubService from '../services/githubService.js';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Middleware to get GitHub service
const getGitHubService = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const user = await User.findById(userId);
    if (!user || !user.github?.accessToken) {
      return res.status(401).json({
        success: false,
        message: 'GitHub authentication required'
      });
    }

    req.githubService = new GitHubService(user.github.accessToken);
    req.user = user;
    next();
  } catch (error) {
    console.error('Error setting up GitHub service:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to setup GitHub service',
      error: error.message
    });
  }
};

// GET /api/github/repos - Get user's GitHub repositories with blockchain data
router.get('/repos', requireAuth, getGitHubService, async (req, res) => {
  try {
    const { type = 'owner', sort = 'updated', per_page = 50 } = req.query;
    
    // Get repos from GitHub
    const githubRepos = await req.githubService.getUserRepos({
      type,
      sort,
      per_page
    });

    // Get blockchain data
    const provider = getProvider();
    const repoContract = getRepoRegistryContract(provider);
    const escrowContract = getBountyEscrowContract(provider);
    
    const repoCount = await repoContract.repoCount();
    
    // Create a map of GitHub repo IDs to blockchain data
    const blockchainRepoMap = new Map();
    
    for (let i = 1; i <= repoCount; i++) {
      try {
        const [cid, owner, isPublic, issueIds] = await repoContract.getRepo(i);
        
        // Try to extract GitHub repo info from CID metadata (if stored)
        // For now, we'll match by owner address
        if (owner.toLowerCase() === req.user.wallet?.address?.toLowerCase()) {
          const poolBalance = await escrowContract.getProjectPool(i);
          
          blockchainRepoMap.set(i, {
            blockchainId: i,
            cid,
            owner,
            isPublic,
            issueIds: issueIds.map(id => Number(id)),
            poolBalance: ethers.formatEther(poolBalance)
          });
        }
      } catch (error) {
        console.error(`Error fetching blockchain repo ${i}:`, error);
      }
    }

    // Combine GitHub and blockchain data
    const enrichedRepos = githubRepos.map(repo => {
      // Find matching blockchain repo (you might want to store GitHub repo ID in blockchain)
      const blockchainData = Array.from(blockchainRepoMap.values()).find(
        blockchainRepo => blockchainRepo.owner.toLowerCase() === req.user.wallet?.address?.toLowerCase()
      );

      return {
        github: {
          id: repo.id,
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description,
          url: repo.html_url,
          clone_url: repo.clone_url,
          default_branch: repo.default_branch,
          created_at: repo.created_at,
          updated_at: repo.updated_at,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          language: repo.language,
          is_private: repo.private,
          has_issues: repo.has_issues
        },
        blockchain: blockchainData || null,
        isRegistered: !!blockchainData
      };
    });

    res.json({
      success: true,
      data: enrichedRepos
    });
  } catch (error) {
    console.error('Error fetching repos:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch repositories',
      error: error.message
    });
  }
});

// GET /api/github/repos/:owner/:repo - Get specific repository with issues and blockchain data
router.get('/repos/:owner/:repo', requireAuth, getGitHubService, async (req, res) => {
  try {
    const { owner, repo } = req.params;
    
    // Get detailed repo data from GitHub
    const repoData = await req.githubService.getRepoForBountyPlatform(owner, repo);
    
    // Get blockchain data for this repo
    const provider = getProvider();
    const repoContract = getRepoRegistryContract(provider);
    const escrowContract = getBountyEscrowContract(provider);
    
    let blockchainData = null;
    const repoCount = await repoContract.repoCount();
    
    // Find matching blockchain repo
    for (let i = 1; i <= repoCount; i++) {
      try {
        const [cid, repoOwner, isPublic, issueIds] = await repoContract.getRepo(i);
        
        // Match by owner and potentially by repo name in CID
        if (repoOwner.toLowerCase() === req.user.wallet?.address?.toLowerCase()) {
          const poolBalance = await escrowContract.getProjectPool(i);
          
          // Get bounty data for issues
          const issuesWithBounties = await Promise.all(
            issueIds.map(async (issueId) => {
              const metadataBounty = await repoContract.getIssueBounty(issueId);
              const [escrowAmount, paid] = await escrowContract.getBounty(i, issueId);
              
              return {
                issueId: Number(issueId),
                metadataBounty: ethers.formatEther(metadataBounty),
                escrowAmount: ethers.formatEther(escrowAmount),
                paid
              };
            })
          );
          
          blockchainData = {
            blockchainId: i,
            cid,
            owner: repoOwner,
            isPublic,
            poolBalance: ethers.formatEther(poolBalance),
            issuesWithBounties
          };
          break;
        }
      } catch (error) {
        console.error(`Error checking blockchain repo ${i}:`, error);
      }
    }

    // Enhance GitHub issues with bounty data
    const enhancedIssues = repoData.issues.map(issue => {
      const bountyData = blockchainData?.issuesWithBounties?.find(
        b => b.issueId === issue.number
      );
      
      return {
        ...issue,
        bounty: bountyData || {
          issueId: issue.number,
          metadataBounty: '0',
          escrowAmount: '0',
          paid: false
        }
      };
    });

    res.json({
      success: true,
      data: {
        repository: repoData.repository,
        issues: enhancedIssues,
        contributors: repoData.contributors,
        readme: repoData.readme,
        recent_commits: repoData.recent_commits,
        blockchain: blockchainData,
        isRegistered: !!blockchainData
      }
    });
  } catch (error) {
    console.error('Error fetching repository details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch repository details',
      error: error.message
    });
  }
});

// POST /api/github/repos/:owner/:repo/register - Register GitHub repo to blockchain
router.post('/repos/:owner/:repo/register', requireAuth, getGitHubService, async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { isPublic = true, selectedIssues = [], privateKey } = req.body;
    
    // Get repo data from GitHub first
    const githubRepo = await req.githubService.getRepo(owner, repo);
    const githubIssues = await req.githubService.getRepoIssues(owner, repo, { state: 'open' });
    
    // Filter actual issues (not PRs) and get selected ones
    const actualIssues = githubIssues.filter(issue => !issue.pull_request);
    const issueIds = selectedIssues.length > 0 
      ? selectedIssues 
      : actualIssues.slice(0, 10).map(issue => issue.number); // Default to first 10 issues
    
    // Create metadata CID (simplified - in production, upload to IPFS)
    const metadata = {
      github: {
        id: githubRepo.id,
        name: githubRepo.name,
        full_name: githubRepo.full_name,
        description: githubRepo.description,
        url: githubRepo.html_url,
        default_branch: githubRepo.default_branch
      },
      issues: actualIssues.filter(issue => issueIds.includes(issue.number)).map(issue => ({
        number: issue.number,
        title: issue.title,
        labels: issue.labels.map(label => label.name),
        created_at: issue.created_at
      })),
      registered_at: new Date().toISOString()
    };
    
    const cid = `github_${githubRepo.id}_${Date.now()}`; // Simplified CID
    
    // Register to blockchain
    const provider = getProvider();
    let signer;
    
    if (privateKey) {
      signer = new ethers.Wallet(privateKey, provider);
    } else if (req.user.wallet?.address) {
      // In production, user would sign this transaction with their wallet
      return res.status(400).json({
        success: false,
        message: 'Private key required for transaction signing'
      });
    } else {
      signer = getSigner();
    }
    
    const contract = getRepoRegistryContract(signer);
    const tx = await contract.registerRepo(cid, isPublic, issueIds);
    const receipt = await tx.wait();
    
    // Extract repo ID from event
    const event = receipt.logs.find(log => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed.name === 'RepoRegistered';
      } catch {
        return false;
      }
    });
    
    let repoId = null;
    if (event) {
      const parsed = contract.interface.parseLog(event);
      repoId = Number(parsed.args.repoId);
    }
    
    res.json({
      success: true,
      data: {
        transactionHash: tx.hash,
        repoId,
        cid,
        github: githubRepo,
        registeredIssues: issueIds,
        metadata,
        gasUsed: receipt.gasUsed.toString()
      }
    });
  } catch (error) {
    console.error('Error registering repository:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register repository',
      error: error.message
    });
  }
});

// GET /api/github/repos/:owner/:repo/issues/:issueNumber - Get specific issue with bounty data
router.get('/repos/:owner/:repo/issues/:issueNumber', requireAuth, getGitHubService, async (req, res) => {
  try {
    const { owner, repo, issueNumber } = req.params;
    
    // Get issue from GitHub
    const [githubIssue, comments] = await Promise.all([
      req.githubService.getIssue(owner, repo, issueNumber),
      req.githubService.getIssueComments(owner, repo, issueNumber)
    ]);
    
    // Get bounty data from blockchain
    const provider = getProvider();
    const repoContract = getRepoRegistryContract(provider);
    const escrowContract = getBountyEscrowContract(provider);
    
    let bountyData = {
      metadataBounty: '0',
      escrowAmount: '0',
      paid: false,
      repoId: null
    };
    
    // Find the repo in blockchain and get bounty data
    const repoCount = await repoContract.repoCount();
    for (let i = 1; i <= repoCount; i++) {
      try {
        const [cid, repoOwner, isPublic, issueIds] = await repoContract.getRepo(i);
        
        if (issueIds.map(id => Number(id)).includes(parseInt(issueNumber))) {
          const metadataBounty = await repoContract.getIssueBounty(issueNumber);
          const [escrowAmount, paid] = await escrowContract.getBounty(i, issueNumber);
          
          bountyData = {
            repoId: i,
            metadataBounty: ethers.formatEther(metadataBounty),
            escrowAmount: ethers.formatEther(escrowAmount),
            paid
          };
          break;
        }
      } catch (error) {
        console.error(`Error checking repo ${i} for issue ${issueNumber}:`, error);
      }
    }
    
    res.json({
      success: true,
      data: {
        issue: {
          ...githubIssue,
          comments_data: comments
        },
        bounty: bountyData
      }
    });
  } catch (error) {
    console.error('Error fetching issue details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch issue details',
      error: error.message
    });
  }
});

export default router;