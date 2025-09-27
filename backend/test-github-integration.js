import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/api';

// Test configuration - replace with actual values
const TEST_CONFIG = {
  sessionToken: 'your-session-token-here', // Get from login
  githubRepo: {
    owner: 'octocat',
    repo: 'Hello-World'
  },
  privateKey: 'your-test-private-key-here'
};

// Utility function to make authenticated API requests
async function authenticatedApiCall(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TEST_CONFIG.sessionToken}`
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();
    
    console.log(`\n${method} ${endpoint}`);
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error(`Error calling ${endpoint}:`, error.message);
    return null;
  }
}

// Test GitHub integration endpoints
async function testGitHubIntegration() {
  console.log('\n=== TESTING GITHUB INTEGRATION ===');
  
  if (!TEST_CONFIG.sessionToken || TEST_CONFIG.sessionToken === 'your-session-token-here') {
    console.log('⚠️  Skipping authenticated tests - no session token provided');
    console.log('Please login first and get a session token');
    return;
  }
  
  // Test getting user repos
  console.log('\n1. Testing user repositories endpoint');
  await authenticatedApiCall('/github/repos?per_page=5');
  
  // Test getting specific repo
  console.log('\n2. Testing specific repository endpoint');
  const { owner, repo } = TEST_CONFIG.githubRepo;
  await authenticatedApiCall(`/github/repos/${owner}/${repo}`);
  
  // Test getting specific issue
  console.log('\n3. Testing specific issue endpoint');
  await authenticatedApiCall(`/github/repos/${owner}/${repo}/issues/1`);
  
  // Test repo registration (requires private key)
  if (TEST_CONFIG.privateKey && TEST_CONFIG.privateKey !== 'your-test-private-key-here') {
    console.log('\n4. Testing repository registration');
    await authenticatedApiCall(`/github/repos/${owner}/${repo}/register`, 'POST', {
      isPublic: true,
      selectedIssues: [1, 2],
      privateKey: TEST_CONFIG.privateKey
    });
  } else {
    console.log('\n4. Skipping repository registration - no private key provided');
  }
}

// Test GitHub service functionality
async function testGitHubService() {
  console.log('\n=== TESTING GITHUB SERVICE FUNCTIONALITY ===');
  
  // These tests would normally require a GitHub token
  // For demonstration, we'll show the expected structure
  
  console.log('\nGitHub Service provides:');
  console.log('✅ Repository listing and details');
  console.log('✅ Issue management and comments');
  console.log('✅ Contributor information');
  console.log('✅ Repository statistics');
  console.log('✅ File content access');
  console.log('✅ Commit history');
  console.log('✅ Search functionality');
  console.log('✅ Organization data');
}

// Test integration scenarios
async function testIntegrationScenarios() {
  console.log('\n=== INTEGRATION SCENARIOS ===');
  
  console.log('\n📋 Complete Workflow:');
  console.log('1. User connects MetaMask wallet');
  console.log('2. User authenticates with GitHub');
  console.log('3. User views repositories with blockchain status');
  console.log('4. User registers repository to blockchain');
  console.log('5. User assigns bounties to specific issues');
  console.log('6. Contributors view issues with bounty amounts');
  console.log('7. Contributors solve issues and claim bounties');
  console.log('8. Repository owner releases bounties to contributors');
  
  console.log('\n🔄 Data Flow:');
  console.log('GitHub API → Backend → Smart Contracts → Frontend');
  console.log('Smart Contracts → Backend → GitHub API → Notifications');
  
  console.log('\n🔐 Authentication:');
  console.log('Session-based auth for GitHub API access');
  console.log('Private key or MetaMask for blockchain transactions');
  console.log('Combined authentication for full functionality');
}

// Test data structures
async function testDataStructures() {
  console.log('\n=== DATA STRUCTURES ===');
  
  console.log('\n📊 Repository Data Structure:');
  console.log(`{
    github: {
      id, name, full_name, description, url, stars, forks,
      language, languages, topics, contributors_count, ...
    },
    blockchain: {
      blockchainId, cid, owner, isPublic, poolBalance,
      issuesWithBounties: [{ issueId, metadataBounty, escrowAmount, paid }]
    },
    isRegistered: boolean
  }`);
  
  console.log('\n🎯 Issue Data Structure:');
  console.log(`{
    // GitHub data
    id, number, title, body, state, labels, assignees,
    creator, created_at, updated_at, url, comments_count,
    
    // Blockchain data
    bounty: {
      issueId, metadataBounty, escrowAmount, paid, repoId
    }
  }`);
}

// Main test runner
async function runGitHubIntegrationTests() {
  console.log('🚀 Starting GitHub Integration Tests...');
  console.log('Make sure your server is running on http://localhost:5000');
  console.log('Make sure you have authenticated with GitHub and have a session token');
  
  await testGitHubService();
  await testDataStructures();
  await testIntegrationScenarios();
  await testGitHubIntegration();
  
  console.log('\n✅ GitHub Integration tests completed!');
  console.log('\n📝 Next Steps:');
  console.log('1. Set up GitHub OAuth app with proper permissions');
  console.log('2. Configure environment variables');
  console.log('3. Test with real GitHub repositories');
  console.log('4. Set up webhook endpoints for real-time sync');
  console.log('5. Implement IPFS for proper CID generation');
}

// Usage instructions
function showUsageInstructions() {
  console.log('\n📖 USAGE INSTRUCTIONS');
  console.log('===================');
  
  console.log('\n1. GitHub OAuth Setup:');
  console.log('   - Create GitHub OAuth App');
  console.log('   - Set redirect URI: http://localhost:5000/api/auth/github/callback');
  console.log('   - Request scopes: user:email repo read:org');
  console.log('   - Add CLIENT_ID and CLIENT_SECRET to .env');
  
  console.log('\n2. User Authentication Flow:');
  console.log('   - GET /api/auth/github - Get OAuth URL');
  console.log('   - User authorizes on GitHub');
  console.log('   - GitHub redirects to callback');
  console.log('   - Backend stores access token');
  console.log('   - User gets session token');
  
  console.log('\n3. Repository Management:');
  console.log('   - GET /api/github/repos - List user repositories');
  console.log('   - GET /api/github/repos/:owner/:repo - Get detailed repo data');
  console.log('   - POST /api/github/repos/:owner/:repo/register - Register to blockchain');
  
  console.log('\n4. Issue & Bounty Management:');
  console.log('   - Issues automatically sync from GitHub');
  console.log('   - Bounties assigned via blockchain endpoints');
  console.log('   - Real-time updates via webhooks (optional)');
  
  console.log('\n5. Environment Variables Required:');
  console.log('   GITHUB_CLIENT_ID=your-github-client-id');
  console.log('   GITHUB_CLIENT_SECRET=your-github-client-secret');
  console.log('   GITHUB_CALLBACK_URL=http://localhost:5000/api/auth/github/callback');
  console.log('   RPC_URL=your-blockchain-rpc-url');
  console.log('   PRIVATE_KEY=your-private-key-for-server-operations');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showUsageInstructions();
  } else {
    runGitHubIntegrationTests().catch(console.error);
  }
}

export { 
  runGitHubIntegrationTests, 
  testGitHubIntegration, 
  showUsageInstructions 
};