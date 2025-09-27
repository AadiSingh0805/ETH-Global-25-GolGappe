import express from 'express';
import { ethers } from 'ethers';
import { 
  getAllReposWithBounties, 
  getRepoStatistics,
  estimateGas,
  getEventsInRange
} from '../utils/blockchain.js';
import { getProvider, getSigner } from '../config/blockchain.js';

const router = express.Router();

// GET /api/analytics/repos - Get all repos with complete bounty information
router.get('/repos', async (req, res) => {
  try {
    const repos = await getAllReposWithBounties();
    
    res.json({
      success: true,
      data: repos
    });
  } catch (error) {
    console.error('Error fetching repos with bounties:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch repositories with bounty information',
      error: error.message
    });
  }
});

// GET /api/analytics/repos/:repoId/statistics - Get detailed repo statistics
router.get('/repos/:repoId/statistics', async (req, res) => {
  try {
    const { repoId } = req.params;
    const statistics = await getRepoStatistics(repoId);
    
    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Error fetching repo statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch repository statistics',
      error: error.message
    });
  }
});

// GET /api/analytics/events - Get blockchain events in a range
router.get('/events', async (req, res) => {
  try {
    const { 
      fromBlock = 'earliest', 
      toBlock = 'latest' 
    } = req.query;
    
    const events = await getEventsInRange(fromBlock, toBlock);
    
    // Format events for better readability
    const formattedEvents = {
      repoRegistered: events.repoRegistered.map(event => ({
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        repoId: Number(event.args.repoId),
        cid: event.args.cid,
        owner: event.args.owner,
        isPublic: event.args.isPublic
      })),
      bountyAssigned: events.bountyAssigned.map(event => ({
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        repoId: Number(event.args.repoId),
        issueId: Number(event.args.issueId),
        bounty: event.args.bounty.toString()
      })),
      projectDonated: events.projectDonated.map(event => ({
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        repoId: Number(event.args.repoId),
        amount: event.args.amount.toString(),
        donor: event.args.donor
      })),
      bountyFunded: events.bountyFunded.map(event => ({
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        repoId: Number(event.args.repoId),
        issueId: Number(event.args.issueId),
        amount: event.args.amount.toString()
      })),
      bountyReleased: events.bountyReleased.map(event => ({
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        repoId: Number(event.args.repoId),
        issueId: Number(event.args.issueId),
        solver: event.args.solver,
        amount: event.args.amount.toString()
      }))
    };
    
    res.json({
      success: true,
      data: formattedEvents
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blockchain events',
      error: error.message
    });
  }
});

// POST /api/analytics/gas-estimate - Estimate gas for operations
router.post('/gas-estimate', async (req, res) => {
  try {
    const { operation, params, privateKey } = req.body;
    
    if (!operation || !params) {
      return res.status(400).json({
        success: false,
        message: 'Operation and params are required'
      });
    }
    
    const provider = getProvider();
    let signer;
    
    if (privateKey) {
      signer = new ethers.Wallet(privateKey, provider);
    } else {
      signer = getSigner();
    }
    
    let gasEstimate;
    
    switch (operation) {
      case 'registerRepo':
        gasEstimate = await estimateGas.registerRepo(
          params.cid, 
          params.isPublic, 
          params.issueIds, 
          signer
        );
        break;
        
      case 'assignBounty':
        gasEstimate = await estimateGas.assignBounty(
          params.repoId, 
          params.issueId, 
          params.bountyWei, 
          signer
        );
        break;
        
      case 'donateToProject':
        gasEstimate = await estimateGas.donateToProject(
          params.repoId, 
          params.amountWei, 
          signer
        );
        break;
        
      case 'fundBountyFromPool':
        gasEstimate = await estimateGas.fundBountyFromPool(
          params.repoId, 
          params.issueId, 
          params.amountWei, 
          signer
        );
        break;
        
      case 'releaseBounty':
        gasEstimate = await estimateGas.releaseBounty(
          params.repoId, 
          params.issueId, 
          params.solverAddress, 
          signer
        );
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid operation type'
        });
    }
    
    res.json({
      success: true,
      data: {
        operation,
        gasEstimate: gasEstimate.toString(),
        gasEstimateFormatted: Number(gasEstimate).toLocaleString()
      }
    });
  } catch (error) {
    console.error('Error estimating gas:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to estimate gas',
      error: error.message
    });
  }
});

// GET /api/analytics/network-info - Get blockchain network information
router.get('/network-info', async (req, res) => {
  try {
    const provider = getProvider();
    
    const [network, blockNumber, gasPrice] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber(),
      provider.getFeeData()
    ]);
    
    res.json({
      success: true,
      data: {
        chainId: Number(network.chainId),
        name: network.name,
        currentBlockNumber: blockNumber,
        gasPrice: gasPrice.gasPrice?.toString(),
        maxFeePerGas: gasPrice.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas?.toString()
      }
    });
  } catch (error) {
    console.error('Error fetching network info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch network information',
      error: error.message
    });
  }
});

export default router;