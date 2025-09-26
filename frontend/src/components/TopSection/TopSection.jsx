import './TopSection.css'

const TopSection = () => {
  const topContributors = [
    { id: 1, username: 'john_dev', points: 2850, avatar: 'https://via.placeholder.com/40x40/1DB954/FFFFFF?text=J' },
    { id: 2, username: 'sarah_code', points: 2430, avatar: 'https://via.placeholder.com/40x40/1DB954/FFFFFF?text=S' },
    { id: 3, username: 'mike_js', points: 2180, avatar: 'https://via.placeholder.com/40x40/1DB954/FFFFFF?text=M' },
    { id: 4, username: 'alice_py', points: 1950, avatar: 'https://via.placeholder.com/40x40/1DB954/FFFFFF?text=A' },
    { id: 5, username: 'bob_react', points: 1720, avatar: 'https://via.placeholder.com/40x40/1DB954/FFFFFF?text=B' },
  ]

  const topBounties = [
    { id: 1, title: 'Fix authentication bug in login flow', company: 'TechCorp/auth-service', reward: '$500' },
    { id: 2, title: 'Implement dark mode for dashboard', company: 'StartupXYZ/frontend', reward: '$300' },
    { id: 3, title: 'Optimize database queries for user profile', company: 'DataCorp/user-service', reward: '$750' },
    { id: 4, title: 'Add TypeScript support to legacy codebase', company: 'OldTech/main-app', reward: '$400' },
    { id: 5, title: 'Create responsive mobile navigation', company: 'MobileFirst/web-app', reward: '$250' },
  ]

  return (
    <section className="top-section">
      <div className="top-section-container">
        <div className="top-contributors-card">
          <h2 className="card-title">Top Contributors</h2>
          <div className="contributors-list">
            {topContributors.map((contributor, index) => (
              <div key={contributor.id} className="contributor-item">
                <div className="contributor-rank">#{index + 1}</div>
                <img src={contributor.avatar} alt={contributor.username} className="contributor-avatar" />
                <div className="contributor-info">
                  <div className="contributor-username">{contributor.username}</div>
                  <div className="contributor-points">{contributor.points.toLocaleString()} points</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="top-bounties-card">
          <h2 className="card-title">Top Bounties</h2>
          <div className="bounties-list">
            {topBounties.map((bounty) => (
              <div key={bounty.id} className="bounty-item">
                <div className="bounty-info">
                  <div className="bounty-title">{bounty.title}</div>
                  <div className="bounty-company">{bounty.company}</div>
                </div>
                <div className="bounty-reward">{bounty.reward}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default TopSection