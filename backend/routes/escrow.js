import express from 'express';
import { ethers } from 'ethers';
import { 
  getProvider, 
  getBountyEscrowContract,
  getSigner 
} from '../config/blockchain.js';

const router = express.Router();

// GET /api/escrow/projects/:repoId/pool - Get project pool balance
router.get('/projects/:repoId/pool', async (req, res) => {
  try {
    const { repoId } = req.params;
    const provider = getProvider();
    const contract = getBountyEscrowContract(provider);
    
    const poolBalance = await contract.getProjectPool(repoId);
    
    res.json({
      success: true,
      data: {
        repoId: parseInt(repoId),
        balance: ethers.formatEther(poolBalance),
        balanceWei: poolBalance.toString()
      }
    });
  } catch (error) {
    console.error('Error fetching project pool:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project pool balance',
      error: error.message
    });
  }
});

// POST /api/escrow/projects/:repoId/donate - Donate to project pool
router.post('/projects/:repoId/donate', async (req, res) => {
  try {
    const { repoId } = req.params;
    const { amount, privateKey } = req.body;
    
    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'Donation amount is required'
      });
    }
    
    const provider = getProvider();
    let signer;
    
    if (privateKey) {
      signer = new ethers.Wallet(privateKey, provider);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Private key is required for donations'
      });
    }
    
    const contract = getBountyEscrowContract(signer);
    const amountWei = ethers.parseEther(amount.toString());
    
    const tx = await contract.donateToProject(repoId, { value: amountWei });
    const receipt = await tx.wait();
    
    res.json({
      success: true,
      data: {
        transactionHash: tx.hash,
        repoId: parseInt(repoId),
        amount: amount.toString(),
        donor: signer.address,
        gasUsed: receipt.gasUsed.toString()
      }
    });
  } catch (error) {
    console.error('Error donating to project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to donate to project',
      error: error.message
    });
  }
});

// GET /api/escrow/projects/:repoId/issues/:issueId/bounty - Get issue bounty details
router.get('/projects/:repoId/issues/:issueId/bounty', async (req, res) => {
  try {
    const { repoId, issueId } = req.params;
    const provider = getProvider();
    const contract = getBountyEscrowContract(provider);
    
    const [amount, paid] = await contract.getBounty(repoId, issueId);
    
    res.json({
      success: true,
      data: {
        repoId: parseInt(repoId),
        issueId: parseInt(issueId),
        amount: ethers.formatEther(amount),
        amountWei: amount.toString(),
        paid
      }
    });
  } catch (error) {
    console.error('Error fetching bounty details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bounty details',
      error: error.message
    });
  }
});

// POST /api/escrow/projects/:repoId/issues/:issueId/fund - Fund issue bounty from project pool
router.post('/projects/:repoId/issues/:issueId/fund', async (req, res) => {
  try {
    const { repoId, issueId } = req.params;
    const { amount, privateKey } = req.body;
    
    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'Funding amount is required'
      });
    }
    
    const provider = getProvider();
    let signer;
    
    if (privateKey) {
      signer = new ethers.Wallet(privateKey, provider);
    } else {
      signer = getSigner();
    }
    
    const contract = getBountyEscrowContract(signer);
    const amountWei = ethers.parseEther(amount.toString());
    
    const tx = await contract.fundBountyFromPool(repoId, issueId, amountWei);
    const receipt = await tx.wait();
    
    res.json({
      success: true,
      data: {
        transactionHash: tx.hash,
        repoId: parseInt(repoId),
        issueId: parseInt(issueId),
        amount: amount.toString(),
        gasUsed: receipt.gasUsed.toString()
      }
    });
  } catch (error) {
    console.error('Error funding bounty:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fund bounty',
      error: error.message
    });
  }
});

// POST /api/escrow/projects/:repoId/issues/:issueId/release - Release bounty to solver
router.post('/projects/:repoId/issues/:issueId/release', async (req, res) => {
  try {
    const { repoId, issueId } = req.params;
    const { solverAddress, contributorAddress, privateKey } = req.body;
    
    // Accept either solverAddress or contributorAddress
    const recipientAddress = solverAddress || contributorAddress;
    
    if (!recipientAddress) {
      return res.status(400).json({
        success: false,
        message: 'Solver address (solverAddress or contributorAddress) is required'
      });
    }
    
    if (!ethers.isAddress(recipientAddress)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid solver address format'
      });
    }
    
    const provider = getProvider();
    let signer;
    
    if (privateKey) {
      signer = new ethers.Wallet(privateKey, provider);
    } else {
      signer = getSigner();
    }
    
    const contract = getBountyEscrowContract(signer);
    
    const tx = await contract.releaseBounty(repoId, issueId, recipientAddress);
    const receipt = await tx.wait();
    
    // Extract amount from event
    const event = receipt.logs.find(log => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed.name === 'BountyReleased';
      } catch {
        return false;
      }
    });
    
    let amount = null;
    if (event) {
      const parsed = contract.interface.parseLog(event);
      amount = ethers.formatEther(parsed.args.amount);
    }
    
    res.json({
      success: true,
      data: {
        transactionHash: tx.hash,
        repoId: parseInt(repoId),
        issueId: parseInt(issueId),
        solver: recipientAddress,
        amount,
        gasUsed: receipt.gasUsed.toString()
      }
    });
  } catch (error) {
    console.error('Error releasing bounty:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to release bounty',
      error: error.message
    });
  }
});

// GET /api/escrow/owner - Get contract owner
router.get('/owner', async (req, res) => {
  try {
    const provider = getProvider();
    const contract = getBountyEscrowContract(provider);
    
    const owner = await contract.owner();
    
    res.json({
      success: true,
      data: {
        owner
      }
    });
  } catch (error) {
    console.error('Error fetching owner:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contract owner',
      error: error.message
    });
  }
});

export default router;