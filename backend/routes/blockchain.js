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
    
    const repoCount = await contract.repoCount();
    const repos = [];
    
    for (let i = 1; i <= repoCount; i++) {
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
      data: repos
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
      signer = new ethers.Wallet(privateKey, provider);
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