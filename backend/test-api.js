import fetch from 'node-fetch';
import { ethers } from 'ethers';

const BASE_URL = 'http://localhost:5000/api';

// Test configuration
const TEST_CONFIG = {
  privateKey: 'your-test-private-key-here', // Replace with actual test key
  testRepoId: 1,
  testIssueId: 1,
  testAmount: '0.1'
};

// Utility function to make API requests
async function apiCall(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
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

// Test functions
async function testReadOperations() {
  console.log('\n=== TESTING READ OPERATIONS ===');
  
  // Test blockchain endpoints
  await apiCall('/blockchain/repos');
  await apiCall('/blockchain/repos/1');
  await apiCall('/blockchain/issues/1/bounty');
  
  // Test escrow endpoints
  await apiCall('/escrow/projects/1/pool');
  await apiCall('/escrow/projects/1/issues/1/bounty');
  await apiCall('/escrow/owner');
  
  // Test analytics endpoints
  await apiCall('/analytics/repos');
  await apiCall('/analytics/repos/1/statistics');
  await apiCall('/analytics/network-info');
}

async function testWriteOperations() {
  console.log('\n=== TESTING WRITE OPERATIONS (requires valid private key) ===');
  
  if (!TEST_CONFIG.privateKey || TEST_CONFIG.privateKey === 'your-test-private-key-here') {
    console.log('Skipping write operations - no valid private key provided');
    return;
  }
  
  // Test repo registration
  await apiCall('/blockchain/repos', 'POST', {
    cid: 'QmTestCID123',
    isPublic: true,
    issueIds: [1, 2, 3],
    privateKey: TEST_CONFIG.privateKey
  });
  
  // Test bounty assignment
  await apiCall(`/blockchain/repos/${TEST_CONFIG.testRepoId}/issues/${TEST_CONFIG.testIssueId}/bounty`, 'POST', {
    bounty: TEST_CONFIG.testAmount,
    privateKey: TEST_CONFIG.privateKey
  });
  
  // Test donation
  await apiCall(`/escrow/projects/${TEST_CONFIG.testRepoId}/donate`, 'POST', {
    amount: TEST_CONFIG.testAmount,
    privateKey: TEST_CONFIG.privateKey
  });
}

async function testGasEstimation() {
  console.log('\n=== TESTING GAS ESTIMATION ===');
  
  await apiCall('/analytics/gas-estimate', 'POST', {
    operation: 'registerRepo',
    params: {
      cid: 'QmTestCID123',
      isPublic: true,
      issueIds: [1, 2, 3]
    }
  });
  
  await apiCall('/analytics/gas-estimate', 'POST', {
    operation: 'assignBounty',
    params: {
      repoId: 1,
      issueId: 1,
      bountyWei: ethers.parseEther('0.1').toString()
    }
  });
}

async function testEventFetching() {
  console.log('\n=== TESTING EVENT FETCHING ===');
  
  await apiCall('/analytics/events?fromBlock=earliest&toBlock=latest');
}

async function runAllTests() {
  console.log('🚀 Starting API Endpoint Tests...');
  console.log('Make sure your server is running on http://localhost:5000');
  
  // Test health endpoint first
  await apiCall('/health');
  
  // Run tests
  await testReadOperations();
  await testGasEstimation();
  await testEventFetching();
  await testWriteOperations();
  
  console.log('\n✅ All tests completed!');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { runAllTests, testReadOperations, testWriteOperations };