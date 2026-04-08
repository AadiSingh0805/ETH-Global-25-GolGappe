import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

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
  
  // Get already listed repositories from blockchain
  getListedRepositories: () => api.get('/repos/listed'),
  
  // Get specific repository with issues
  getRepository: (owner, repo) => api.get(`/repos/github/${owner}/${repo}`),
  
  // Get repository issues
  getRepositoryIssues: (owner, repo) => api.get(`/repos/github/${owner}/${repo}/issues`),
  
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

export default api;