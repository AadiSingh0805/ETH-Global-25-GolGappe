import React from 'react';
import RepoCard from './RepoCard';

const RepoList = ({ 
  repositories, 
  listedRepos, 
  selectedRepos, 
  loading, 
  onRepoToggle,
  error 
}) => {
  if (loading) {
    return (
      <div className="repo-list-loading">
        <div className="loading-spinner"></div>
        <p>Fetching your repositories...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="repo-list-error">
        <h3>Unable to load repositories</h3>
        <p>{error}</p>
        <div className="error-suggestions">
          <h4>Possible solutions:</h4>
          <ul>
            <li>Make sure you're signed in to your GitHub account</li>
            <li>Check if your GitHub account is properly connected</li>
            <li>Ensure you have repositories in your GitHub account</li>
            <li>Try refreshing the page</li>
          </ul>
        </div>
      </div>
    );
  }

  if (repositories.length === 0) {
    return (
      <div className="repo-list-empty">
        <h3>No repositories found</h3>
        <p>Make sure your GitHub account has repositories and is properly connected.</p>
        <div className="empty-state-actions">
          <a 
            href="https://github.com/new" 
            target="_blank" 
            rel="noopener noreferrer"
            className="create-repo-btn"
          >
            Create a Repository on GitHub
          </a>
        </div>
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
          <span className="stat">
            <span className="stat-number">
              {repositories.reduce((sum, repo) => sum + repo.openIssues, 0)}
            </span>
            <span className="stat-label">Open Issues</span>
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