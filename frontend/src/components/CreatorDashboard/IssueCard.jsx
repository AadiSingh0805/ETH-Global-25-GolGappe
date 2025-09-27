import React, { useState } from 'react';

const IssueCard = ({ issue, onBountyUpdate }) => {
  const [isEditingBounty, setIsEditingBounty] = useState(false);
  const [bountyAmount, setBountyAmount] = useState(issue.bountyAmount);
  const [tempBountyAmount, setTempBountyAmount] = useState(issue.bountyAmount);

  const handleBountySave = () => {
    onBountyUpdate(issue.id, tempBountyAmount);
    setBountyAmount(tempBountyAmount);
    setIsEditingBounty(false);
  };

  const handleBountyCancel = () => {
    setTempBountyAmount(bountyAmount);
    setIsEditingBounty(false);
  };

  const getLabelColor = (label) => {
    const colors = {
      'bug': '#d73a49',
      'enhancement': '#a2eeef',
      'feature': '#0075ca',
      'documentation': '#0052cc',
      'good first issue': '#7057ff',
      'help wanted': '#008672',
      'high priority': '#b60205',
      'medium priority': '#fbca04',
      'low priority': '#0e8a16',
      'frontend': '#f9d0c4',
      'backend': '#c2e0c6',
      'authentication': '#d876e3'
    };
    return colors[label.toLowerCase()] || '#586069';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <div className="issue-card">
      <div className="issue-header">
        <div className="issue-title-section">
          <div className="issue-number">#{issue.number}</div>
          <h3 className="issue-title">{issue.title}</h3>
          {issue.hasBounty && (
            <div className="bounty-badge">
              ${issue.bountyAmount} USDC
            </div>
          )}
        </div>
        
        <div className="issue-meta">
          <span className="issue-author">by {issue.author}</span>
          <span className="issue-date">{formatDate(issue.createdAt)}</span>
          <div className="issue-comments">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2.75 2.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h2a.75.75 0 01.75.75v2.19l2.72-2.72a.75.75 0 01.53-.22h4.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25H2.75zM1 2.75C1 1.784 1.784 1 2.75 1h10.5C14.216 1 15 1.784 15 2.75v7.5A1.75 1.75 0 0113.25 12H9.06l-2.573 2.573A1.457 1.457 0 014 13.543V12H2.75A1.75 1.75 0 011 10.25v-7.5z"/>
            </svg>
            <span>{issue.comments}</span>
          </div>
        </div>
      </div>

      <div className="issue-body">
        <p>{issue.body}</p>
      </div>

      <div className="issue-labels">
        {issue.labels.map((label) => (
          <span 
            key={label}
            className="issue-label"
            style={{ backgroundColor: getLabelColor(label) }}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="issue-bounty-section">
        {isEditingBounty ? (
          <div className="bounty-edit">
            <div className="bounty-input-group">
              <span className="currency-symbol">$</span>
              <input
                type="number"
                value={tempBountyAmount}
                onChange={(e) => setTempBountyAmount(Number(e.target.value))}
                placeholder="0"
                min="0"
                step="1"
              />
              <span className="currency-label">USDC</span>
            </div>
            <div className="bounty-actions">
              <button className="save-btn" onClick={handleBountySave}>
                Save
              </button>
              <button className="cancel-btn" onClick={handleBountyCancel}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="bounty-display">
            <div className="bounty-info">
              {issue.hasBounty ? (
                <span className="current-bounty">Current Bounty: ${issue.bountyAmount} USDC</span>
              ) : (
                <span className="no-bounty">No bounty set</span>
              )}
            </div>
            <button 
              className="edit-bounty-btn"
              onClick={() => setIsEditingBounty(true)}
            >
              {issue.hasBounty ? 'Edit Bounty' : 'Set Bounty'}
            </button>
          </div>
        )}
      </div>

      <div className="issue-actions">
        <a 
          href={`https://github.com/user/repo/issues/${issue.number}`}
          target="_blank"
          rel="noopener noreferrer"
          className="view-github-btn"
        >
          View on GitHub
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3.75 2A1.75 1.75 0 002 3.75v8.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0014 12.25v-3.5a.75.75 0 00-1.5 0v3.5a.25.25 0 01-.25.25h-8.5a.25.25 0 01-.25-.25v-8.5a.25.25 0 01.25-.25h3.5a.75.75 0 000-1.5h-3.5z"/>
            <path d="M6.22 8.72a.75.75 0 001.06 1.06L10.94 6.22H9.25a.75.75 0 010-1.5h3.5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0V7.31L8.28 10.03a.75.75 0 01-1.06-1.06z"/>
          </svg>
        </a>
      </div>
    </div>
  );
};

export default IssueCard;