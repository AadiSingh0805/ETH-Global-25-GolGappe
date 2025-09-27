import { uploadJSON, fetchByCID } from './lightHouseService.js';
import { 
  getBountyEscrowContract,
  getSigner,
  getProvider 
} from '../config/blockchain.js';
import { ethers } from 'ethers';

class BountyService {
  constructor() {
    this.provider = getProvider();
  }

  /**
   * Create a new bounty and store metadata in Filecoin
   */
  async createBounty(bountyData, privateKey = null) {
    try {
      // Validate bounty data
      if (!bountyData.repoId || !bountyData.issueId || !bountyData.amount) {
        throw new Error('Repository ID, Issue ID, and amount are required');
      }

      // Prepare metadata for Filecoin storage
      const metadata = {
        ...bountyData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'open',
        version: '1.0'
      };

      // Upload metadata to Filecoin via Lighthouse
      const uploadResult = await uploadJSON({
        name: `bounty-${bountyData.repoId}-${bountyData.issueId}.json`,
        content: JSON.stringify(metadata)
      });

      if (!uploadResult.Hash) {
        throw new Error('Failed to upload bounty metadata to Filecoin');
      }

      // Get contract instance
      const signer = privateKey ? 
        new ethers.Wallet(privateKey, this.provider) : 
        getSigner();
      const contract = getBountyEscrowContract(signer);

      // Fund the bounty on the blockchain (amount should be in Wei)
      const amountWei = ethers.parseEther(bountyData.amount.toString());
      
      const tx = await contract.fundBountyFromPool(
        bountyData.repoId,
        bountyData.issueId,
        amountWei,
        {
          value: amountWei // If funding directly, otherwise this line can be removed
        }
      );

      const receipt = await tx.wait();

      return {
        success: true,
        data: {
          bounty: metadata,
          metadataCID: uploadResult.Hash,
          ipfsUrl: `https://gateway.lighthouse.storage/ipfs/${uploadResult.Hash}`,
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString()
        },
        message: 'Bounty created successfully'
      };

    } catch (error) {
      console.error('Create bounty error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to create bounty'
      };
    }
  }

  /**
   * Update bounty metadata (e.g., assign to contributor)
   */
  async updateBounty(metadataCID, updates, privateKey = null) {
    try {
      // Fetch current metadata
      const currentMetadata = await fetchByCID(metadataCID);
      
      // Merge updates
      const updatedMetadata = {
        ...currentMetadata,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      // Upload updated metadata
      const uploadResult = await uploadJSON({
        name: `bounty-${updatedMetadata.repoId}-${updatedMetadata.issueId}-updated.json`,
        content: JSON.stringify(updatedMetadata)
      });

      return {
        success: true,
        data: {
          bounty: updatedMetadata,
          oldCID: metadataCID,
          newCID: uploadResult.Hash,
          ipfsUrl: `https://gateway.lighthouse.storage/ipfs/${uploadResult.Hash}`
        },
        message: 'Bounty updated successfully'
      };

    } catch (error) {
      console.error('Update bounty error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to update bounty'
      };
    }
  }

  /**
   * Assign bounty to contributor
   */
  async assignBounty(repoId, issueId, assigneeData, metadataCID, privateKey = null) {
    try {
      // Get contract instance
      const signer = privateKey ? 
        new ethers.Wallet(privateKey, this.provider) : 
        getSigner();
      const contract = getBountyEscrowContract(signer);

      // Update metadata with assignee information
      const updates = {
        assignee: assigneeData,
        status: 'assigned',
        assignedAt: new Date().toISOString()
      };

      // Update metadata in Filecoin
      const metadataResult = await this.updateBounty(metadataCID, updates);

      if (!metadataResult.success) {
        throw new Error('Failed to update bounty metadata');
      }

      return {
        success: true,
        data: {
          ...metadataResult.data,
          repoId: parseInt(repoId),
          issueId: parseInt(issueId),
          assignee: assigneeData
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
   * Complete bounty and release payment
   */
  async completeBounty(repoId, issueId, contributorAddress, metadataCID, privateKey = null) {
    try {
      // Get contract instance
      const signer = privateKey ? 
        new ethers.Wallet(privateKey, this.provider) : 
        getSigner();
      const contract = getBountyEscrowContract(signer);

      // Release payment on blockchain
      const tx = await contract.releaseBounty(repoId, issueId, contributorAddress);
      const receipt = await tx.wait();

      // Update metadata
      const updates = {
        status: 'completed',
        completedAt: new Date().toISOString(),
        paymentReleased: true,
        paymentTx: tx.hash
      };

      const metadataResult = await this.updateBounty(metadataCID, updates);

      return {
        success: true,
        data: {
          ...metadataResult.data,
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          contributorAddress
        },
        message: 'Bounty completed and payment released'
      };

    } catch (error) {
      console.error('Complete bounty error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to complete bounty'
      };
    }
  }

  /**
   * Get bounty details by CID
   */
  async getBountyByCID(cid) {
    try {
      const metadata = await fetchByCID(cid);
      
      return {
        success: true,
        data: {
          bounty: metadata,
          cid,
          ipfsUrl: `https://gateway.lighthouse.storage/ipfs/${cid}`
        },
        message: 'Bounty retrieved successfully'
      };

    } catch (error) {
      console.error('Get bounty error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve bounty'
      };
    }
  }

  /**
   * Get bounty details from blockchain
   */
  async getBountyFromBlockchain(repoId, issueId) {
    try {
      const contract = getBountyEscrowContract(this.provider);
      
      const [amount, paid] = await contract.getBountyDetails(repoId, issueId);
      
      return {
        success: true,
        data: {
          repoId: parseInt(repoId),
          issueId: parseInt(issueId),
          amount: ethers.formatEther(amount),
          amountWei: amount.toString(),
          paid,
          status: paid ? 'completed' : 'open'
        },
        message: 'Blockchain bounty details retrieved'
      };

    } catch (error) {
      console.error('Get blockchain bounty error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve bounty from blockchain'
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
}

export default new BountyService();