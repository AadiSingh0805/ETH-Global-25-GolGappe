import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

// Contract addresses
export const CONTRACT_ADDRESSES = {
  REPO_REGISTRY: '0xE865690eCAc3547dA4e87e648F7Fbb10778C6050',
  BOUNTY_ESCROW: '0x3bf06982df5959b3Bf26bA62B46069c42FA002e0'
};

// Contract ABIs
export const REPO_REGISTRY_ABI = [
  // Events
  "event RepoRegistered(uint256 repoId, string cid, address owner, bool isPublic)",
  "event BountyAssigned(uint256 repoId, uint256 issueId, uint256 bounty)",
  
  // Read functions
  "function repoCount() view returns (uint256)",
  "function repos(uint256) view returns (string cid, address owner, bool isPublic, uint256[] issueIds)",
  "function issueBounties(uint256) view returns (uint256 bounty)",
  "function getRepo(uint256 _repoId) view returns (string, address, bool, uint256[])",
  "function getIssueBounty(uint256 _issueId) view returns (uint256)",
  
  // Write functions  
  "function registerRepo(string memory _cid, bool _isPublic, uint256[] memory _issueIds)",
  "function assignBounty(uint256 _repoId, uint256 _issueId, uint256 _bounty)"
];

export const BOUNTY_ESCROW_ABI = [
  // Events
  "event ProjectDonated(uint256 repoId, uint256 amount, address donor)",
  "event BountyFunded(uint256 repoId, uint256 issueId, uint256 amount)",
  "event BountyReleased(uint256 repoId, uint256 issueId, address solver, uint256 amount)",
  
  // Read functions
  "function bounties(uint256, uint256) view returns (uint256 amount, bool paid)",
  "function projectPools(uint256) view returns (uint256)",
  "function owner() view returns (address)",
  "function getBounty(uint256 _repoId, uint256 _issueId) view returns (uint256 amount, bool paid)",
  "function getProjectPool(uint256 _repoId) view returns (uint256)",
  
  // Write functions
  "function donateToProject(uint256 _repoId) payable",
  "function fundBountyFromPool(uint256 _repoId, uint256 _issueId, uint256 _amount)",
  "function releaseBounty(uint256 _repoId, uint256 _issueId, address _solver)"
];

// Setup provider
export const getProvider = () => {
  const rpcUrl = process.env.RPC_URL || 'http://localhost:8545';
  return new ethers.JsonRpcProvider(rpcUrl);
};

// Get contract instances
export const getRepoRegistryContract = (signerOrProvider) => {
  return new ethers.Contract(
    CONTRACT_ADDRESSES.REPO_REGISTRY,
    REPO_REGISTRY_ABI,
    signerOrProvider
  );
};

export const getBountyEscrowContract = (signerOrProvider) => {
  return new ethers.Contract(
    CONTRACT_ADDRESSES.BOUNTY_ESCROW,
    BOUNTY_ESCROW_ABI,
    signerOrProvider
  );
};

// Get signer from private key (for server operations)
export const getSigner = () => {
  const provider = getProvider();
  const privateKey = process.env.PRIVATE_KEY;
  
  if (!privateKey) {
    throw new Error('PRIVATE_KEY not found in environment variables');
  }
  
  return new ethers.Wallet(privateKey, provider);
};