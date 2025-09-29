import React, { useState, useEffect } from 'react';
import './CreatorDashboard.css';
import Navbar from '../Navbar/Navbar';
import RepoList from './RepoList';
import { repositoryAPI, blockchainAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import web3Service from '../../services/web3Service';

const CreatorDashboard = () => {
  const [repositories, setRepositories] = useState([]);
  const [listedRepos, setListedRepos] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [selectedRepos, setSelectedRepos] = useState(new Set());
  const [error, setError] = useState(null);
  const { user } = useAuth();

  // Fetch user's repositories from GitHub
  const fetchRepositories = async () => {
    console.log('📥 Fetching GitHub repositories...');
    setLoading(true);
    setError(null);
    try {
      const response = await repositoryAPI.getUserRepos();
      console.log('📊 GitHub repositories API response:', response);
      
      if (response.success) {
        const repos = response.repos.map(repo => ({
          ...repo,
          bountyInfo: null // Will be loaded on demand
        }));
        
        setRepositories(repos);
        console.log(`✅ Fetched ${repos.length} GitHub repositories:`, repos.map(r => ({
          id: r.id, 
          name: r.name, 
          fullName: r.fullName
        })));
      } else {
        setError(response.message || 'Failed to fetch repositories');
        console.error('❌ Failed to fetch GitHub repositories:', response);
      }
    } catch (error) {
      console.error('💥 Failed to fetch repositories:', error);
      setError(error.message || 'Failed to fetch repositories. Please ensure you have connected your GitHub account.');
    } finally {
      setLoading(false);
    }
  };

  // Load bounty information for a specific repository
  const loadBountyInfo = async (repoId) => {
    try {
      // Use Web3 service to get project pool balance directly from blockchain
      const poolInfo = await web3Service.getProjectPool(repoId);
      
      if (poolInfo.success) {
        const bountyInfo = {
          balance: poolInfo.balance,
          balanceWei: poolInfo.balanceWei
        };
        
        setRepositories(prev => prev.map(repo => 
          repo.id === repoId 
            ? { ...repo, bountyInfo }
            : repo
        ));
        
        return bountyInfo;
      }
    } catch (error) {
      console.log(`No bounty info available for repository ${repoId}:`, error);
    }
    return null;
  };

  // Check for already listed repositories from blockchain
  const checkAlreadyListedRepos = async () => {
    console.log('🔍 Checking for already listed repositories...');
    try {
      const response = await repositoryAPI.getListedRepositories();
      console.log('📊 Listed repositories API response:', response);
      
      if (response.success && response.listedRepos) {
        console.log(`📦 Found ${response.listedRepos.length} repositories on blockchain:`, response.listedRepos);
        
        // Filter out repos without githubId and convert to Set
        const validRepos = response.listedRepos.filter(repo => {
          const hasGithubId = repo.githubId && !isNaN(parseInt(repo.githubId));
          if (!hasGithubId) {
            console.log(`⚠️ Skipping repo without valid GitHub ID:`, repo);
          }
          return hasGithubId;
        });
        
        const listedRepoIds = new Set(validRepos.map(repo => parseInt(repo.githubId)));
        setListedRepos(listedRepoIds);
        
        console.log(`✅ Auto-detected ${listedRepoIds.size} already listed repositories from blockchain`);
        console.log('🔢 Listed repository IDs:', Array.from(listedRepoIds));
        
        if (validRepos.length > 0) {
          console.log('📋 Valid repositories with GitHub IDs:', validRepos.map(repo => ({
            blockchainId: repo.blockchainId,
            githubId: repo.githubId,
            name: repo.name,
            owner: repo.owner
          })));
        }
      } else {
        console.log('❌ Failed to fetch listed repositories:', response);
      }
    } catch (error) {
      console.error('💥 Failed to fetch already listed repositories:', error);
      // Don't show error to user as this is a background check
    }
  };

  useEffect(() => {
    if (user) {
      console.log('🚀 User authenticated, starting data fetch...');
      fetchRepositories();
      checkAlreadyListedRepos(); // Auto-detect already listed repos
    }
  }, [user]);

  // Debug: Show matching between GitHub and blockchain repos
  useEffect(() => {
    if (repositories.length > 0 && listedRepos.size > 0) {
      console.log('🔗 MATCHING ANALYSIS:');
      console.log('📁 GitHub Repositories:', repositories.map(r => `${r.id} (${r.name})`));
      console.log('⛓️ Blockchain Repository IDs:', Array.from(listedRepos));
      
      const matches = repositories.filter(repo => listedRepos.has(repo.id));
      console.log(`✅ Found ${matches.length} matches:`, matches.map(r => `${r.id} (${r.name})`));
      
      const unmatched = repositories.filter(repo => !listedRepos.has(repo.id));
      if (unmatched.length > 0) {
        console.log(`❌ ${unmatched.length} unmatched repositories:`, unmatched.map(r => `${r.id} (${r.name})`));
      }
    }
  }, [repositories, listedRepos]);

  const handleDonate = async (repoId, amount) => {
    try {
      if (!amount || parseFloat(amount) <= 0) {
        alert('Please enter a valid donation amount');
        return;
      }

      console.log(`Starting donation: ${amount} ETH to repo ${repoId}`);
      
      // Use Web3 service for MetaMask-based donation
      const result = await web3Service.donateToProject(repoId, parseFloat(amount));
      
      console.log('Donation result:', result);
      
      if (result.success) {
        alert(`Successfully donated ${amount} tFIL to project!\n\nTransaction Hash: ${result.transactionHash}\nBlock Number: ${result.blockNumber}`);
        // Refresh bounty info for this repo
        await loadBountyInfo(repoId);
      } else {
        alert(`Donation failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Donation error:', error);
      alert(`Donation failed: ${error.message}`);
    }
  };

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
          console.log(`🔗 Registering repository ${repo.name} on blockchain...`);
          
          // Use the repositoryAPI.listRepository to register on blockchain
          const registrationResult = await repositoryAPI.listRepository({
            repoId: repo.id,
            name: repo.name,
            description: repo.description,
            fullName: repo.fullName,
            html_url: repo.htmlUrl,
            language: repo.language,
            open_issues_count: repo.openIssues,
            stargazers_count: repo.stars,
            forks_count: repo.forks
          });

          if (registrationResult.success) {
            console.log(`✅ Repository ${repo.name} registered successfully:`, registrationResult);
            
            // Show detailed success message
            if (registrationResult.blockchain?.transactionHash) {
              console.log(`🎉 Blockchain registration successful for ${repo.name}:`, {
                transactionHash: registrationResult.blockchain.transactionHash,
                cid: registrationResult.filecoin?.cid
              });
            }
            
            return repo.id;
          } else {
            console.error(`❌ Failed to register ${repo.name}:`, registrationResult.message);
            alert(`Failed to register repository ${repo.name}: ${registrationResult.message}`);
            return null;
          }
        } catch (error) {
          console.error(`💥 Error registering ${repo.name}:`, error);
          alert(`Error registering repository ${repo.name}: ${error.message}`);
          return null;
        }
      });

      const results = await Promise.all(listingPromises);
      const successfullyListed = results.filter(id => id !== null);
      
      const newListed = new Set([...listedRepos, ...successfullyListed]);
      setListedRepos(newListed);
      setSelectedRepos(new Set());
      
      if (successfullyListed.length > 0) {
        alert(`🎉 ${successfullyListed.length} repositories successfully registered on blockchain and metadata stored in Filecoin!`);
      } else {
        alert('⚠️ No repositories were successfully registered. Please check console for details.');
      }
    } catch (error) {
      console.error('💥 Error listing repositories:', error);
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
            onLoadBountyInfo={loadBountyInfo}
            onDonate={handleDonate}
            error={error}
          />
        </div>
      </div>
    </div>
  );
};

export default CreatorDashboard;