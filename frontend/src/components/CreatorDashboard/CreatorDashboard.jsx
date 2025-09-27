import React, { useState, useEffect } from 'react';
import './CreatorDashboard.css';
import Navbar from '../Navbar/Navbar';
import RepoList from './RepoList';

const CreatorDashboard = () => {
  const [repositories, setRepositories] = useState([]);
  const [listedRepos, setListedRepos] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [selectedRepos, setSelectedRepos] = useState(new Set());

  // Mock function to fetch repositories from GitHub API
  const fetchRepositories = async () => {
    setLoading(true);
    try {
      // Replace with actual GitHub API call
      const mockRepos = [
        {
          id: 1,
          name: 'awesome-project',
          description: 'A really awesome open source project that does amazing things',
          stars: 1234,
          forks: 567,
          language: 'JavaScript',
          commits: 892,
          issues: 15,
          pullRequests: 8,
          lastUpdated: '2025-01-15'
        },
        {
          id: 2,
          name: 'react-components',
          description: 'Reusable React components library',
          stars: 2345,
          forks: 890,
          language: 'TypeScript',
          commits: 1456,
          issues: 23,
          pullRequests: 12,
          lastUpdated: '2025-01-20'
        },
        {
          id: 3,
          name: 'blockchain-utils',
          description: 'Utility functions for blockchain development',
          stars: 678,
          forks: 234,
          language: 'Solidity',
          commits: 345,
          issues: 7,
          pullRequests: 3,
          lastUpdated: '2025-01-10'
        }
      ];
      
      setRepositories(mockRepos);
    } catch (error) {
      console.error('Failed to fetch repositories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepositories();
  }, []);

  const handleRepoToggle = (repoId) => {
    const newSelected = new Set(selectedRepos);
    if (newSelected.has(repoId)) {
      newSelected.delete(repoId);
    } else {
      newSelected.add(repoId);
    }
    setSelectedRepos(newSelected);
  };

  const handleListSelected = () => {
    const newListed = new Set([...listedRepos, ...selectedRepos]);
    setListedRepos(newListed);
    setSelectedRepos(new Set());
  };

  const handleListAll = () => {
    const allRepoIds = repositories.map(repo => repo.id);
    setListedRepos(new Set(allRepoIds));
    setSelectedRepos(new Set());
  };

  const handleRemoveAll = () => {
    setListedRepos(new Set());
    setSelectedRepos(new Set());
  };

  return (
    <div className="creator-dashboard">
      <Navbar />
      
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Repository Owner Dashboard</h1>
          <p>Manage your repositories and bounties</p>
        </div>

        <div className="dashboard-content">
          <div className="actions-section">
            <div className="bulk-actions">
              <button 
                className="action-btn primary"
                onClick={handleListSelected}
                disabled={selectedRepos.size === 0}
              >
                List Selected ({selectedRepos.size})
              </button>
              <button 
                className="action-btn secondary"
                onClick={handleListAll}
              >
                List All
              </button>
              <button 
                className="action-btn danger"
                onClick={handleRemoveAll}
              >
                Remove All
              </button>
            </div>
          </div>

          <RepoList 
            repositories={repositories}
            listedRepos={listedRepos}
            selectedRepos={selectedRepos}
            loading={loading}
            onRepoToggle={handleRepoToggle}
          />
        </div>
      </div>
    </div>
  );
};

export default CreatorDashboard;