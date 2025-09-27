import React, { useState } from 'react';

const RepoCard = ({ repo, isListed, isSelected, onToggle }) => {
  const [showIssues, setShowIssues] = useState(false);

  const handleCardClick = () => {
    if (!isListed) {
      onToggle();
    }
  };

  const handleViewIssues = (e) => {
    e.stopPropagation();
    setShowIssues(!showIssues);
  };

  const getLanguageColor = (language) => {
    const colors = {
      'JavaScript': '#f1e05a',
      'TypeScript': '#2b7489',
      'Python': '#3572A5',
      'Java': '#b07219',
      'Solidity': '#AA6746',
      'Go': '#00ADD8',
      'Rust': '#dea584',
      'C++': '#f34b7d'
    };
    return colors[language] || '#586069';
  };

  return (
    <div 
      className={`repo-card ${isListed ? 'listed' : ''} ${isSelected ? 'selected' : ''}`}
      onClick={handleCardClick}
    >
      <div className="repo-card-header">
        <div className="repo-title">
          <h3>{repo.name}</h3>
          {isListed && <span className="listed-badge">Listed</span>}
        </div>
        
        <div className="repo-actions">
          <input 
            type="checkbox" 
            checked={isSelected} 
            onChange={onToggle}
            disabled={isListed}
            className="repo-checkbox"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>

      <p className="repo-description">{repo.description}</p>

      <div className="repo-stats">
        <div className="stat-item">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/>
          </svg>
          <span>{repo.stars}</span>
        </div>

        <div className="stat-item">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M5 3.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm0 2.122a2.25 2.25 0 10-1.5 0v.878A2.25 2.25 0 005.75 8.5h1.5v2.128a2.25 2.25 0 101.5 0V8.5h1.5a2.25 2.25 0 002.25-2.25v-.878a2.25 2.25 0 10-1.5 0v.878a.75.75 0 01-.75.75h-4.5A.75.75 0 015 6.25v-.878z"/>
          </svg>
          <span>{repo.forks}</span>
        </div>

        <div className="stat-item">
          <div 
            className="language-dot" 
            style={{ backgroundColor: getLanguageColor(repo.language) }}
          ></div>
          <span>{repo.language}</span>
        </div>

        <div className="stat-item">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1.643 3.143L.427 1.927A.25.25 0 000 2.104V5.75c0 .138.112.25.25.25h3.646a.25.25 0 00.177-.427L2.715 4.215a6.5 6.5 0 11-1.18 4.458.75.75 0 10-1.493.154 8.001 8.001 0 101.6-5.684zM7.75 4a.75.75 0 01.75.75v2.992l2.028.812a.75.75 0 01-.557 1.392l-2.5-1A.75.75 0 017 8.25v-3.5A.75.75 0 017.75 4z"/>
          </svg>
          <span>{repo.commits}</span>
        </div>
      </div>

      <div className="repo-issues-stats">
        <div className="issue-stat">
          <span className="issue-count">{repo.issues}</span>
          <span className="issue-label">Issues</span>
        </div>
        <div className="issue-stat">
          <span className="issue-count">{repo.pullRequests}</span>
          <span className="issue-label">PRs</span>
        </div>
      </div>

      {isListed && (
        <div className="repo-actions-footer">
          <button 
            className="view-issues-btn"
            onClick={handleViewIssues}
          >
            {showIssues ? 'Hide Issues' : 'View Issues'}
          </button>
        </div>
      )}

      {showIssues && isListed && (
        <div className="issues-preview">
          <p>Issue management coming soon...</p>
        </div>
      )}
    </div>
  );
};

export default RepoCard;