import { ethers } from 'ethers';
import { 
  getProvider, 
  getRepoRegistryContract, 
  getBountyEscrowContract 
} from '../config/blockchain.js';

/**
 * Utility functions for blockchain operations
 */

// Format Wei to Ether with specified decimal places
export const formatEther = (weiValue, decimals = 4) => {
  const etherValue = ethers.formatEther(weiValue);
  return parseFloat(etherValue).toFixed(decimals);
};

// Parse Ether to Wei
export const parseEther = (etherValue) => {
  return ethers.parseEther(etherValue.toString());
};

// Validate Ethereum address
export const isValidAddress = (address) => {
  return ethers.isAddress(address);
};

// Get transaction receipt with retry logic
export const getTransactionReceipt = async (txHash, maxRetries = 10, delay = 2000) => {
  const provider = getProvider();
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const receipt = await provider.getTransactionReceipt(txHash);
      if (receipt && receipt.status !== null) {
        return receipt;
      }
    } catch (error) {
      console.log(`Retry ${i + 1}/${maxRetries} for transaction ${txHash}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  throw new Error(`Transaction receipt not found after ${maxRetries} retries`);
};

// Get all repos with their bounty information
export const getAllReposWithBounties = async () => {
  try {
    const provider = getProvider();
    const repoContract = getRepoRegistryContract(provider);
    const escrowContract = getBountyEscrowContract(provider);
    
    const repoCount = await repoContract.repoCount();
    const repos = [];
    
    for (let i = 1; i <= repoCount; i++) {
      try {
        const [cid, owner, isPublic, issueIds] = await repoContract.getRepo(i);
        
        // Get pool balance
        const poolBalance = await escrowContract.getProjectPool(i);
        
        // Get bounty details for each issue
        const issues = [];
        for (const issueId of issueIds) {
          const metadataBounty = await repoContract.getIssueBounty(issueId);
          const [escrowAmount, paid] = await escrowContract.getBounty(i, issueId);
          
          issues.push({
            id: Number(issueId),
            metadataBounty: formatEther(metadataBounty),
            escrowAmount: formatEther(escrowAmount),
            paid
          });
        }
        
        repos.push({
          id: i,
          cid,
          owner,
          isPublic,
          poolBalance: formatEther(poolBalance),
          issues
        });
      } catch (error) {
        console.error(`Error fetching repo ${i}:`, error);
      }
    }
    
    return repos;
  } catch (error) {
    console.error('Error fetching all repos with bounties:', error);
    throw error;
  }
};

// Get repo statistics
export const getRepoStatistics = async (repoId) => {
  try {
    const provider = getProvider();
    const repoContract = getRepoRegistryContract(provider);
    const escrowContract = getBountyEscrowContract(provider);
    
    const [cid, owner, isPublic, issueIds] = await repoContract.getRepo(repoId);
    const poolBalance = await escrowContract.getProjectPool(repoId);
    
    let totalBounties = 0n;
    let paidBounties = 0n;
    let activeBounties = 0;
    let completedBounties = 0;
    
    for (const issueId of issueIds) {
      const [amount, paid] = await escrowContract.getBounty(repoId, issueId);
      totalBounties += amount;
      
      if (paid) {
        paidBounties += amount;
        completedBounties++;
      } else if (amount > 0) {
        activeBounties++;
      }
    }
    
    return {
      repoId: Number(repoId),
      owner,
      isPublic,
      totalIssues: issueIds.length,
      activeBounties,
      completedBounties,
      poolBalance: formatEther(poolBalance),
      totalBountiesValue: formatEther(totalBounties),
      paidBountiesValue: formatEther(paidBounties)
    };
  } catch (error) {
    console.error('Error fetching repo statistics:', error);
    throw error;
  }
};

// Estimate gas for common operations
export const estimateGas = {
  registerRepo: async (cid, isPublic, issueIds, signer) => {
    const contract = getRepoRegistryContract(signer);
    return await contract.estimateGas.registerRepo(cid, isPublic, issueIds);
  },
  
  assignBounty: async (repoId, issueId, bountyWei, signer) => {
    const contract = getRepoRegistryContract(signer);
    return await contract.estimateGas.assignBounty(repoId, issueId, bountyWei);
  },
  
  donateToProject: async (repoId, amountWei, signer) => {
    const contract = getBountyEscrowContract(signer);
    return await contract.estimateGas.donateToProject(repoId, { value: amountWei });
  },
  
  fundBountyFromPool: async (repoId, issueId, amountWei, signer) => {
    const contract = getBountyEscrowContract(signer);
    return await contract.estimateGas.fundBountyFromPool(repoId, issueId, amountWei);
  },
  
  releaseBounty: async (repoId, issueId, solverAddress, signer) => {
    const contract = getBountyEscrowContract(signer);
    return await contract.estimateGas.releaseBounty(repoId, issueId, solverAddress);
  }
};

// Event listeners and filters
export const createEventFilters = () => {
  const provider = getProvider();
  const repoContract = getRepoRegistryContract(provider);
  const escrowContract = getBountyEscrowContract(provider);
  
  return {
    repoRegistered: repoContract.filters.RepoRegistered(),
    bountyAssigned: repoContract.filters.BountyAssigned(),
    projectDonated: escrowContract.filters.ProjectDonated(),
    bountyFunded: escrowContract.filters.BountyFunded(),
    bountyReleased: escrowContract.filters.BountyReleased()
  };
};

// Get events in a block range
export const getEventsInRange = async (fromBlock, toBlock) => {
  const provider = getProvider();
  const repoContract = getRepoRegistryContract(provider);
  const escrowContract = getBountyEscrowContract(provider);
  
  const filters = createEventFilters();
  
  const [
    repoRegisteredEvents,
    bountyAssignedEvents,
    projectDonatedEvents,
    bountyFundedEvents,
    bountyReleasedEvents
  ] = await Promise.all([
    repoContract.queryFilter(filters.repoRegistered, fromBlock, toBlock),
    repoContract.queryFilter(filters.bountyAssigned, fromBlock, toBlock),
    escrowContract.queryFilter(filters.projectDonated, fromBlock, toBlock),
    escrowContract.queryFilter(filters.bountyFunded, fromBlock, toBlock),
    escrowContract.queryFilter(filters.bountyReleased, fromBlock, toBlock)
  ]);
  
  return {
    repoRegistered: repoRegisteredEvents,
    bountyAssigned: bountyAssignedEvents,
    projectDonated: projectDonatedEvents,
    bountyFunded: bountyFundedEvents,
    bountyReleased: bountyReleasedEvents
  };
};