import { useState, useEffect } from 'react'
import { repositoryAPI } from '../../services/api'
import './MainContent.css'

const MainContent = () => {
  const [repositories, setRepositories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchRepositories = async () => {
      try {
        setLoading(true)
        const response = await repositoryAPI.getListedRepositories()
        
        if (response.success) {
          // Transform the API response to match the component structure
          const transformedRepos = response.listedRepos.map(repo => ({
            id: repo.blockchainId,
            name: repo.metadata?.name || repo.name || 'Unknown Repository',
            description: repo.metadata?.description || 'No description available',
            repoLink: repo.metadata?.html_url || `https://github.com/${repo.owner}/${repo.name}`,
            activeIssues: repo.metadata?.open_issues_count || 0,
            topBounties: [], // Will be populated with actual bounty data
            category: repo.metadata?.language || 'Other',
            owner: repo.owner
          }))
          
          // Fetch bounties for each repository
          const reposWithBounties = await Promise.all(
            transformedRepos.map(async (repo) => {
              try {
                const bountyResponse = await repositoryAPI.getRepositoryBounties(repo.id)
                if (bountyResponse.success && bountyResponse.bounties) {
                  repo.topBounties = bountyResponse.bounties.slice(0, 3).map(bounty => ({
                    title: bounty.title || `Issue #${bounty.issueId}`,
                    amount: bounty.amount ? `${bounty.amount} FIL` : '0 FIL',
                    currency: bounty.currency || 'FIL'
                  }))
                }
              } catch (error) {
                console.error(`Error fetching bounties for repo ${repo.id}:`, error)
              }
              return repo
            })
          )
          
          setRepositories(reposWithBounties)
        }
      } catch (error) {
        console.error('Error fetching repositories:', error)
        setError('Failed to load repositories')
      } finally {
        setLoading(false)
      }
    }

    fetchRepositories()
  }, [])

  const getCategoryColor = (category) => {
    const colors = {
      'JavaScript': '#f39c12',
      'TypeScript': '#3498db',
      'Python': '#e74c3c',
      'Java': '#e67e22',
      'Go': '#1abc9c',
      'Rust': '#9b59b6',
      'C++': '#34495e',
      'C#': '#8e44ad',
      'PHP': '#3498db',
      'Ruby': '#e74c3c',
      'Other': '#95a5a6'
    }
    return colors[category] || '#95a5a6'
  }

  if (loading) {
    return (
      <section className="main-content">
        <div className="main-content-container">
          <h2 className="section-title">Companies & Repositories</h2>
          <div className="loading-message">Loading repositories...</div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="main-content">
        <div className="main-content-container">
          <h2 className="section-title">Companies & Repositories</h2>
          <div className="error-message">{error}</div>
        </div>
      </section>
    )
  }

  if (repositories.length === 0) {
    return (
      <section className="main-content">
        <div className="main-content-container">
          <h2 className="section-title">Companies & Repositories</h2>
          <div className="empty-state">
            <p>No repositories with bounties found.</p>
            <p>Be the first to create a bounty!</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="main-content">
      <div className="main-content-container">
        <h2 className="section-title">Companies & Repositories</h2>
        <div className="companies-grid">
          {repositories.map((repo) => (
            <div key={repo.id} className="company-card">
              <div className="company-header">
                <div className="company-info">
                  <div className="company-name-row">
                    <h3 className="company-name">{repo.name}</h3>
                    <span 
                      className="category-badge"
                      style={{ backgroundColor: getCategoryColor(repo.category) }}
                    >
                      {repo.category}
                    </span>
                  </div>
                  <div className="active-issues-badge">
                    {repo.activeIssues} active issues
                  </div>
                </div>
              </div>
              <p className="company-description">{repo.description}</p>
              
              <div className="top-bounties">
                <h4 className="bounties-title">Top Bounties</h4>
                <div className="bounties-list">
                  {repo.topBounties.length > 0 ? (
                    repo.topBounties.map((bounty, index) => (
                      <div key={index} className="bounty-item">
                        <span className="bounty-title">{bounty.title}</span>
                        <span className="bounty-amount">{bounty.amount}</span>
                      </div>
                    ))
                  ) : (
                    <div className="no-bounties">No active bounties</div>
                  )}
                </div>
              </div>
              
              <div className="company-actions">
                <a href={repo.repoLink} target="_blank" rel="noopener noreferrer" className="repo-link">
                  View Repository
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default MainContent