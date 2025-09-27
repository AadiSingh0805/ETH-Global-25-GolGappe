import React, { useState } from 'react';
import { repositoryAPI } from '../../services/api';

const IssueCard = ({ issue, repo, onBountyUpdate }) => {
  const [showBountyForm, setShowBountyForm] = useState(false);
  const [bountyAmount, setBountyAmount] = useState('');
  const [bountyDescription, setBountyDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [requirements, setRequirements] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCreateBounty = async (e) => {
    e.preventDefault();
    
    if (!bountyAmount || parseFloat(bountyAmount) <= 0) {
      setError('Please enter a valid bounty amount');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const bountyData = {
        amount: parseFloat(bountyAmount),
        description: bountyDescription.trim(),
        deadline: deadline || null,
        requirements: requirements.trim() ? requirements.trim().split('\n').filter(req => req.trim()) : []
      };

      const response = await repositoryAPI.createBounty(repo.id, issue.number, bountyData);

      if (response.success) {
        // Update the issue with bounty information
        onBountyUpdate(issue.id, bountyData.amount, response.metadataCID);
        
        setShowBountyForm(false);
        setBountyAmount('');
        setBountyDescription('');
        setDeadline('');
        setRequirements('');
        
        alert(`Bounty created successfully! Metadata stored in Filecoin: ${response.ipfsUrl}`);
      } else {
        setError(response.message || 'Failed to create bounty');
      }
    } catch (error) {
      console.error('Error creating bounty:', error);
      setError(error.message || 'Failed to create bounty');
    } finally {
      setLoading(false);
    }
  };

  const getLabelColor = (label) => {
    return `#${label.color}` || '#586069';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const truncateText = (text, maxLength = 200) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="issue-card">
      <div className="issue-header">
        <div className="issue-title-section">
          <div className="issue-number">#{issue.number}</div>
          <h3 className="issue-title">
            <a 
              href={issue.htmlUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="issue-link"
            >
              {issue.title}
            </a>
          </h3>
          
          <div className="issue-meta">
            <span className="issue-author">
              Opened by <strong>{issue.user?.login}</strong>
            </span>
            <span className="issue-date">
              on {formatDate(issue.createdAt)}
            </span>
            {issue.updatedAt !== issue.createdAt && (
              <span className="issue-updated">
                • Updated {formatDate(issue.updatedAt)}
              </span>
            )}
          </div>
        </div>

        <div className="issue-status">
          {issue.hasBounty ? (
            <div className="bounty-status active">
              <span className="bounty-amount">{issue.bountyAmount} ETH</span>
              <span className="bounty-label">Bounty Active</span>
            </div>
          ) : (
            <div className="bounty-status inactive">
              <span className="bounty-label">No Bounty</span>
            </div>
          )}
        </div>
      </div>

      {issue.body && (
        <div className="issue-body">
          <p>{truncateText(issue.body)}</p>
        </div>
      )}

      <div className="issue-labels">
        {issue.labels && issue.labels.map(label => (
          <span 
            key={label.id} 
            className="issue-label"
            style={{ backgroundColor: getLabelColor(label) }}
            title={label.description}
          >
            {label.name}
          </span>
        ))}
      </div>

      <div className="issue-stats">
        <div className="stat-item">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1.75 1A1.75 1.75 0 000 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0016 13.25V2.75A1.75 1.75 0 0014.25 1H1.75zM1.5 2.75a.25.25 0 01.25-.25h12.5a.25.25 0 01.25.25v10.5a.25.25 0 01-.25.25H1.75a.25.25 0 01-.25-.25V2.75z"/>
          </svg>
          <span>{issue.comments} comments</span>
        </div>

        {issue.assignees && issue.assignees.length > 0 && (
          <div className="stat-item">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M10.5 5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zm.061 3.073a4 4 0 10-5.123 0 6.004 6.004 0 00-3.431 5.142.75.75 0 001.498.07 4.5 4.5 0 018.99 0 .75.75 0 101.498-.07 6.005 6.005 0 00-3.432-5.142z"/>
            </svg>
            <span>Assigned to {issue.assignees[0].login}</span>
          </div>
        )}
      </div>

      <div className="issue-actions">
        {!issue.hasBounty ? (
          <button 
            className="create-bounty-btn"
            onClick={() => setShowBountyForm(true)}
            disabled={loading}
          >
            Create Bounty
          </button>
        ) : (
          <div className="bounty-info">
            <span className="bounty-active">✓ Bounty Created</span>
            {issue.metadataCID && (
              <a 
                href={`https://gateway.lighthouse.storage/ipfs/${issue.metadataCID}`}
                target="_blank"
                rel="noopener noreferrer"
                className="view-metadata-btn"
                title="View bounty metadata on IPFS"
              >
                View on IPFS
              </a>
            )}
          </div>
        )}
      </div>

      {showBountyForm && (
        <div className="bounty-form-overlay">
          <div className="bounty-form">
            <div className="bounty-form-header">
              <h4>Create Bounty for Issue #{issue.number}</h4>
              <button 
                className="close-form-btn"
                onClick={() => setShowBountyForm(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateBounty}>
              <div className="form-group">
                <label htmlFor="amount">Bounty Amount (ETH) *</label>
                <input
                  type="number"
                  id="amount"
                  value={bountyAmount}
                  onChange={(e) => setBountyAmount(e.target.value)}
                  step="0.001"
                  min="0.001"
                  required
                  placeholder="0.1"
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Bounty Description</label>
                <textarea
                  id="description"
                  value={bountyDescription}
                  onChange={(e) => setBountyDescription(e.target.value)}
                  placeholder="Additional details about the bounty..."
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label htmlFor="deadline">Deadline (Optional)</label>
                <input
                  type="date"
                  id="deadline"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="form-group">
                <label htmlFor="requirements">Requirements (Optional)</label>
                <textarea
                  id="requirements"
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="List requirements, one per line..."
                  rows="3"
                />
              </div>

              {error && (
                <div className="error-message">
                  <p>⚠️ {error}</p>
                </div>
              )}

              <div className="form-actions">
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => setShowBountyForm(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="create-btn"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Bounty'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default IssueCard;