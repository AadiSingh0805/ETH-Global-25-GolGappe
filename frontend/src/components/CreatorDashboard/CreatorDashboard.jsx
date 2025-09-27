import React, { useState, useEffect } from 'react';
import './CreatorDashboard.css';
import Navbar from '../Navbar/Navbar';
import RepoList from './RepoList';
import { repositoryAPI, blockchainAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const CreatorDashboard = () => {
  const [repositories, setRepositories] = useState([]);
  const [listedRepos, setListedRepos] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [selectedRepos, setSelectedRepos] = useState(new Set());
  const [error, setError] = useState(null);
  const { user } = useAuth();

  // Fetch user's repositories from GitHub
  const fetchRepositories = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await repositoryAPI.getUserRepos();
      
      if (response.success) {
        const reposWithBountyData = await Promise.all(
          response.repos.map(async (repo) => {
            try {
              // Try to get bounty information for this repository
              const bountyInfo = await repositoryAPI.getRepositoryBounties(repo.id);
              return {
                ...repo,
                bountyInfo: bountyInfo.success ? bountyInfo.projectPool : null
              };
            } catch (bountyError) {
              console.log(`No bounty info for repo ${repo.id}`);
              return {
                ...repo,
                bountyInfo: null
              };
            }
          })
        );
        
        setRepositories(reposWithBountyData);
      } else {
        setError(response.message || 'Failed to fetch repositories');
      }
    } catch (error) {
      console.error('Failed to fetch repositories:', error);
      setError(error.message || 'Failed to fetch repositories. Please ensure you have connected your GitHub account.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRepositories();
    }
  }, [user]);

  const handleRepoToggle = (repoId) => {
    const newSelected = new Set(selectedRepos);
    if (newSelected.has(repoId)) {
      newSelected.delete(repoId);
    } else {
      newSelected.add(repoId);
    }
    setSelectedRepos(newSelected);
  };

  const handleListSelected = async () => {
    try {
      setLoading(true);
      const selectedRepoIds = Array.from(selectedRepos);
      const listingPromises = selectedRepoIds.map(async (repoId) => {
        const repo = repositories.find(r => r.id === repoId);
        if (!repo) return null;

        try {
          // Upload repository metadata to Lighthouse
          const metadataResult = await blockchainAPI.uploadRepoMetadata({
            repoId: repo.id,
            name: repo.name,
            fullName: repo.fullName,
            description: repo.description,
            owner: repo.owner,
            stars: repo.stars,
            forks: repo.forks,
            language: repo.language,
            openIssues: repo.openIssues,
            htmlUrl: repo.htmlUrl,
            lastUpdated: repo.lastUpdated
          });

          if (metadataResult.success) {
            console.log(`Repository ${repo.name} metadata uploaded to IPFS:`, metadataResult.data.ipfsUrl);
            return repo.id;
          } else {
            console.error(`Failed to upload metadata for ${repo.name}:`, metadataResult.message);
            return null;
          }
        } catch (error) {
          console.error(`Error uploading metadata for ${repo.name}:`, error);
          return null;
        }
      });

      const results = await Promise.all(listingPromises);
      const successfullyListed = results.filter(id => id !== null);
      
      const newListed = new Set([...listedRepos, ...successfullyListed]);
      setListedRepos(newListed);
      setSelectedRepos(new Set());
      
      if (successfullyListed.length > 0) {
        alert(`${successfullyListed.length} repositories successfully listed with metadata stored in Filecoin!`);
      }
    } catch (error) {
      console.error('Error listing repositories:', error);
      alert('Failed to list some repositories. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleListAll = async () => {
    try {
      setLoading(true);
      const allRepoIds = repositories.map(repo => repo.id);
      
      // Upload metadata for all repositories
      const listingPromises = repositories.map(async (repo) => {
        try {
          const metadataResult = await blockchainAPI.uploadRepoMetadata({
            repoId: repo.id,
            name: repo.name,
            fullName: repo.fullName,
            description: repo.description,
            owner: repo.owner,
            stars: repo.stars,
            forks: repo.forks,
            language: repo.language,
            openIssues: repo.openIssues,
            htmlUrl: repo.htmlUrl,
            lastUpdated: repo.lastUpdated
          });

          if (metadataResult.success) {
            console.log(`Repository ${repo.name} metadata uploaded to IPFS:`, metadataResult.data.ipfsUrl);
            return repo.id;
          } else {
            console.error(`Failed to upload metadata for ${repo.name}:`, metadataResult.message);
            return null;
          }
        } catch (error) {
          console.error(`Error uploading metadata for ${repo.name}:`, error);
          return null;
        }
      });

      const results = await Promise.all(listingPromises);
      const successfullyListed = results.filter(id => id !== null);
      
      setListedRepos(new Set(successfullyListed));
      setSelectedRepos(new Set());
      
      if (successfullyListed.length > 0) {
        alert(`${successfullyListed.length} repositories successfully listed with metadata stored in Filecoin!`);
      }
    } catch (error) {
      console.error('Error listing all repositories:', error);
      alert('Failed to list repositories. Please try again.');
    } finally {
      setLoading(false);
    }
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
          {user?.username && (
            <p className="user-info">
              Welcome back, <strong>{user.username}</strong>!
            </p>
          )}
        </div>

        {error && (
          <div className="error-message">
            <p>⚠️ {error}</p>
            <button onClick={fetchRepositories} className="retry-btn">
              Try Again
            </button>
          </div>
        )}

        <div className="dashboard-content">
          <div className="actions-section">
            <div className="stats">
              <div className="stat-item">
                <span className="stat-label">Total Repositories:</span>
                <span className="stat-value">{repositories.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Listed:</span>
                <span className="stat-value">{listedRepos.size}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Selected:</span>
                <span className="stat-value">{selectedRepos.size}</span>
              </div>
            </div>
            
            <div className="bulk-actions">
              <button 
                className="action-btn primary"
                onClick={handleListSelected}
                disabled={selectedRepos.size === 0 || loading}
              >
                {loading ? 'Listing...' : `List Selected (${selectedRepos.size})`}
              </button>
              <button 
                className="action-btn secondary"
                onClick={handleListAll}
                disabled={repositories.length === 0 || loading}
              >
                {loading ? 'Listing...' : 'List All'}
              </button>
              <button 
                className="action-btn danger"
                onClick={handleRemoveAll}
                disabled={listedRepos.size === 0}
              >
                Remove All
              </button>
              <button 
                className="action-btn refresh"
                onClick={fetchRepositories}
                disabled={loading}
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          <RepoList 
            repositories={repositories}
            listedRepos={listedRepos}
            selectedRepos={selectedRepos}
            loading={loading}
            onRepoToggle={handleRepoToggle}
            error={error}
          />
        </div>
      </div>
    </div>
  );
};

export default CreatorDashboard;