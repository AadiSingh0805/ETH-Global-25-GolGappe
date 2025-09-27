// Simple test to check what repositories are on the blockchain
import bountyService from './services/bountyService.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkRepositories() {
  console.log('🔍 Checking repositories on blockchain...');
  
  
  try {
    const result = await bountyService.getListedRepositories();
    
    if (result.success) {
      console.log(`✅ Found ${result.total} repositories on blockchain:`);
      console.log('================================');
      
      result.data.forEach((repo, index) => {
        console.log(`${index + 1}. Blockchain ID: ${repo.blockchainId}`);
        console.log(`   GitHub ID: ${repo.githubId}`);
        console.log(`   Name: ${repo.name || 'Unknown'}`);
        console.log(`   Full Name: ${repo.fullName || 'Unknown'}`);
        console.log(`   Owner: ${repo.owner}`);
        console.log(`   CID: ${repo.cid}`);
        console.log(`   Has Metadata: ${!!repo.metadata}`);
        console.log('   ---');
      });
      
      console.log('\n🎯 Quick lookup table:');
      result.data.forEach(repo => {
        console.log(`GitHub ID ${repo.githubId} → Blockchain ID ${repo.blockchainId} (${repo.name || 'Unknown'})`);
      });
      
    } else {
      console.error('❌ Failed to fetch repositories:', result.error);
    }
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

checkRepositories().catch(console.error);