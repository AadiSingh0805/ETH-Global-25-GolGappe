import { uploadJSON, fetchByCID } from './lightHouseService.js';
import { 
  getBountyEscrowContract,
  getRepoRegistryContract,
  getSigner,
  getProvider 
} from '../config/blockchain.js';
import { ethers } from 'ethers';

class BountyService {
  constructor() {
    this.provider = getProvider();
  }

  /**
   * Register a repository on the blockchain
   */
  async registerRepository(repoData, privateKey = null) {
    try {
      if (!repoData.repoId || !repoData.cid) {
        throw new Error('Repository ID and CID are required');
      }

      const signer = privateKey ? 
        new ethers.Wallet(privateKey, this.provider) : 
        getSigner();
      const contract = getRepoRegistryContract(signer);

      const tx = await contract.registerRepo(
        repoData.cid,
        repoData.isPublic || true,
        repoData.issueIds || []
      );

      const receipt = await tx.wait();

      return {
        success: true,
        data: {
          repoId: repoData.repoId,
          cid: repoData.cid,
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString()
        },
        message: 'Repository registered successfully'
      };

    } catch (error) {
      console.error('Register repository error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to register repository'
      };
    }
  }

  /**
   * Find blockchain repository ID for a given GitHub repository ID
   */
  async findBlockchainRepoId(githubRepoId) {
    try {
      const listedRepos = await this.getListedRepositories();
      
      if (listedRepos.success) {
        const matchingRepo = listedRepos.data.find(repo => 
          repo.githubId === githubRepoId
        );
        
        if (matchingRepo) {
          console.log(`✅ Found blockchain repo ID ${matchingRepo.blockchainId} for GitHub repo ${githubRepoId}`);
          return {
            success: true,
            blockchainRepoId: matchingRepo.blockchainId,
            repoData: matchingRepo
          };
        }
      }
      
      return {
        success: false,
        error: `Repository with GitHub ID ${githubRepoId} not found on blockchain`,
        availableRepos: listedRepos.success ? listedRepos.data.map(r => ({
          blockchainId: r.blockchainId,
          githubId: r.githubId,
          name: r.name
        })) : []
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create a new bounty and store metadata in Filecoin
   */
  async createBounty(bountyData, privateKey = null, useAdminOverride = false) {
    let blockchainRepoId = null; // Declare at function scope
    
    try {
      // Validate bounty data
      if (!bountyData.repoId || !bountyData.issueId || !bountyData.amount) {
        throw new Error('Repository ID, Issue ID, and amount are required');
      }

      // Validate amount is positive
      if (parseFloat(bountyData.amount) <= 0) {
        throw new Error('Bounty amount must be positive');
      }

      // Use admin private key if override is requested and no private key provided
      if (useAdminOverride && !privateKey) {
        privateKey = process.env.PRIVATE_KEY;
        console.log('Using admin override for bounty creation');
      }

      // Prepare metadata for Filecoin storage
      const metadata = {
        ...bountyData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'open',
        version: '1.0',
        adminCreated: useAdminOverride // Flag to indicate admin created this bounty
      };

      // Upload metadata to Filecoin via Lighthouse
      const uploadResult = await uploadJSON({
        name: `bounty-${bountyData.repoId}-${bountyData.issueId}.json`,
        content: JSON.stringify(metadata)
      });

      if (!uploadResult.Hash) {
        throw new Error('Failed to upload bounty metadata to Filecoin');
      }

      // Get contract instances
      const signer = privateKey ? 
        new ethers.Wallet(privateKey, this.provider) : 
        getSigner();
      const escrowContract = getBountyEscrowContract(signer);
      const registryContract = getRepoRegistryContract(signer);

      // Find blockchain repository ID by GitHub ID
      const repoLookup = await this.findBlockchainRepoId(bountyData.repoId);
      
      if (!repoLookup.success) {
        // If we can't find the mapping, check if the bountyData.repoId might already be a blockchain ID
        try {
          const registryContract = getRepoRegistryContract(this.provider);
          await registryContract.getRepo(bountyData.repoId);
          
          // If this succeeds, the repoId is likely a blockchain repo ID
          blockchainRepoId = bountyData.repoId;
          console.log(`⚠️ Using repo ID ${bountyData.repoId} as blockchain repo ID (no GitHub mapping found)`);
          
        } catch (directCheckError) {
          // Last resort: if user is admin and we have only one repo on blockchain, use it
          if (useAdminOverride) {
            const allRepos = await this.getListedRepositories();
            if (allRepos.success && allRepos.total === 1) {
              blockchainRepoId = allRepos.data[0].blockchainId;
              console.log(`🆘 Admin override: Using the only available blockchain repo ID ${blockchainRepoId} for GitHub repo ${bountyData.repoId}`);
            } else {
              throw new Error(`${repoLookup.error}. Available repositories: ${JSON.stringify(repoLookup.availableRepos)}. As admin fallback failed - found ${allRepos.total} repos, need exactly 1.`);
            }
          } else {
            throw new Error(`${repoLookup.error}. Available repositories: ${JSON.stringify(repoLookup.availableRepos)}`);
          }
        }
      } else {
        blockchainRepoId = repoLookup.blockchainRepoId;
        console.log(`✅ Using blockchain repo ID ${blockchainRepoId} for GitHub repo ${bountyData.repoId}`);
      }

      // Verify repository exists on blockchain
      try {
        await registryContract.getRepo(blockchainRepoId);
        console.log(`✅ Verified blockchain repository ${blockchainRepoId} exists`);
      } catch (repoError) {
        throw new Error(`Blockchain repository ${blockchainRepoId} verification failed: ${repoError.message}`);
      }

      // Check if project pool has sufficient funds
      const poolBalance = await escrowContract.getProjectPool(blockchainRepoId);
      const amountWei = ethers.parseEther(bountyData.amount.toString());
      
      console.log(`Pool balance for blockchain repo ${blockchainRepoId}: ${ethers.formatEther(poolBalance)} ETH, Required: ${bountyData.amount} ETH`);
      
      if (poolBalance < amountWei) {
        throw new Error(`Insufficient funds in project pool. Available: ${ethers.formatEther(poolBalance)} ETH, Required: ${bountyData.amount} ETH. Please donate to the project first.`);
      }

      // First assign the bounty in the registry
      const assignTx = await registryContract.assignBounty(
        blockchainRepoId,  // Use blockchain repo ID
        bountyData.issueId,
        amountWei
      );
      await assignTx.wait();

      // Then fund the bounty from the pool
      const fundTx = await escrowContract.fundBountyFromPool(
        blockchainRepoId,  // Use blockchain repo ID
        bountyData.issueId,
        amountWei
      );

      const receipt = await fundTx.wait();

      return {
        success: true,
        data: {
          bounty: {
            ...metadata,
            githubRepoId: bountyData.repoId,  // Original GitHub repo ID
            blockchainRepoId: blockchainRepoId  // Blockchain repo ID used for transactions
          },
          metadataCID: uploadResult.Hash,
          ipfsUrl: `https://gateway.lighthouse.storage/ipfs/${uploadResult.Hash}`,
          assignTransactionHash: assignTx.hash,
          fundTransactionHash: fundTx.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString()
        },
        message: 'Bounty created successfully'
      };

    } catch (error) {
      console.error('Create bounty error:', {
        githubRepoId: bountyData.repoId,
        blockchainRepoId: blockchainRepoId || 'not determined',
        issueId: bountyData.issueId,
        amount: bountyData.amount,
        error: error.message,
        code: error.code,
        reason: error.reason,
        transaction: error.transaction
      });
      
      let errorMessage = 'Failed to create bounty';
      let specificError = error.message;
      
      // Parse specific error types
      if (error.code === 'CALL_EXCEPTION') {
        if (error.reason === 'require(false)') {
          if (error.message.includes('Repository')) {
            errorMessage = 'Repository not found or not registered on blockchain';
            specificError = `Repository ${bountyData.repoId} must be registered first`;
          } else if (error.message.includes('fund')) {
            errorMessage = 'Insufficient funds in project pool';
            specificError = 'Please donate to the project pool before creating bounties';
          } else {
            errorMessage = 'Smart contract execution failed';
            specificError = 'Contract requirements not met - check repository registration and pool funds';
          }
        }
      } else if (error.message.includes('Filecoin')) {
        errorMessage = 'Failed to store metadata';
        specificError = 'Could not upload bounty metadata to Filecoin/IPFS';
      } else if (error.message.includes('private key')) {
        errorMessage = 'Blockchain configuration error';
        specificError = 'Server wallet not properly configured';
      }
      
      return {
        success: false,
        error: specificError,
        message: errorMessage,
        code: error.code
      };
    }
  }

  /**
   * Donate funds to a project pool
   */
  async donateToProject(repoId, amount, privateKey = null) {
    try {
      if (!repoId || !amount) {
        throw new Error('Repository ID and amount are required');
      }

      const signer = privateKey ? 
        new ethers.Wallet(privateKey, this.provider) : 
        getSigner();
      const contract = getBountyEscrowContract(signer);

      const amountWei = ethers.parseEther(amount.toString());
      
      const tx = await contract.donateToProject(repoId, {
        value: amountWei
      });

      const receipt = await tx.wait();

      return {
        success: true,
        data: {
          repoId: parseInt(repoId),
          amount: amount.toString(),
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString()
        },
        message: 'Project donation successful'
      };

    } catch (error) {
      console.error('Donate to project error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to donate to project'
      };
    }
  }

  /**
   * Get project pool balance
   */
  async getProjectPool(repoId) {
    try {
      const contract = getBountyEscrowContract(this.provider);
      const poolBalance = await contract.getProjectPool(repoId);
      
      return {
        success: true,
        data: {
          repoId: parseInt(repoId),
          balance: ethers.formatEther(poolBalance),
          balanceWei: poolBalance.toString()
        },
        message: 'Project pool balance retrieved'
      };

    } catch (error) {
      console.error('Get project pool error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve project pool balance'
      };
    }
  }

  /**
   * Get all bounties for a repository
   */
  async getRepositoryBounties(repoId) {
    try {
      const contract = getBountyEscrowContract(this.provider);
      const poolBalance = await contract.getProjectPool(repoId);
      
      // For now, return the pool information
      // In a more complex setup, you'd need to track individual bounties
      return {
        success: true,
        data: {
          repoId: parseInt(repoId),
          projectPool: {
            balance: ethers.formatEther(poolBalance),
            balanceWei: poolBalance.toString()
          },
          bounties: [] // This would contain individual bounty details
        },
        message: 'Repository bounties retrieved'
      };

    } catch (error) {
      console.error('Get repository bounties error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve repository bounties'
      };
    }
  }

  /**
   * Get bounty details from blockchain
   */
  async getBounty(repoId, issueId) {
    try {
      const contract = getBountyEscrowContract(this.provider);
      const bountyInfo = await contract.getBounty(repoId, issueId);
      
      return {
        success: true,
        data: {
          repoId: parseInt(repoId),
          issueId: parseInt(issueId),
          amount: ethers.formatEther(bountyInfo.amount),
          amountWei: bountyInfo.amount.toString(),
          isPaid: bountyInfo.paid
        },
        message: 'Bounty information retrieved'
      };

    } catch (error) {
      console.error('Get bounty error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve bounty information'
      };
    }
  }

  /**
   * Get all listed repositories from blockchain with metadata
   */
  async getListedRepositories() {
    try {
      console.log('🔗 Connecting to REPO_REGISTRY contract...');
      const contract = getRepoRegistryContract(this.provider);
      const repoCount = await contract.repoCount();
      const totalRepos = Number(repoCount);
      
      console.log(`📊 Found ${totalRepos} repositories on blockchain`);

      if (totalRepos === 0) {
        return {
          success: true,
          data: [],
          total: 0
        };
      }

      const listedRepos = [];

      for (let i = 1; i <= totalRepos; i++) {
        try {
          console.log(`📦 Fetching repository ${i}/${totalRepos}...`);
          const [cid, owner, isPublic, issueIds] = await contract.getRepo(i);
          console.log(`📋 Repo ${i} details:`, { cid, owner, isPublic, issueCount: issueIds.length });
          
          // Fetch metadata from IPFS
          let metadata = null;
          try {
            console.log(`🔄 Fetching metadata for repo ${i} from IPFS CID: ${cid}`);
            const metadataResult = await fetchByCID(cid);
            if (metadataResult.success) {
              metadata = metadataResult.data;
              console.log(`✅ Got metadata for repo ${i}:`, {
                repoId: metadata?.repoId,
                name: metadata?.name,
                fullName: metadata?.fullName
              });
            } else {
              console.log(`⚠️ Failed to fetch metadata for repo ${i}:`, metadataResult.error);
            }
          } catch (metadataError) {
            console.log(`❌ Could not fetch metadata for repo ${i}, CID: ${cid}`, metadataError.message);
          }

          const repoData = {
            blockchainId: i,
            cid,
            owner,
            isPublic,
            issueIds: issueIds.map(id => Number(id)),
            metadata,
            githubId: metadata?.repoId || null,
            name: metadata?.name || null,
            fullName: metadata?.fullName || null
          };
          
          listedRepos.push(repoData);
          console.log(`➕ Added repo ${i} to results:`, {
            blockchainId: repoData.blockchainId,
            githubId: repoData.githubId,
            name: repoData.name
          });
        } catch (error) {
          console.error(`💥 Error fetching repo ${i}:`, error.message);
        }
      }

      console.log(`🎉 Successfully processed ${listedRepos.length} repositories`);
      return {
        success: true,
        data: listedRepos,
        total: totalRepos
      };
    } catch (error) {
      console.error('💥 Get listed repositories error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to fetch listed repositories from blockchain'
      };
    }
  }

  /**
   * Check if a repository is already listed on the blockchain
   */
  async isRepositoryListed(githubRepoId) {
    try {
      const listedReposResult = await this.getListedRepositories();
      
      if (!listedReposResult.success) {
        return { success: false, isListed: false };
      }

      const isListed = listedReposResult.data.some(repo => 
        repo.githubId && repo.githubId.toString() === githubRepoId.toString()
      );

      return {
        success: true,
        isListed,
        message: isListed ? 'Repository is already listed' : 'Repository is not listed'
      };
    } catch (error) {
      console.error('Check repository listed error:', error);
      return {
        success: false,
        isListed: false,
        error: error.message
      };
    }
  }
}

export default new BountyService();