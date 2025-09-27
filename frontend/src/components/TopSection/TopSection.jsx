import './TopSection.css'

const TopSection = () => {
  const topContributors = [
    { id: 1, username: 'john_dev', points: 2850, rank: 1 },
    { id: 2, username: 'sarah_code', points: 2430, rank: 2 },
    { id: 3, username: 'mike_js', points: 2180, rank: 3 },
    { id: 4, username: 'alice_py', points: 1950, rank: 4 },
    { id: 5, username: 'bob_react', points: 1720, rank: 5 },
  ]

  const topBounties = [
    { id: 1, title: 'Fix authentication bug in login flow', company: 'TechCorp/auth-service', reward: '$500', priority: 'High' },
    { id: 2, title: 'Implement dark mode for dashboard', company: 'StartupXYZ/frontend', reward: '$300', priority: 'Medium' },
    { id: 3, title: 'Optimize database queries for user profile', company: 'DataCorp/user-service', reward: '$750', priority: 'High' },
    { id: 4, title: 'Add TypeScript support to legacy codebase', company: 'OldTech/main-app', reward: '$400', priority: 'Medium' },
    { id: 5, title: 'Create responsive mobile navigation', company: 'MobileFirst/web-app', reward: '$250', priority: 'Low' },
  ]

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return '#ff4757'
      case 'Medium': return '#ffa502'
      case 'Low': return '#1DB954'
      default: return '#e0e0e0'
    }
  }

  const getRankDisplay = (rank) => {
    if (rank <= 3) {
      return `#${rank}`
    }
    return `#${rank}`
  }

  return (
    <section className="top-section">
      <div className="top-section-container">
        <div className="top-contributors-card">
          <div className="card-header">
            <h2 className="card-title">Top Contributors</h2>
            <span className="card-subtitle">Leaderboard this month</span>
          </div>
          <div className="contributors-list">
            {topContributors.map((contributor, index) => (
              <div key={contributor.id} className={`contributor-item ${index < 3 ? 'top-three' : ''}`}>
                <div className="contributor-left">
                  <div className="contributor-rank">
                    <span className={`rank-number ${index < 3 ? 'top-rank' : ''}`}>
                      {getRankDisplay(contributor.rank)}
                    </span>
                  </div>
                  <div className="contributor-details">
                    <div className="contributor-username">{contributor.username}</div>
                    <div className="contributor-level">Level {Math.floor(contributor.points / 500) + 1}</div>
                  </div>
                </div>
                <div className="contributor-right">
                  <div className="contributor-points">{contributor.points.toLocaleString()}</div>
                  <div className="points-label">points</div>
                </div>
              </div>
            ))}
          </div>
          <div className="view-all">
            <a href="#" className="view-all-link">View Full Leaderboard →</a>
          </div>
        </div>

        <div className="top-bounties-card">
          <div className="card-header">
            <h2 className="card-title">Top Bounties</h2>
            <span className="card-subtitle">Highest rewards available</span>
          </div>
          <div className="bounties-list">
            {topBounties.map((bounty, index) => (
              <div key={bounty.id} className="bounty-item">
                <div className="bounty-main">
                  <div className="bounty-header">
                    <div className="bounty-title">{bounty.title}</div>
                    <span 
                      className="priority-badge" 
                      style={{ backgroundColor: getPriorityColor(bounty.priority) }}
                    >
                      {bounty.priority}
                    </span>
                  </div>
                  <div className="bounty-company">{bounty.company}</div>
                </div>
                <div className="bounty-reward">
                  <div className="reward-amount">{bounty.reward}</div>
                  <div className="reward-label">reward</div>
                </div>
              </div>
            ))}
          </div>
          <div className="view-all">
            <a href="#" className="view-all-link">Browse All Bounties →</a>
          </div>
        </div>
      </div>
    </section>
  )
}

export default TopSection