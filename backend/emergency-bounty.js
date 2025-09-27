// Emergency fix: Create a temporary mapping for the repository
import bountyService from './services/bountyService.js';
import dotenv from 'dotenv';

dotenv.config();

async function createTempBounty() {
  console.log('🚨 Emergency bounty creation test...');
  
  // Since we know:
  // - Blockchain repository ID 1 exists
  // - GitHub repository 1044183499 is what you want to create bounty for
  // - The owner address matches (0x4cAd382572C51bF90a0402E00B7882D25a161ae0)
  
  // Let's manually create the bounty using blockchain repo ID 1
  const testBountyData = {
    repoId: 1, // Use blockchain repo ID directly instead of GitHub ID
    issueId: 1,
    amount: 0.001,
    description: 'Emergency test bounty creation',
    creator: {
      id: 'test-user',
      username: 'vedaXD',
      githubId: 123456
    }
  };
  
  try {
    console.log('🧪 Testing bounty creation with blockchain repo ID:', testBountyData);
    
    // Try admin override
    const result = await bountyService.createBounty(testBountyData, null, true);
    
    if (result.success) {
      console.log('✅ SUCCESS! Bounty created successfully');
      console.log('📋 Bounty details:', {
        blockchainRepoId: result.data.bounty.blockchainRepoId,
        githubRepoId: result.data.bounty.githubRepoId,
        metadataCID: result.data.metadataCID,
        assignTx: result.data.assignTransactionHash,
        fundTx: result.data.fundTransactionHash
      });
    } else {
      console.log('❌ FAILED:', result.error);
    }
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

createTempBounty().catch(console.error);