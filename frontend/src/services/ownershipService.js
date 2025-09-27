import { ethers } from 'ethers';

// Contract addresses (corrected)
export const CONTRACT_ADDRESSES = {
  REPO_REGISTRY: '0x3bf06982df5959b3Bf26bA62B46069c42FA002e0',
  BOUNTY_ESCROW: '0xE865690eCAc3547dA4e87e648F7Fbb10778C6050'
};

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

// Network configuration for Filecoin
const FILECOIN_CALIBRATION_TESTNET = {
  chainId: '0x4cb2f', // 314159 in hex
  chainName: 'Filecoin Calibration Testnet',
  nativeCurrency: {
    name: 'Test Filecoin',
    symbol: 'tFIL',
    decimals: 18,
  },
  rpcUrls: ['https://api.calibration.node.glif.io/rpc/v1'],
  blockExplorerUrls: ['https://calibration.filfox.info/'],
};

class OwnershipService {
  constructor() {
    this.provider = null;
    this.repoRegistryContract = null;
  }

  // Initialize Web3 connection
  async initialize() {
    if (typeof window !== 'undefined' && typeof window.ethereum !== 'undefined') {
      this.provider = new ethers.BrowserProvider(window.ethereum);
    } else {
      // Use public RPC for read-only operations
      this.provider = new ethers.JsonRpcProvider('https://api.calibration.node.glif.io/rpc/v1');
    }

    this.repoRegistryContract = new ethers.Contract(
      CONTRACT_ADDRESSES.REPO_REGISTRY,
      REPO_REGISTRY_ABI,
      this.provider
    );

    return true;
  }

  // Get repository information including owner
  async getRepositoryInfo(repoId) {
    try {
      if (!this.repoRegistryContract) {
        await this.initialize();
      }

      const [cid, owner, isPublic, issueIds] = await this.repoRegistryContract.getRepo(repoId);
      
      return {
        success: true,
        data: {
          repoId: parseInt(repoId),
          cid,
          owner,
          isPublic,
          issueIds: issueIds.map(id => Number(id))
        }
      };
    } catch (error) {
      console.error('Get repository info error:', error);
      return {
        success: false,
        error: error.message,
        notFound: error.message.includes('nonexistent') || error.message.includes('not found')
      };
    }
  }

  // Check if current user owns the repository
  async checkRepositoryOwnership(repoId, userAddress) {
    try {
      const repoInfo = await this.getRepositoryInfo(repoId);
      
      if (!repoInfo.success) {
        if (repoInfo.notFound) {
          return {
            success: false,
            error: `Repository ${repoId} is not registered on blockchain`,
            suggestion: 'Please list the repository first before creating bounties'
          };
        }
        return {
          success: false,
          error: repoInfo.error
        };
      }

      const isOwner = repoInfo.data.owner.toLowerCase() === userAddress.toLowerCase();
      
      return {
        success: true,
        isOwner,
        actualOwner: repoInfo.data.owner,
        userAddress,
        repoInfo: repoInfo.data,
        message: isOwner 
          ? 'You are the repository owner'
          : `Repository is owned by ${repoInfo.data.owner}, but you are ${userAddress}`
      };

    } catch (error) {
      console.error('Check repository ownership error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get all repositories owned by an address
  async getRepositoriesOwnedBy(ownerAddress) {
    try {
      if (!this.repoRegistryContract) {
        await this.initialize();
      }

      const repoCount = await this.repoRegistryContract.repoCount();
      const totalRepos = Number(repoCount);
      
      const ownedRepos = [];

      for (let i = 1; i <= totalRepos; i++) {
        try {
          const [cid, owner, isPublic, issueIds] = await this.repoRegistryContract.getRepo(i);
          
          if (owner.toLowerCase() === ownerAddress.toLowerCase()) {
            ownedRepos.push({
              id: i,
              cid,
              owner,
              isPublic,
              issueIds: issueIds.map(id => Number(id))
            });
          }
        } catch (error) {
          console.log(`Error checking repo ${i}:`, error.message);
        }
      }

      return {
        success: true,
        data: ownedRepos,
        total: ownedRepos.length
      };

    } catch (error) {
      console.error('Get owned repositories error:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }
}

export default new OwnershipService();