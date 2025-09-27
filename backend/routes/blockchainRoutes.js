import express from 'express';
import { ethers } from 'ethers';
import { 
  getProvider, 
  getRepoRegistryContract,
  getBountyEscrowContract,
  CONTRACT_ADDRESSES 
} from '../config/blockchain.js';

const router = express.Router();

// GET /api/blockchain-frontend/contract-info - Get contract addresses and ABIs for frontend
router.get('/contract-info', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        addresses: CONTRACT_ADDRESSES,
        network: {
          name: 'Filecoin Calibration Testnet',
          chainId: 314159,
          rpcUrl: process.env.RPC_URL
        },
        abis: {
          repoRegistry: [
            "event RepoRegistered(uint256 repoId, string cid, address owner, bool isPublic)",
            "function repoCount() view returns (uint256)",
            "function getRepo(uint256 _repoId) view returns (string, address, bool, uint256[])",
            "function registerRepo(string memory _cid, bool _isPublic, uint256[] memory _issueIds)"
          ],
          bountyEscrow: [
            "event BountyFunded(uint256 repoId, uint256 issueId, address funder, uint256 amount)",
            "function getIssueBounty(uint256 _issueId) view returns (uint256)",
            "function fundBounty(uint256 _repoId, uint256 _issueId) payable",
            "function releaseBounty(uint256 _issueId, address _contributor)"
          ]
        }
      }
    });
  } catch (error) {
    console.error('Error fetching contract info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contract information',
      error: error.message
    });
  }
});

// POST /api/blockchain-frontend/verify-transaction - Verify a transaction was successful
router.post('/verify-transaction', async (req, res) => {
  try {
    const { txHash, expectedEvent } = req.body;
    
    if (!txHash) {
      return res.status(400).json({
        success: false,
        message: 'Transaction hash is required'
      });
    }
    
    const provider = getProvider();
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found or still pending'
      });
    }
    
    res.json({
      success: true,
      data: {
        txHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed',
        logs: receipt.logs.length
      }
    });
  } catch (error) {
    console.error('Error verifying transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify transaction',
      error: error.message
    });
  }
});

// GET /api/blockchain-frontend/repos - Get all repositories (read-only, no private key needed)
router.get('/repos', async (req, res) => {
  try {
    const provider = getProvider();
    const contract = getRepoRegistryContract(provider);
    
    const repoCount = await contract.repoCount();
    const totalRepos = Number(repoCount);
    
    const repos = [];
    
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
    console.error('Error fetching repositories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch repositories',
      error: error.message
    });
  }
});

// GET /api/blockchain-frontend/address-from-key - Get address from private key (for testing)
router.post('/address-from-key', async (req, res) => {
  try {
    const { privateKey } = req.body;
    
    if (!privateKey) {
      return res.status(400).json({
        success: false,
        message: 'Private key is required'
      });
    }
    
    // Format and validate the private key
    const cleanedKey = privateKey.trim();
    const formattedKey = cleanedKey.startsWith('0x') ? cleanedKey : `0x${cleanedKey}`;
    
    if (formattedKey.length !== 66 || !/^0x[0-9a-fA-F]{64}$/.test(formattedKey)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid private key format. Expected 64 hex characters (with or without 0x prefix)'
      });
    }
    
    const wallet = new ethers.Wallet(formattedKey);
    
    res.json({
      success: true,
      data: {
        address: wallet.address,
        privateKeyValid: true
      }
    });
  } catch (error) {
    console.error('Error getting address from private key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get address from private key',
      error: error.message
    });
  }
});

export default router;