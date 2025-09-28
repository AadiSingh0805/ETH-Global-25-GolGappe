import { ethers } from 'ethers';

// Contract addresses
export const CONTRACT_ADDRESSES = {
  REPO_REGISTRY: '0x3bf06982df5959b3Bf26bA62B46069c42FA002e0',
  BOUNTY_ESCROW: '0xE865690eCAc3547dA4e87e648F7Fbb10778C6050'
};

// Contract ABIs
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

// Network configuration
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

class Web3Service {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.bountyEscrowContract = null;
  }

  // Check if MetaMask is installed
  isMetaMaskInstalled() {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  }

  // Initialize Web3 connection
  async initialize() {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
    }

    // Create provider
    this.provider = new ethers.BrowserProvider(window.ethereum);
    
    // Get signer (current account)
    this.signer = await this.provider.getSigner();

    // Initialize contracts
    this.bountyEscrowContract = new ethers.Contract(
      CONTRACT_ADDRESSES.BOUNTY_ESCROW,
      BOUNTY_ESCROW_ABI,
      this.signer
    );

    return true;
  }

  // Connect to MetaMask
  async connectWallet() {
    try {
      if (!this.isMetaMaskInstalled()) {
        throw new Error('MetaMask is not installed');
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please connect your MetaMask wallet.');
      }

      // Initialize Web3
      await this.initialize();

      // Check and switch to Filecoin Calibration network
      await this.ensureCorrectNetwork();

      return {
        success: true,
        address: accounts[0],
        message: 'Successfully connected to MetaMask'
      };
    } catch (error) {
      console.error('Connect wallet error:', error);
      throw error;
    }
  }

  // Ensure user is on correct network
  async ensureCorrectNetwork() {
    try {
      const network = await this.provider.getNetwork();
      const targetChainId = parseInt(FILECOIN_CALIBRATION_TESTNET.chainId, 16);

      if (network.chainId !== BigInt(targetChainId)) {
        // Try to switch to Filecoin Calibration network
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: FILECOIN_CALIBRATION_TESTNET.chainId }],
          });
        } catch (switchError) {
          // If network doesn't exist, add it
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [FILECOIN_CALIBRATION_TESTNET],
            });
          } else {
            throw switchError;
          }
        }
        
        // Re-initialize after network switch
        await this.initialize();
      }
    } catch (error) {
      console.error('Network switch error:', error);
      throw new Error('Please switch to Filecoin Calibration Testnet in MetaMask');
    }
  }

  // Donate to project pool using MetaMask
  async donateToProject(repoId, amountInFil) {
    try {
      // Ensure wallet is connected and on correct network
      await this.connectWallet();

      if (!this.bountyEscrowContract) {
        throw new Error('Contract not initialized');
      }

      // Check user's balance first
      const account = await this.getCurrentAccount();
      const userBalance = parseFloat(account.balance);
      
      if (userBalance < amountInFil) {
        throw new Error(`Insufficient tFIL balance. You have ${userBalance.toFixed(4)} tFIL but trying to donate ${amountInFil} tFIL`);
      }

      // Convert FIL amount to Wei (18 decimals)
      const amountInWei = ethers.parseEther(amountInFil.toString());

      console.log(`Donating ${amountInFil} tFIL to repository ${repoId}`);
      console.log(`Amount in Wei: ${amountInWei.toString()}`);
      console.log(`User balance: ${userBalance} tFIL`);

      // Estimate gas first
      let gasEstimate;
      try {
        gasEstimate = await this.bountyEscrowContract.donateToProject.estimateGas(
          parseInt(repoId),
          { value: amountInWei }
        );
        console.log(`Estimated gas: ${gasEstimate.toString()}`);
      } catch (estimateError) {
        console.error('Gas estimation failed:', estimateError);
        throw new Error(`Transaction simulation failed. This might indicate:\n- Contract is paused\n- Invalid repository ID\n- Contract logic error\n\nDetails: ${estimateError.message}`);
      }

      // Call the contract function with MetaMask
      const transaction = await this.bountyEscrowContract.donateToProject(
        parseInt(repoId),
        {
          value: amountInWei,
          gasLimit: Math.floor(Number(gasEstimate) * 1.2) // Add 20% buffer
        }
      );

      console.log('Transaction submitted:', transaction.hash);

      // Wait for transaction confirmation
      const receipt = await transaction.wait();

      console.log('Transaction confirmed:', receipt);

      return {
        success: true,
        transactionHash: transaction.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        amount: amountInFil,
        repoId: parseInt(repoId),
        message: `Successfully donated ${amountInFil} tFIL to project!`
      };

    } catch (error) {
      console.error('Donate to project error:', error);
      
      // Handle user rejection
      if (error.code === 4001) {
        throw new Error('Transaction was rejected by user');
      }
      
      // Handle insufficient funds
      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new Error('Insufficient tFIL for transaction (including gas fees)');
      }

      // Handle network issues
      if (error.message.includes('Internal JSON-RPC error')) {
        throw new Error('Network error: Please check your Filecoin Calibration Testnet connection and try again');
      }

      // Generic error
      throw new Error(error.message || 'Failed to donate to project');
    }
  }

  // Get project pool balance
  async getProjectPool(repoId) {
    try {
      if (!this.bountyEscrowContract) {
        // For read-only operations, we can use a provider without signer
        const provider = new ethers.JsonRpcProvider('https://api.calibration.node.glif.io/rpc/v1');
        const contract = new ethers.Contract(
          CONTRACT_ADDRESSES.BOUNTY_ESCROW,
          BOUNTY_ESCROW_ABI,
          provider
        );
        
        const poolBalance = await contract.getProjectPool(parseInt(repoId));
        return {
          success: true,
          balance: ethers.formatEther(poolBalance),
          balanceWei: poolBalance.toString()
        };
      }

      const poolBalance = await this.bountyEscrowContract.getProjectPool(parseInt(repoId));
      
      return {
        success: true,
        balance: ethers.formatEther(poolBalance),
        balanceWei: poolBalance.toString()
      };

    } catch (error) {
      console.error('Get project pool error:', error);
      return {
        success: false,
        balance: '0',
        error: error.message
      };
    }
  }

  // Get current connected account
  async getCurrentAccount() {
    try {
      if (!this.signer) {
        await this.initialize();
      }
      
      const address = await this.signer.getAddress();
      const balance = await this.provider.getBalance(address);
      
      return {
        address,
        balance: ethers.formatEther(balance),
        balanceWei: balance.toString()
      };
    } catch (error) {
      console.error('Get current account error:', error);
      throw error;
    }
  }
}

export default new Web3Service();