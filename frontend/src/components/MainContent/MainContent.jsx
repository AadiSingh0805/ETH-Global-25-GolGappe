import './MainContent.css'

const MainContent = () => {
  const companies = [
    {
      id: 1,
      name: 'TechCorp',
      description: 'Leading fintech solutions for modern businesses',
      repoLink: 'https://github.com/techcorp/auth-service',
      activeIssues: 12,
      topBounties: [
        { title: 'Fix OAuth integration bug', amount: '$500' },
        { title: 'Add two-factor authentication', amount: '$350' },
        { title: 'Optimize login performance', amount: '$200' }
      ],
      category: 'Fintech'
    },
    {
      id: 2,
      name: 'StartupXYZ',
      description: 'Innovative e-commerce platform revolutionizing retail',
      repoLink: 'https://github.com/startupxyz/frontend',
      activeIssues: 8,
      topBounties: [
        { title: 'Implement dark mode', amount: '$300' },
        { title: 'Mobile checkout optimization', amount: '$250' },
        { title: 'Add product filters', amount: '$150' }
      ],
      category: 'E-commerce'
    },
    {
      id: 3,
      name: 'DataCorp',
      description: 'Big data analytics and machine learning solutions',
      repoLink: 'https://github.com/datacorp/user-service',
      activeIssues: 15,
      topBounties: [
        { title: 'Database query optimization', amount: '$750' },
        { title: 'Add data visualization', amount: '$400' },
        { title: 'Fix memory leak in analytics', amount: '$300' }
      ],
      category: 'Analytics'
    },
    {
      id: 4,
      name: 'OldTech',
      description: 'Modernizing legacy systems for enterprise clients',
      repoLink: 'https://github.com/oldtech/main-app',
      activeIssues: 23,
      topBounties: [
        { title: 'Migrate to TypeScript', amount: '$600' },
        { title: 'Update deprecated dependencies', amount: '$400' },
        { title: 'Add API documentation', amount: '$200' }
      ],
      category: 'Enterprise'
    },
    {
      id: 5,
      name: 'MobileFirst',
      description: 'Mobile-first development and responsive design experts',
      repoLink: 'https://github.com/mobilefirst/web-app',
      activeIssues: 6,
      topBounties: [
        { title: 'Responsive navigation menu', amount: '$250' },
        { title: 'Touch gesture support', amount: '$200' },
        { title: 'PWA implementation', amount: '$180' }
      ],
      category: 'Mobile'
    },
    {
      id: 6,
      name: 'CloudNative',
      description: 'Kubernetes and containerization specialists',
      repoLink: 'https://github.com/cloudnative/k8s-tools',
      activeIssues: 19,
      topBounties: [
        { title: 'Helm chart optimization', amount: '$800' },
        { title: 'Add monitoring dashboard', amount: '$500' },
        { title: 'Fix pod scaling issues', amount: '$350' }
      ],
      category: 'DevOps'
    }
  ]

  const getCategoryColor = (category) => {
    const colors = {
      'Fintech': '#1DB954',
      'E-commerce': '#ff6b6b',
      'Analytics': '#4ecdc4',
      'Enterprise': '#45b7d1',
      'Mobile': '#f9ca24',
      'DevOps': '#6c5ce7'
    }
    return colors[category] || '#1DB954'
  }

  const handleDonate = (companyName) => {
    alert(`Donate to ${companyName} - Feature coming soon!`)
  }

  return (
    <section className="main-content">
      <div className="main-content-container">
        <h2 className="section-title">Companies & Repositories</h2>
        <div className="companies-grid">
          {companies.map((company) => (
            <div key={company.id} className="company-card">
              <div className="company-header">
                <div className="company-info">
                  <div className="company-name-row">
                    <h3 className="company-name">{company.name}</h3>
                    <span 
                      className="category-badge"
                      style={{ backgroundColor: getCategoryColor(company.category) }}
                    >
                      {company.category}
                    </span>
                  </div>
                  <div className="active-issues-badge">
                    {company.activeIssues} active issues
                  </div>
                </div>
              </div>
              <p className="company-description">{company.description}</p>
              
              <div className="top-bounties">
                <h4 className="bounties-title">Top Bounties</h4>
                <div className="bounties-list">
                  {company.topBounties.map((bounty, index) => (
                    <div key={index} className="bounty-item">
                      <span className="bounty-title">{bounty.title}</span>
                      <span className="bounty-amount">{bounty.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="company-actions">
                <a href={company.repoLink} target="_blank" rel="noopener noreferrer" className="repo-link">
                  View Repository
                </a>
                <button 
                  className="donate-btn"
                  onClick={() => handleDonate(company.name)}
                >
                  Donate
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default MainContent