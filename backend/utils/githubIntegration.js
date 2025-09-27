import { ethers } from 'ethers';
import GitHubService from '../services/githubService.js';
import { 
  getProvider, 
  getRepoRegistryContract, 
  getBountyEscrowContract 
} from '../config/blockchain.js';

/**
 * Utility functions for GitHub-Blockchain integration
 */

// Create IPFS-like CID for GitHub repository metadata
export const createRepoCID = (githubRepo, issues = []) => {
  const metadata = {
    platform: 'github',
    repository: {
      id: githubRepo.id,
      name: githubRepo.name,
      full_name: githubRepo.full_name,
      description: githubRepo.description,
      url: githubRepo.html_url,
      language: githubRepo.language,
      default_branch: githubRepo.default_branch,
      created_at: githubRepo.created_at,
      updated_at: githubRepo.updated_at
    },
    issues: issues.map(issue => ({
      number: issue.number,
      title: issue.title,
      state: issue.state,
      labels: issue.labels?.map(label => label.name) || [],
      created_at: issue.created_at
    })),
    registered_at: new Date().toISOString()
  };

  // Create a hash-like identifier (in production, this would be an actual IPFS CID)
  const metadataString = JSON.stringify(metadata);
  const hash = Buffer.from(metadataString).toString('base64').slice(0, 32);
  return `github_${githubRepo.id}_${hash}`;
};

// Parse CID to extract GitHub information
export const parseCID = (cid) => {
  try {
    if (cid.startsWith('github_')) {
      const parts = cid.split('_');
      return {
        platform: 'github',
        repositoryId: parseInt(parts[1]),
        hash: parts[2]
      };
    }
    return null;
  } catch (error) {
    console.error('Error parsing CID:', error);
    return null;
  }
};

