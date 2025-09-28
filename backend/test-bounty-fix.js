import BountyService from './services/bountyService.js';

// Test the bounty creation fix
async function testBountyCreation() {
  console.log('🧪 Testing bounty creation fix...');
  
  const bountyService = new BountyService();
  
  // Test data - GitHub repo ID that should exist on blockchain
  const testBountyData = {
    repoId: 1044183499, // GitHub repo ID
    issueId: 1,
    amount: 0.001,
    description: 'Test bounty creation with fixed repo ID mapping',
    creator: {
      id: 'test-user',
      username: 'testuser',
      githubId: 123456
    }
  };
  
  try {
    console.log('📋 Testing bounty data:', testBountyData);
    
    // First, let's check if we can find listed repositories
    console.log('🔍 Fetching listed repositories...');
    const listedRepos = await bountyService.getListedRepositories();
    
    if (listedRepos.success) {
      console.log(`✅ Found ${listedRepos.total} listed repositories:`);
      listedRepos.data.forEach((repo, index) => {
        console.log(`  ${index + 1}. Blockchain ID: ${repo.blockchainId}, GitHub ID: ${repo.githubId}, Name: ${repo.name}`);
      });
      
      // Check if our test repo exists
      const matchingRepo = listedRepos.data.find(repo => repo.githubId === testBountyData.repoId);
      if (matchingRepo) {
        console.log(`✅ Found matching repository! Blockchain ID: ${matchingRepo.blockchainId}`);
      } else {
        console.log(`❌ Repository with GitHub ID ${testBountyData.repoId} not found on blockchain`);
        console.log('Available GitHub IDs:', listedRepos.data.map(r => r.githubId));
      }
    } else {
      console.error('❌ Failed to fetch listed repositories:', listedRepos.error);
    }
    
    // Test bounty creation (this should now work with proper repo mapping)
    console.log('\n🚀 Testing bounty creation...');
    const result = await bountyService.createBounty(testBountyData, null, true);
    
    if (result.success) {
      console.log('✅ Bounty creation test PASSED!');
      console.log('Result:', {
        githubRepoId: result.data.bounty.githubRepoId,
        blockchainRepoId: result.data.bounty.blockchainRepoId,
        metadataCID: result.data.metadataCID,
        transactionHashes: {
          assign: result.data.assignTransactionHash,
          fund: result.data.fundTransactionHash
        }
      });
    } else {
      console.log('❌ Bounty creation test FAILED:', result.error);
    }
    
  } catch (error) {
    console.error('💥 Test error:', error);
  }
}

// Run the test
testBountyCreation().catch(console.error);