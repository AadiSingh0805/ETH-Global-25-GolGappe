import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for sessions
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    console.error('API Error:', error);
    if (error.response) {
      return Promise.reject(error.response.data);
    }
    return Promise.reject({ success: false, message: 'Network error' });
  }
);

// Repository API endpoints
export const repositoryAPI = {
  // Get user repositories from GitHub
  getUserRepos: () => api.get('/repos'),
  
  // Get specific repository with issues
  getRepository: (owner, repo) => api.get(`/repos/${owner}/${repo}`),
  
  // Get repository issues
  getRepositoryIssues: (owner, repo) => api.get(`/repos/${owner}/${repo}/issues`),
  
  // List repository (create metadata entry)
  listRepository: (repoData) => api.post('/repos', repoData),
  
  // Create bounty for issue
  createBounty: (repoId, issueId, bountyData) => 
    api.post(`/repos/${repoId}/issues/${issueId}/bounty`, bountyData),
  
  // Assign bounty to contributor
  assignBounty: (repoId, issueId, assignmentData) =>
    api.post(`/repos/${repoId}/issues/${issueId}/assign`, assignmentData),
  
  // Complete bounty and release payment
  completeBounty: (repoId, issueId, completionData) =>
    api.post(`/repos/${repoId}/issues/${issueId}/complete`, completionData),
  
  // Get bounty details by CID
  getBounty: (cid) => api.get(`/repos/bounty/${cid}`),
  
  // Get repository bounties info
  getRepositoryBounties: (repoId) => api.get(`/repos/${repoId}/bounties`)
};

// Blockchain API endpoints
export const blockchainAPI = {
  // Upload repository metadata to Lighthouse
  uploadRepoMetadata: (repoData) => api.post('/repos-blockchain/upload', { repoData }),
  
  // Get metadata by CID
  getMetadataByCID: (cid) => api.get(`/repos-blockchain/${cid}`),
  
  // Upload file to Lighthouse
  uploadFile: (fileData, fileName) => 
    api.post('/repos-blockchain/upload-file', { fileData, fileName })
};

// Escrow API endpoints  
export const escrowAPI = {
  // Get project pool balance
  getProjectPool: (repoId) => api.get(`/escrow/projects/${repoId}/pool`),
  
  // Donate to project pool
  donateToProject: (repoId, amount, privateKey) =>
    api.post(`/escrow/projects/${repoId}/donate`, { amount, privateKey }),
  
  // Get bounty details from blockchain
  getBountyDetails: (repoId, issueId) => 
    api.get(`/escrow/projects/${repoId}/issues/${issueId}/bounty`),
  
  // Fund bounty from project pool
  fundBounty: (repoId, issueId, amount, privateKey) =>
    api.post(`/escrow/projects/${repoId}/issues/${issueId}/fund`, { 
      amount, 
      privateKey 
    }),
  
  // Release bounty payment
  releaseBounty: (repoId, issueId, contributorAddress, privateKey) =>
    api.post(`/escrow/projects/${repoId}/issues/${issueId}/release`, {
      contributorAddress,
      privateKey
    })
};

export default api;