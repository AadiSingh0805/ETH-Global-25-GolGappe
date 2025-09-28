import React, { useState } from 'react';
import IssueList from './IssueList';

// Donate Modal Component
const DonateModal = ({ repo, onDonate, onClose }) => {
  const [amount, setAmount] = useState('');
  const [donating, setDonating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (parseFloat(amount) < 0.001) {
      setError('Minimum donation amount is 0.001 tFIL');
      return;
    }

    setDonating(true);
    try {
      await onDonate(amount);
    } catch (error) {
      setError(error.message);
    } finally {
      setDonating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="donate-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Donate to Project Pool</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="repo-info">
            <h4>{repo.name}</h4>
            <p>{repo.description}</p>
            {repo.bountyInfo && (
              <p className="current-pool">
                Current Pool: <strong>{repo.bountyInfo.balance || '0'} tFIL</strong>
              </p>
            )}
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="amount">Donation Amount (tFIL)</label>
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.1"
                step="0.001"
                min="0.001"
                required
              />
            </div>
            {error && (
              <div className="error-message" style={{ color: '#ff4444', marginBottom: '1rem', padding: '0.5rem', background: 'rgba(255, 68, 68, 0.1)', borderRadius: '4px' }}>
                {error}
              </div>
            )}
            <div className="modal-actions">
              <button type="button" onClick={onClose} className="btn-cancel">
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-donate" 
                disabled={donating}
              >
                {donating ? 'Donating...' : `Donate ${amount || '0'} tFIL`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const RepoCard = ({ repo, isListed, isSelected, onToggle, onLoadBountyInfo, onDonate }) => {
  const [showIssues, setShowIssues] = useState(false);
  const [loadingBountyInfo, setLoadingBountyInfo] = useState(false);
  const [showDonateModal, setShowDonateModal] = useState(false);

  const handleCardClick = () => {
    if (!isListed) {
      onToggle();
    }
  };

  const handleViewIssues = async (e) => {
    e.stopPropagation();
    
    // Load bounty information if not already loaded
    if (!repo.bountyInfo && onLoadBountyInfo && !loadingBountyInfo) {
      setLoadingBountyInfo(true);
      try {
        await onLoadBountyInfo(repo.id);
      } catch (error) {
        console.log('Failed to load bounty info:', error);
      } finally {
        setLoadingBountyInfo(false);
      }
    }
    
    setShowIssues(true);
  };

  const handleCloseIssues = () => {
    setShowIssues(false);
  };

  const handleDonate = (e) => {
    e.stopPropagation();
    setShowDonateModal(true);
  };

  const handleCloseDonateModal = () => {
    setShowDonateModal(false);
  };

  const handleDonateSubmit = (amount) => {
    if (onDonate) {
      onDonate(repo.id, amount);
    }
    setShowDonateModal(false);
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
      'C++': '#f34b7d',
      'HTML': '#e34c26',
      'CSS': '#1572B6',
      'C': '#555555',
      'C#': '#239120'
    };
    return colors[language] || '#586069';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatNumber = (num) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  return (
    <>
      <div 
        className={`repo-card ${isListed ? 'listed' : ''} ${isSelected ? 'selected' : ''}`}
        onClick={handleCardClick}
      >
        <div className="repo-card-header">
          <div className="repo-title">
            <h3 title={repo.fullName}>{repo.name}</h3>
            {isListed && <span className="listed-badge">Listed</span>}
            {repo.isPrivate && <span className="private-badge">Private</span>}
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

        <p className="repo-description" title={repo.description}>
          {repo.description || 'No description available'}
        </p>

        <div className="repo-stats">
          <div className="stat-item" title="Stars">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/>
            </svg>
            <span>{formatNumber(repo.stars)}</span>
          </div>

          <div className="stat-item" title="Forks">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M5 3.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm0 2.122a2.25 2.25 0 10-1.5 0v.878A2.25 2.25 0 005.75 8.5h1.5v2.128a2.25 2.25 0 101.5 0V8.5h1.5a2.25 2.25 0 002.25-2.25v-.878a2.25 2.25 0 10-1.5 0v.878a.75.75 0 01-.75.75h-4.5A.75.75 0 015 6.25v-.878z"/>
            </svg>
            <span>{formatNumber(repo.forks)}</span>
          </div>

          {repo.language && (
            <div className="stat-item" title={`Primary language: ${repo.language}`}>
              <div 
                className="language-dot" 
                style={{ backgroundColor: getLanguageColor(repo.language) }}
              ></div>
              <span>{repo.language}</span>
            </div>
          )}

          <div className="stat-item" title="Repository size">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2.5 3.5a.5.5 0 0 1 .5-.5h3.797a.5.5 0 0 1 .439.262L11 3h3a.5.5 0 0 1 .5.5v11a.5.5 0 0 1-.5.5H2.5a.5.5 0 0 1-.5-.5v-11z"/>
            </svg>
            <span>{formatNumber(repo.size)} KB</span>
          </div>
        </div>

        <div className="repo-issues-stats">
          <div className="issue-stat">
            <span className="issue-count">{repo.openIssues}</span>
            <span className="issue-label">Issues</span>
          </div>
          {loadingBountyInfo ? (
            <div className="issue-stat bounty-stat loading">
              <span className="issue-count">...</span>
              <span className="issue-label">Loading</span>
            </div>
          ) : repo.bountyInfo ? (
            <div className="issue-stat bounty-stat">
              <span className="issue-count">{repo.bountyInfo.balance} tFIL</span>
              <span className="issue-label">Pool</span>
            </div>
          ) : null}
        </div>

        <div className="repo-metadata">
          <div className="repo-meta-item">
            <span className="meta-label">Updated:</span>
            <span className="meta-value">{formatDate(repo.lastUpdated)}</span>
          </div>
          <div className="repo-links">
            <a 
              href={repo.htmlUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="github-link"
              onClick={(e) => e.stopPropagation()}
              title="View on GitHub"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
            </a>
          </div>
        </div>

        <div className="repo-actions-footer">
          <button 
            className="view-issues-btn"
            onClick={handleViewIssues}
          >
            Manage Issues & Bounties
          </button>
          {isListed && (
            <button 
              className="donate-btn"
              onClick={handleDonate}
              title="Donate to project pool"
            >
              💰 Donate
            </button>
          )}
        </div>
      </div>

      {showIssues && (
        <IssueList 
          repo={repo} 
          onClose={handleCloseIssues}
        />
      )}

      {showDonateModal && (
        <DonateModal
          repo={repo}
          onDonate={handleDonateSubmit}
          onClose={handleCloseDonateModal}
        />
      )}
    </>
  );
};

export default RepoCard;