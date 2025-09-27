import express from 'express';
import { ethers } from 'ethers';
import { 
  getProvider, 
  getRepoRegistryContract, 
  getBountyEscrowContract,
  getSigner 
} from '../config/blockchain.js';

const router = express.Router();

// GET /api/blockchain/repos - Get all repositories
router.get('/repos', async (req, res) => {
  try {
    const provider = getProvider();
    const contract = getRepoRegistryContract(provider);
    
    // First check if contract exists and has the repoCount function
    const repoCount = await contract.repoCount();
    const totalRepos = Number(repoCount);
    
    console.log(`Total repos found: ${totalRepos}`);
    
    const repos = [];
    
    // Only fetch repos if count > 0
    for (let i = 1; i <= totalRepos; i++) {
      try {
        const [cid, owner, isPublic, issueIds] = await contract.getRepo(i);
        repos.push({
          id: i,
          cid,
          owner,
          isPublic,
          issueIds: issueIds.map(id => Number(id))
        });
      } catch (error) {
        console.error(`Error fetching repo ${i}:`, error);
      }
    }
    
    res.json({
      success: true,
      data: repos,
      total: totalRepos,
      message: totalRepos === 0 ? 'No repositories registered yet' : `Found ${totalRepos} repositories`
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

// GET /api/blockchain/repos/:id - Get specific repository
router.get('/repos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const provider = getProvider();
    const contract = getRepoRegistryContract(provider);
    
    const [cid, owner, isPublic, issueIds] = await contract.getRepo(id);
    
    res.json({
      success: true,
      data: {
        id: parseInt(id),
        cid,
        owner,
        isPublic,
        issueIds: issueIds.map(id => Number(id))
      }
    });
  } catch (error) {
    console.error('Error fetching repo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch repository',
      error: error.message
    });
  }
});

// POST /api/blockchain/repos - Register new repository
router.post('/repos', async (req, res) => {
  try {
    const { cid, isPublic, issueIds, privateKey } = req.body;
    
    if (!cid || typeof isPublic !== 'boolean' || !Array.isArray(issueIds)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: cid, isPublic, issueIds'
      });
    }
    
    const provider = getProvider();
    let signer;
    
    if (privateKey) {
      // Format and validate the private key from request
      const cleanedKey = privateKey.trim();
      const formattedKey = cleanedKey.startsWith('0x') ? cleanedKey : `0x${cleanedKey}`;
      
      if (formattedKey.length !== 66 || !/^0x[0-9a-fA-F]{64}$/.test(formattedKey)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid private key format. Expected 64 hex characters (with or without 0x prefix)'
        });
      }
      
      signer = new ethers.Wallet(formattedKey, provider);
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
        gasUsed: receipt.gasUsed.toString()
      }
    });
  } catch (error) {
    console.error('Error registering repo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register repository',
      error: error.message
    });
  }
});

// GET /api/blockchain/issues/:issueId/bounty - Get bounty for specific issue
router.get('/issues/:issueId/bounty', async (req, res) => {
  try {
    const { issueId } = req.params;
    const provider = getProvider();
    const contract = getRepoRegistryContract(provider);
    
    const bounty = await contract.getIssueBounty(issueId);
    
    res.json({
      success: true,
      data: {
        issueId: parseInt(issueId),
        bounty: ethers.formatEther(bounty),
        bountyWei: bounty.toString()
      }
    });
  } catch (error) {
    console.error('Error fetching issue bounty:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch issue bounty',
      error: error.message
    });
  }
});

// POST /api/blockchain/repos/:repoId/issues/:issueId/bounty - Assign bounty to issue
router.post('/repos/:repoId/issues/:issueId/bounty', async (req, res) => {
  try {
    const { repoId, issueId } = req.params;
    const { bounty, privateKey } = req.body;
    
    if (!bounty) {
      return res.status(400).json({
        success: false,
        message: 'Bounty amount is required'
      });
    }
    
    const provider = getProvider();
    let signer;
    
    if (privateKey) {
      signer = new ethers.Wallet(privateKey, provider);
    } else {
      signer = getSigner();
    }
    
    const contract = getRepoRegistryContract(signer);
    const bountyWei = ethers.parseEther(bounty.toString());
    
    const tx = await contract.assignBounty(repoId, issueId, bountyWei);
    const receipt = await tx.wait();
    
    res.json({
      success: true,
      data: {
        transactionHash: tx.hash,
        repoId: parseInt(repoId),
        issueId: parseInt(issueId),
        bounty: bounty.toString(),
        gasUsed: receipt.gasUsed.toString()
      }
    });
  } catch (error) {
    console.error('Error assigning bounty:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign bounty',
      error: error.message
    });
  }
});

export default router;