// Find blockchain repo by GitHub repository
export const findBlockchainRepoByGitHub = async (githubRepoId, ownerAddress) => {
  try {
    const provider = getProvider();
    const contract = getRepoRegistryContract(provider);
    
    const repoCount = await contract.repoCount();
    
    for (let i = 1; i <= repoCount; i++) {
      const [cid, owner, isPublic, issueIds] = await contract.getRepo(i);
      
      // Check if owner matches and CID contains GitHub repo ID
      if (owner.toLowerCase() === ownerAddress.toLowerCase()) {
        const cidInfo = parseCID(cid);
        if (cidInfo && cidInfo.repositoryId === githubRepoId) {
          return {
            blockchainId: i,
            cid,
            owner,
            isPublic,
            issueIds: issueIds.map(id => Number(id))
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding blockchain repo:', error);
    return null;
  }
};

// Get comprehensive repository data (GitHub + Blockchain)
export const getComprehensiveRepoData = async (owner, repo, accessToken, walletAddress) => {
  try {
    const githubService = new GitHubService(accessToken);
    
    // Get GitHub data
    const githubData = await githubService.getRepoForBountyPlatform(owner, repo);
    
    // Find corresponding blockchain data
    const blockchainRepo = await findBlockchainRepoByGitHub(
      githubData.repository.id, 
      walletAddress
    );
    
    let blockchainData = null;
    
    if (blockchainRepo) {
      const provider = getProvider();
      const escrowContract = getBountyEscrowContract(provider);
      const repoContract = getRepoRegistryContract(provider);
      
      // Get pool balance
      const poolBalance = await escrowContract.getProjectPool(blockchainRepo.blockchainId);
      
      // Get bounty data for each issue
      const issuesWithBounties = await Promise.all(
        blockchainRepo.issueIds.map(async (issueId) => {
          const metadataBounty = await repoContract.getIssueBounty(issueId);
          const [escrowAmount, paid] = await escrowContract.getBounty(
            blockchainRepo.blockchainId, 
            issueId
          );
          
          return {
            issueId,
            metadataBounty: ethers.formatEther(metadataBounty),
            escrowAmount: ethers.formatEther(escrowAmount),
            paid
          };
        })
      );
      
      blockchainData = {
        ...blockchainRepo,
        poolBalance: ethers.formatEther(poolBalance),
        issuesWithBounties
      };
    }
    
    // Enhance GitHub issues with bounty data
    const enhancedIssues = githubData.issues.map(issue => {
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
    
    return {
      github: githubData,
      blockchain: blockchainData,
      isRegistered: !!blockchainData,
      enhancedIssues
    };
  } catch (error) {
    console.error('Error getting comprehensive repo data:', error);
    throw error;
  }
};

// Sync GitHub issues with blockchain bounties
export const syncGitHubIssuesWithBounties = async (blockchainRepoId, githubService, owner, repo) => {
  try {
    const provider = getProvider();
    const repoContract = getRepoRegistryContract(provider);
    
    // Get current blockchain issues
    const [, , , issueIds] = await repoContract.getRepo(blockchainRepoId);
    const blockchainIssueIds = issueIds.map(id => Number(id));
    
    // Get current GitHub issues
    const githubIssues = await githubService.getRepoIssues(owner, repo, { state: 'open' });
    const actualIssues = githubIssues.filter(issue => !issue.pull_request);
    const githubIssueIds = actualIssues.map(issue => issue.number);
    
    // Find discrepancies
    const newIssues = githubIssueIds.filter(id => !blockchainIssueIds.includes(id));
    const closedIssues = blockchainIssueIds.filter(id => !githubIssueIds.includes(id));
    
    return {
      blockchainIssueIds,
      githubIssueIds,
      newIssues,
      closedIssues,
      inSync: newIssues.length === 0 && closedIssues.length === 0
    };
  } catch (error) {
    console.error('Error syncing GitHub issues with bounties:', error);
    throw error;
  }
};

// Get bounty leaderboard for a repository
export const getRepoLeaderboard = async (blockchainRepoId, githubService, owner, repo) => {
  try {
    const provider = getProvider();
    const escrowContract = getBountyEscrowContract(provider);
    const repoContract = getRepoRegistryContract(provider);
    
    // Get repo info
    const [, , , issueIds] = await repoContract.getRepo(blockchainRepoId);
    
    // Get GitHub contributors
    const contributors = await githubService.getRepoContributors(owner, repo);
    
    // Get bounty data and calculate earnings
    const contributorEarnings = new Map();
    
    for (const issueId of issueIds) {
      const [amount, paid] = await escrowContract.getBounty(blockchainRepoId, issueId);
      
      if (paid && amount > 0) {
        // In a real implementation, you'd track who solved each issue
        // For now, we'll distribute among top contributors
        const topContributor = contributors[0];
        if (topContributor) {
          const current = contributorEarnings.get(topContributor.login) || {
            contributor: topContributor,
            totalEarned: 0n,
            issuesSolved: 0
          };
          
          current.totalEarned += amount;
          current.issuesSolved += 1;
          contributorEarnings.set(topContributor.login, current);
        }
      }
    }
    
    // Convert to array and sort by earnings
    const leaderboard = Array.from(contributorEarnings.values())
      .map(entry => ({
        ...entry,
        totalEarnedFormatted: ethers.formatEther(entry.totalEarned)
      }))
      .sort((a, b) => (b.totalEarned > a.totalEarned ? 1 : -1));
    
    return leaderboard;
  } catch (error) {
    console.error('Error getting repo leaderboard:', error);
    throw error;
  }
};

// Validate GitHub webhook signature (for real-time sync)
export const validateGitHubWebhook = (payload, signature, secret) => {
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload, 'utf8');
  const calculatedSignature = `sha256=${hmac.digest('hex')}`;
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'utf8'),
    Buffer.from(calculatedSignature, 'utf8')
  );
};

// Process GitHub webhook events
export const processGitHubWebhook = async (event, payload) => {
  try {
    switch (event) {
      case 'issues':
        if (payload.action === 'opened') {
          // New issue created - could auto-create bounty entry
          console.log(`New issue created: ${payload.issue.number}`);
        } else if (payload.action === 'closed') {
          // Issue closed - could trigger bounty release
          console.log(`Issue closed: ${payload.issue.number}`);
        }
        break;
        
      case 'pull_request':
        if (payload.action === 'closed' && payload.pull_request.merged) {
          // PR merged - could trigger bounty release if it closes an issue
          console.log(`PR merged: ${payload.pull_request.number}`);
        }
        break;
        
      case 'repository':
        if (payload.action === 'deleted') {
          // Repository deleted - should handle cleanup
          console.log(`Repository deleted: ${payload.repository.full_name}`);
        }
        break;
        
      default:
        console.log(`Unhandled webhook event: ${event}`);
    }
  } catch (error) {
    console.error('Error processing GitHub webhook:', error);
    throw error;
  }
};