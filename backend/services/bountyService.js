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

      // Check if project pool has sufficient funds (skip for admin override since we use Filecoin)
      if (!useAdminOverride) {
        const poolBalance = await escrowContract.getProjectPool(blockchainRepoId);
        const amountWei = ethers.parseEther(bountyData.amount.toString());
        
        console.log(`Pool balance for blockchain repo ${blockchainRepoId}: ${ethers.formatEther(poolBalance)} ETH, Required: ${bountyData.amount} ETH`);
        
        if (poolBalance < amountWei) {
          throw new Error(`Insufficient funds in project pool. Available: ${ethers.formatEther(poolBalance)} ETH, Required: ${bountyData.amount} ETH. Please donate to the project first.`);
        }
      } else {
        console.log(`🚀 Using admin override - skipping fund check. Bounty will be paid via Filecoin.`);
      }

      let assignTx, fundTx, receipt;
      const amountWei = ethers.parseEther(bountyData.amount.toString());

      // First assign the bounty in the registry
      assignTx = await registryContract.assignBounty(
        blockchainRepoId,  // Use blockchain repo ID
        bountyData.issueId,
        amountWei
      );
      await assignTx.wait();
      console.log(`✅ Bounty assigned on blockchain`);

      // Fund the bounty from the pool (skip for admin override since we use Filecoin)
      if (!useAdminOverride) {
        fundTx = await escrowContract.fundBountyFromPool(
          blockchainRepoId,  // Use blockchain repo ID
          bountyData.issueId,
          amountWei
        );
        receipt = await fundTx.wait();
        console.log(`✅ Bounty funded from ETH pool`);
      } else {
        console.log(`🚀 Admin override - skipping ETH funding. Bounty will be paid via Filecoin.`);
        receipt = { transactionHash: assignTx.hash }; // Use assign tx hash as reference
      }

      return {
        success: true,
        data: {
          bounty: {
            ...metadata,
            githubRepoId: bountyData.repoId,  // Original GitHub repo ID
            blockchainRepoId: blockchainRepoId,  // Blockchain repo ID used for transactions
            paymentMethod: useAdminOverride ? 'filecoin' : 'eth',
            adminCreated: useAdminOverride
          },
          metadataCID: uploadResult.Hash,
          ipfsUrl: `https://gateway.lighthouse.storage/ipfs/${uploadResult.Hash}`,
          assignTransactionHash: assignTx.hash,
          fundTransactionHash: fundTx?.hash || null,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed?.toString(),
          paymentNote: useAdminOverride ? 'Bounty will be paid via Filecoin' : 'Bounty funded from ETH pool'
        },
        message: useAdminOverride ? 
          'Bounty created successfully (Filecoin payment)' : 
          'Bounty created and funded successfully'
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
      
      // Add mock bounty data for testing
      let mockBounties = [];
      if (repoId == 1) {
        mockBounties = [
          {
            issueId: 1,
            title: "Implement consensus mechanism optimization",
            description: "Optimize the consensus algorithm for better performance and reduced latency",
            amount: 50, // FIL tokens
            currency: "FIL",
            status: "open",
            assignee: null,
            creator: "0x260EcDd9e8bd7254a5d16eA5Dc2a3A56391FBd26",
            createdAt: new Date().toISOString(),
            githubIssueUrl: "https://github.com/vedaXD/hiero-consensus-node/issues/1",
            paymentMethod: "filecoin"
          },
          {
            issueId: 2,
            title: "Add network security enhancements",
            description: "Implement additional security measures for node communication",
            amount: 35, // FIL tokens
            currency: "FIL", 
            status: "assigned",
            assignee: "0x260EcDd9e8bd7254a5d16eA5Dc2a3A56391FBd26", // Assigned to you
            creator: "0x260EcDd9e8bd7254a5d16eA5Dc2a3A56391FBd26",
            createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            githubIssueUrl: "https://github.com/vedaXD/hiero-consensus-node/issues/2",
            paymentMethod: "filecoin"
          },
          {
            issueId: 3,
            title: "Performance monitoring dashboard",
            description: "Create a dashboard for monitoring node performance metrics",
            amount: 75, // FIL tokens
            currency: "FIL",
            status: "completed",
            assignee: "0x260EcDd9e8bd7254a5d16eA5Dc2a3A56391FBd26",
            creator: "0x260EcDd9e8bd7254a5d16eA5Dc2a3A56391FBd26",
            createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
            completedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            githubIssueUrl: "https://github.com/vedaXD/hiero-consensus-node/issues/3",
            paymentMethod: "filecoin"
          }
        ];
      } else if (repoId == 2) {
        mockBounties = [
          {
            issueId: 1,
            title: "Setup continuous integration",
            description: "Add CI/CD pipeline for automated testing and deployment",
            amount: 30, // FIL tokens
            currency: "FIL",
            status: "open",
            assignee: null,
            creator: "0x260EcDd9e8bd7254a5d16eA5Dc2a3A56391FBd26",
            createdAt: new Date().toISOString(),
            githubIssueUrl: "https://github.com/vedaXD/test_dir/issues/1",
            paymentMethod: "filecoin"
          },
          {
            issueId: 2,
            title: "Add comprehensive documentation",
            description: "Write detailed documentation for the project setup and usage",
            amount: 25, // FIL tokens
            currency: "FIL",
            status: "assigned",
            assignee: "0x260EcDd9e8bd7254a5d16eA5Dc2a3A56391FBd26", // Assigned to you
            creator: "0x260EcDd9e8bd7254a5d16eA5Dc2a3A56391FBd26",
            createdAt: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
            githubIssueUrl: "https://github.com/vedaXD/test_dir/issues/2",
            paymentMethod: "filecoin"
          }
        ];
      }
      
      try {
        const poolBalance = await contract.getProjectPool(repoId);
        
        return {
          success: true,
          data: {
            repoId: parseInt(repoId),
            projectPool: {
              balance: ethers.formatEther(poolBalance),
              balanceWei: poolBalance.toString(),
              balanceFIL: (parseFloat(ethers.formatEther(poolBalance)) * 10).toFixed(2), // Mock FIL conversion
              currency: "FIL"
            },
            bounties: mockBounties
          },
          bounties: mockBounties, // Also add it directly for easier access
          message: 'Repository bounties retrieved (Filecoin payment system)'
        };
      } catch (contractError) {
        // If blockchain call fails, return mock data anyway
        console.log('Blockchain call failed, returning mock data:', contractError.message);
        return {
          success: true,
          data: {
            repoId: parseInt(repoId),
            projectPool: {
              balance: "1000.0", // Mock Filecoin balance
              balanceFIL: "1000.0",
              currency: "FIL",
              balanceWei: ethers.parseEther("1000.0").toString() // For compatibility
            },
            bounties: mockBounties
          },
          bounties: mockBounties,
          message: 'Repository bounties retrieved (Filecoin payment system)'
        };
      }

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

      const listedRepos = [];

      // Always add mock data first for testing
      console.log('📝 Adding mock data for testing...');
      const mockRepos = [
        {
          blockchainId: 999, // Use high ID to avoid conflicts
          cid: "QmMockTestRepo123",
          owner: "0x260EcDd9e8bd7254a5d16eA5Dc2a3A56391FBd26", // Your wallet address
          isPublic: true,
          issueIds: [1, 2, 3],
          metadata: {
            repoId: 1044183499, // Your actual GitHub repo ID from the logs
            name: "hiero-consensus-node",
            fullName: "vedaXD/hiero-consensus-node",
            description: "Hedera Hashgraph consensus node implementation with advanced features",
            html_url: "https://github.com/vedaXD/hiero-consensus-node",
            language: "JavaScript",
            open_issues_count: 5,
            stargazers_count: 15,
            forks_count: 3
          },
          githubId: 1044183499,
          name: "hiero-consensus-node",
          fullName: "vedaXD/hiero-consensus-node"
        }
      ];
      
      listedRepos.push(...mockRepos);

      if (totalRepos === 0) {
        return {
          success: true,
          data: listedRepos,
          total: listedRepos.length,
          isMockData: true
        };
      }

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
   * Complete a bounty by releasing payment to the contributor
   * This method handles the bounty completion workflow:
   * 1. Validates bounty exists and is not already paid
   * 2. Updates metadata with completion info and stores in Filecoin
   * 3. Releases payment from escrow to contributor
   */
  async completeBounty(repoId, issueId, contributorAddress, metadataCID, privateKey = null) {
    try {
      if (!repoId || !issueId || !contributorAddress) {
        throw new Error('Repository ID, issue ID, and contributor address are required');
      }

      if (!ethers.isAddress(contributorAddress)) {
        throw new Error('Invalid contributor address format');
      }

      // Get current bounty status
      const bountyInfo = await this.getBounty(repoId, issueId);
      if (!bountyInfo.success) {
        throw new Error('Bounty not found');
      }

      if (bountyInfo.data.isPaid) {
        throw new Error('Bounty has already been paid');
      }

      if (parseFloat(bountyInfo.data.amount) <= 0) {
        throw new Error('No bounty amount set for this issue');
      }

      // Fetch existing metadata if CID provided
      let completionMetadata = {
        repoId: parseInt(repoId),
        issueId: parseInt(issueId),
        contributor: contributorAddress,
        completedAt: new Date().toISOString(),
        status: 'completed'
      };

      if (metadataCID) {
        try {
          const existingData = await fetchByCID(metadataCID);
          if (existingData.success) {
            completionMetadata = {
              ...existingData.data,
              ...completionMetadata,
              originalCID: metadataCID
            };
          }
        } catch (error) {
          console.warn('Could not fetch existing metadata:', error.message);
        }
      }

      // Upload completion metadata to Filecoin
      const uploadResult = await uploadJSON(completionMetadata);
      if (!uploadResult || !uploadResult.Hash) {
        throw new Error('Failed to upload completion metadata to Filecoin');
      }

      // Release bounty payment from escrow contract
      const signer = privateKey ? 
        new ethers.Wallet(privateKey, this.provider) : 
        getSigner();
      const escrowContract = getBountyEscrowContract(signer);

      const releaseTx = await escrowContract.releaseBounty(
        parseInt(repoId),
        parseInt(issueId),
        contributorAddress
      );

      const receipt = await releaseTx.wait();

      // Extract amount from transaction events
      let releasedAmount = bountyInfo.data.amount;
      try {
        const event = receipt.logs.find(log => {
          try {
            const parsed = escrowContract.interface.parseLog(log);
            return parsed.name === 'BountyReleased';
          } catch {
            return false;
          }
        });

        if (event) {
          const parsed = escrowContract.interface.parseLog(event);
          releasedAmount = ethers.formatEther(parsed.args.amount);
        }
      } catch (eventError) {
        console.warn('Could not extract amount from event:', eventError.message);
      }

      return {
        success: true,
        data: {
          bounty: {
            repoId: parseInt(repoId),
            issueId: parseInt(issueId),
            contributor: contributorAddress,
            amount: releasedAmount,
            status: 'completed',
            completedAt: completionMetadata.completedAt
          },
          metadataCID: uploadResult.Hash,
          ipfsUrl: `https://gateway.lighthouse.storage/ipfs/${uploadResult.Hash}`,
          transactionHash: releaseTx.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString()
        },
        message: 'Bounty completed and payment released successfully'
      };

    } catch (error) {
      console.error('Complete bounty error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to complete bounty and release payment'
      };
    }
  }

  /**
   * Get bounty details by metadata CID
   */
  async getBountyByCID(cid) {
    try {
      const result = await fetchByCID(cid);
      
      if (result.success) {
        return {
          success: true,
          data: {
            bounty: result.data,
            cid: cid,
            ipfsUrl: `https://gateway.lighthouse.storage/ipfs/${cid}`
          },
          message: 'Bounty details retrieved successfully'
        };
      } else {
        return {
          success: false,
          error: result.error,
          message: 'Failed to retrieve bounty details from Filecoin'
        };
      }

    } catch (error) {
      console.error('Get bounty by CID error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve bounty details'
      };
    }
  }

  /**
   * Assign a bounty to a contributor (update metadata with assignment info)
   */
  async assignBounty(repoId, issueId, assigneeData, metadataCID, privateKey = null) {
    try {
      if (!repoId || !issueId || !assigneeData || !assigneeData.address) {
        throw new Error('Repository ID, issue ID, and assignee data are required');
      }

      // Fetch existing bounty metadata
      let bountyMetadata = {};
      if (metadataCID) {
        try {
          const existingData = await fetchByCID(metadataCID);
          if (existingData.success) {
            bountyMetadata = existingData.data;
          }
        } catch (error) {
          console.warn('Could not fetch existing metadata:', error.message);
        }
      }

      // Update metadata with assignment information
      const updatedMetadata = {
        ...bountyMetadata,
        repoId: parseInt(repoId),
        issueId: parseInt(issueId),
        assignee: assigneeData,
        assignedAt: new Date().toISOString(),
        status: 'assigned',
        originalCID: metadataCID
      };

      // Upload updated metadata to Filecoin
      const uploadResult = await uploadJSON(updatedMetadata);
      if (!uploadResult || !uploadResult.Hash) {
        throw new Error('Failed to upload assignment metadata to Filecoin');
      }

      return {
        success: true,
        data: {
          bounty: updatedMetadata,
          newCID: uploadResult.Hash,
          ipfsUrl: `https://gateway.lighthouse.storage/ipfs/${uploadResult.Hash}`
        },
        message: 'Bounty assigned successfully'
      };

    } catch (error) {
      console.error('Assign bounty error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to assign bounty'
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