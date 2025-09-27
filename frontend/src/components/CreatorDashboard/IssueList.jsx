import React, { useState } from 'react';
import IssueCard from './IssueCard';

const IssueList = ({ repo, onClose }) => {
  const [issues, setIssues] = useState([
    {
      id: 1,
      number: 42,
      title: 'Add dark mode toggle functionality',
      body: 'Users have requested the ability to toggle between light and dark themes. This should be persistent across sessions.',
      labels: ['enhancement', 'good first issue', 'frontend'],
      state: 'open',
      createdAt: '2025-01-20T10:30:00Z',
      author: 'user123',
      comments: 3,
      bountyAmount: 0,
      hasBounty: false
    },
    {
      id: 2,
      number: 38,
      title: 'Fix memory leak in data processing module',
      body: 'There appears to be a memory leak when processing large datasets. This needs investigation and fixing.',
      labels: ['bug', 'high priority', 'backend'],
      state: 'open',
      createdAt: '2025-01-18T14:20:00Z',
      author: 'developer456',
      comments: 7,
      bountyAmount: 150,
      hasBounty: true
    },
    {
      id: 3,
      number: 35,
      title: 'Implement OAuth integration',
      body: 'Add support for Google and GitHub OAuth login to improve user experience.',
      labels: ['feature', 'authentication', 'medium priority'],
      state: 'open',
      createdAt: '2025-01-15T09:45:00Z',
      author: 'contributor789',
      comments: 12,
      bountyAmount: 300,
      hasBounty: true
    },
    {
      id: 4,
      number: 29,
      title: 'Update documentation for API endpoints',
      body: 'The API documentation is outdated and needs to be updated with the latest endpoints and examples.',
      labels: ['documentation', 'good first issue'],
      state: 'open',
      createdAt: '2025-01-12T16:10:00Z',
      author: 'docwriter',
      comments: 2,
      bountyAmount: 0,
      hasBounty: false
    }
  ]);

  const [filterBy, setFilterBy] = useState('all'); // 'all', 'bounty', 'no-bounty'
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'bounty-high', 'bounty-low'

  const handleBountyUpdate = (issueId, bountyAmount) => {
    setIssues(prevIssues =>
      prevIssues.map(issue =>
        issue.id === issueId
          ? { ...issue, bountyAmount, hasBounty: bountyAmount > 0 }
          : issue
      )
    );
  };

  const filteredIssues = issues.filter(issue => {
    if (filterBy === 'bounty') return issue.hasBounty;
    if (filterBy === 'no-bounty') return !issue.hasBounty;
    return true;
  });

  const sortedIssues = [...filteredIssues].sort((a, b) => {
    switch (sortBy) {
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

  return (
    <div className="issue-list-overlay">
      <div className="issue-list-modal">
        <div className="issue-list-header">
          <div className="header-title">
            <h2>{repo.name} - Issues & Bounties</h2>
            <p>{issues.length} total issues • {issues.filter(i => i.hasBounty).length} with bounties</p>
          </div>
          <button className="close-btn" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <div className="issue-controls">
          <div className="filter-controls">
            <label>Filter by:</label>
            <select value={filterBy} onChange={(e) => setFilterBy(e.target.value)}>
              <option value="all">All Issues</option>
              <option value="bounty">With Bounty</option>
              <option value="no-bounty">No Bounty</option>
            </select>
          </div>
          
          <div className="sort-controls">
            <label>Sort by:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="bounty-high">Highest Bounty</option>
              <option value="bounty-low">Lowest Bounty</option>
            </select>
          </div>
        </div>

        <div className="issues-container">
          {sortedIssues.length === 0 ? (
            <div className="no-issues">
              <p>No issues match the current filter.</p>
            </div>
          ) : (
            sortedIssues.map(issue => (
              <IssueCard
                key={issue.id}
                issue={issue}
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