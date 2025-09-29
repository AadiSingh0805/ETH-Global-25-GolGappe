import { useState, useEffect } from 'react'
import { repositoryAPI } from '../../services/api'
import './TopSection.css'

const TopSection = () => {
  const [topContributors, setTopContributors] = useState([])
  const [topBounties, setTopBounties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        
        // For now, we'll fetch bounties from listed repositories
        // In the future, you could create dedicated endpoints for leaderboard data
        const reposResponse = await repositoryAPI.getListedRepositories()
        
        if (reposResponse.success) {
          const allBounties = []
          
          // Fetch bounties from all repositories
          for (const repo of reposResponse.listedRepos) {
            try {
              const bountyResponse = await repositoryAPI.getRepositoryBounties(repo.blockchainId)
              if (bountyResponse.success && bountyResponse.bounties) {
                const repoName = repo.metadata?.full_name || `${repo.owner}/${repo.name}`
                const formattedBounties = bountyResponse.bounties.map(bounty => ({
                  id: `${repo.blockchainId}-${bounty.issueId}`,
                  title: bounty.title || `Issue #${bounty.issueId}`,
                  company: repoName,
                  reward: bounty.amount ? `${bounty.amount} FIL` : '0 FIL',
                  priority: bounty.amount > 50 ? 'High' : bounty.amount > 20 ? 'Medium' : 'Low'
                }))
                allBounties.push(...formattedBounties)
              }
            } catch (error) {
              console.error(`Error fetching bounties for repo ${repo.blockchainId}:`, error)
            }
          }
          
          // Sort bounties by reward amount and take top 5
          const sortedBounties = allBounties
            .filter(bounty => bounty.reward !== '0 FIL')
            .sort((a, b) => {
              const amountA = parseFloat(a.reward.replace(' FIL', ''))
              const amountB = parseFloat(b.reward.replace(' FIL', ''))
              return amountB - amountA
            })
            .slice(0, 5)
          
          setTopBounties(sortedBounties)
        }
        
        // Since we don't have contributor data yet, show empty state
        setTopContributors([])
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        setError('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

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

  if (loading) {
    return (
      <section className="top-section">
        <div className="top-section-container">
          <div className="loading-message">Loading dashboard data...</div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="top-section">
        <div className="top-section-container">
          <div className="error-message">{error}</div>
        </div>
      </section>
    )
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
            {topContributors.length > 0 ? (
              topContributors.map((contributor, index) => (
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
              ))
            ) : (
              <div className="empty-state">
                <p>No contributor data available yet.</p>
                <p>Complete bounties to appear on the leaderboard!</p>
              </div>
            )}
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
            {topBounties.length > 0 ? (
              topBounties.map((bounty, index) => (
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
              ))
            ) : (
              <div className="empty-state">
                <p>No bounties available yet.</p>
                <p>Repository owners can create bounties for their issues!</p>
              </div>
            )}
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