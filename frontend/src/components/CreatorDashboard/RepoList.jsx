import React from 'react';
import RepoCard from './RepoCard';

const RepoList = ({ 
  repositories, 
  listedRepos, 
  selectedRepos, 
  loading, 
  onRepoToggle 
}) => {
  if (loading) {
    return (
      <div className="repo-list-loading">
        <div className="loading-spinner"></div>
        <p>Fetching your repositories...</p>
      </div>
    );
  }

  if (repositories.length === 0) {
    return (
      <div className="repo-list-empty">
        <h3>No repositories found</h3>
        <p>Make sure your GitHub account has public repositories.</p>
      </div>
    );
  }

  return (
    <div className="repo-list">
      <div className="repo-list-header">
        <h3>Your Repositories ({repositories.length})</h3>
        <div className="repo-stats">
          <span className="stat">
            <span className="stat-number">{listedRepos.size}</span>
            <span className="stat-label">Listed</span>
          </span>
          <span className="stat">
            <span className="stat-number">{selectedRepos.size}</span>
            <span className="stat-label">Selected</span>
          </span>
        </div>
      </div>

      <div className="repo-grid">
        {repositories.map((repo) => (
          <RepoCard 
            key={repo.id}
            repo={repo}
            isListed={listedRepos.has(repo.id)}
            isSelected={selectedRepos.has(repo.id)}
            onToggle={() => onRepoToggle(repo.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default RepoList;