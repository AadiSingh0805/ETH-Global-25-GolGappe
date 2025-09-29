import { ethers } from 'ethers';
import { getProvider, getRepoRegistryContract, CONTRACT_ADDRESSES } from '../config/blockchain.js';

// Quick diagnostic script to check repository ownership
async function checkRepositoryOwnership(repoId) {
  try {
    console.log('\n=== REPOSITORY OWNERSHIP DIAGNOSTIC ===');
    console.log(`Repository ID: ${repoId}`);
    console.log(`REPO_REGISTRY Contract: ${CONTRACT_ADDRESSES.REPO_REGISTRY}`);
    console.log(`BOUNTY_ESCROW Contract: ${CONTRACT_ADDRESSES.BOUNTY_ESCROW}`);
    
    const provider = getProvider();
    const contract = getRepoRegistryContract(provider);
    
    // Get repository details
    const [cid, owner, isPublic, issueIds] = await contract.getRepo(repoId);
    
    console.log('\n--- Repository Details ---');
    console.log(`CID: ${cid}`);
    console.log(`Owner: ${owner}`);
    console.log(`Is Public: ${isPublic}`);
    console.log(`Issue IDs: ${issueIds.map(id => Number(id))}`);
    
    // Check if this matches the user's wallet
    const userWallet = '0x260EcDd9e8bd7254a5d16eA5Dc2a3A56391FBd26';
    console.log(`\nUser Wallet: ${userWallet}`);
    console.log(`Matches Owner: ${owner.toLowerCase() === userWallet.toLowerCase()}`);
    
    return {
      success: true,
      repoId,
      owner,
      userWallet,
      isOwner: owner.toLowerCase() === userWallet.toLowerCase(),
      cid,
      isPublic,
      issueIds: issueIds.map(id => Number(id))
    };
    
  } catch (error) {
    console.error('\n--- Error ---');
    console.error(`Error: ${error.message}`);
    
    if (error.message.includes('nonexistent') || error.message.includes('not found')) {
      console.log(`Repository ${repoId} is NOT registered on the blockchain`);
      return {
        success: false,
        error: 'Repository not registered',
        repoId,
        notFound: true
      };
    }
    
    return {
      success: false,
      error: error.message,
      repoId
    };
  }
}

// Run the diagnostic
const repoId = 1044183499;
checkRepositoryOwnership(repoId).then(result => {
  console.log('\n=== DIAGNOSTIC RESULT ===');
  console.log(JSON.stringify(result, null, 2));
  
  if (result.success) {
    if (result.isOwner) {
      console.log('\n✅ SOLUTION: You ARE the repository owner. The contract addresses might still be wrong somewhere.');
    } else {
      console.log(`\n❌ PROBLEM: Repository is owned by ${result.owner}, but you are ${result.userWallet}`);
      console.log('\n🚀 SOLUTIONS:');
      console.log('1. Switch to the wallet that owns the repository');
      console.log('2. Or re-list the repository with your current wallet');
      console.log('3. Or ask the repository owner to create the bounty');
    }
  } else if (result.notFound) {
    console.log('\n❌ PROBLEM: Repository is not registered on blockchain');
    console.log('\n🚀 SOLUTION: List the repository first in Creator Dashboard');
  } else {
    console.log('\n❌ PROBLEM: Unknown error occurred');
    console.log(`Error: ${result.error}`);
  }
  
  process.exit(0);
}).catch(err => {
  console.error('Diagnostic failed:', err);
  process.exit(1);
});