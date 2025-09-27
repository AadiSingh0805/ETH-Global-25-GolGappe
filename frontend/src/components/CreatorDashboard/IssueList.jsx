import React, { useState, useEffect } from 'react';
import IssueCard from './IssueCard';
import { repositoryAPI } from '../../services/api';

const IssueList = ({ repo, onClose }) => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchIssues();
  }, [repo]);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Extract owner and repo name from fullName or use owner object
      const owner = repo.owner?.login || repo.fullName?.split('/')[0];
      const repoName = repo.name;
      
      if (!owner || !repoName) {
        throw new Error('Invalid repository information');
      }

      const response = await repositoryAPI.getRepositoryIssues(owner, repoName);
      
      if (response.success) {
        setIssues(response.issues.map(issue => ({
          ...issue,
          bountyAmount: 0,
          hasBounty: false,
          bountyStatus: 'none'
        })));
      } else {
        setError(response.message || 'Failed to fetch issues');
      }
    } catch (error) {
      console.error('Failed to fetch issues:', error);
      setError(error.message || 'Failed to fetch repository issues');
    } finally {
      setLoading(false);
    }
  };

  const handleBountyUpdate = (issueId, bountyAmount, metadataCID) => {
    setIssues(prevIssues =>
      prevIssues.map(issue =>
        issue.id === issueId
          ? { 
              ...issue, 
              bountyAmount, 
              hasBounty: bountyAmount > 0,
              bountyStatus: bountyAmount > 0 ? 'active' : 'none',
              metadataCID: metadataCID
            }
          : issue
      )
    );
  };

  const getFilteredAndSortedIssues = () => {
    let filtered = issues;

    // Apply filter
    if (filter === 'bounty') {
      filtered = issues.filter(issue => issue.hasBounty);
    } else if (filter === 'no-bounty') {
      filtered = issues.filter(issue => !issue.hasBounty);
    }

    // Apply sort
    return [...filtered].sort((a, b) => {
      switch (filter) {
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'bounty-high':
          return b.bountyAmount - a.bountyAmount;
        case 'bounty-low':
          return a.bountyAmount - b.bountyAmount;
        default: // newest
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });
  };

  if (loading) {
    return (
      <div className="issue-list-overlay">
        <div className="issue-list-modal">
          <div className="issue-list-header">
            <div className="header-title">
              <h2>{repo.name} - Issues & Bounties</h2>
            </div>
            <button className="close-btn" onClick={onClose}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading issues...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="issue-list-overlay">
        <div className="issue-list-modal">
          <div className="issue-list-header">
            <div className="header-title">
              <h2>{repo.name} - Issues & Bounties</h2>
            </div>
            <button className="close-btn" onClick={onClose}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
          <div className="error-container">
            <p>⚠️ {error}</p>
            <button onClick={fetchIssues} className="retry-btn">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredAndSortedIssues = getFilteredAndSortedIssues();

  return (
    <div className="issue-list-overlay">
      <div className="issue-list-modal">
        <div className="issue-list-header">
          <div className="header-title">
            <h2>{repo.name} - Issues & Bounties</h2>
            <p>
              {issues.length} total issues • {issues.filter(i => i.hasBounty).length} with bounties
            </p>
            <div className="repo-link">
              <a 
                href={repo.htmlUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="github-link"
              >
                View on GitHub
              </a>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <div className="issue-controls">
          <div className="filter-controls">
            <label>Filter:</label>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All Issues</option>
              <option value="bounty">With Bounty</option>
              <option value="no-bounty">No Bounty</option>
            </select>
          </div>
          
          <div className="sort-controls">
            <label>Sort:</label>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="bounty-high">Highest Bounty</option>
              <option value="bounty-low">Lowest Bounty</option>
            </select>
          </div>

          <button onClick={fetchIssues} className="refresh-issues-btn">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 3a5 5 0 104.546 2.914.5.5 0 00-.908-.417A4 4 0 118 4v1z"/>
              <path d="M8 4.466V.534a.25.25 0 01.41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 018 4.466z"/>
            </svg>
            Refresh
          </button>
        </div>

        <div className="issues-container">
          {filteredAndSortedIssues.length === 0 ? (
            <div className="no-issues">
              {issues.length === 0 ? (
                <p>No issues found in this repository.</p>
              ) : (
                <p>No issues match the current filter.</p>
              )}
            </div>
          ) : (
            filteredAndSortedIssues.map(issue => (
              <IssueCard
                key={issue.id}
                issue={issue}
                repo={repo}
                onBountyUpdate={handleBountyUpdate}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default IssueList;