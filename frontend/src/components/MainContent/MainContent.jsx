import './MainContent.css'

const MainContent = () => {
  const companies = [
    {
      id: 1,
      name: 'TechCorp',
      description: 'Leading fintech solutions for modern businesses',
      logo: 'https://via.placeholder.com/60x60/1DB954/FFFFFF?text=TC',
      repoLink: 'https://github.com/techcorp/auth-service',
      activeIssues: 12,
      topBounties: [
        { title: 'Fix OAuth integration bug', amount: '$500' },
        { title: 'Add two-factor authentication', amount: '$350' },
        { title: 'Optimize login performance', amount: '$200' }
      ]
    },
    {
      id: 2,
      name: 'StartupXYZ',
      description: 'Innovative e-commerce platform revolutionizing retail',
      logo: 'https://via.placeholder.com/60x60/1DB954/FFFFFF?text=SX',
      repoLink: 'https://github.com/startupxyz/frontend',
      activeIssues: 8,
      topBounties: [
        { title: 'Implement dark mode', amount: '$300' },
        { title: 'Mobile checkout optimization', amount: '$250' },
        { title: 'Add product filters', amount: '$150' }
      ]
    },
    {
      id: 3,
      name: 'DataCorp',
      description: 'Big data analytics and machine learning solutions',
      logo: 'https://via.placeholder.com/60x60/1DB954/FFFFFF?text=DC',
      repoLink: 'https://github.com/datacorp/user-service',
      activeIssues: 15,
      topBounties: [
        { title: 'Database query optimization', amount: '$750' },
        { title: 'Add data visualization', amount: '$400' },
        { title: 'Fix memory leak in analytics', amount: '$300' }
      ]
    },
    {
      id: 4,
      name: 'OldTech',
      description: 'Modernizing legacy systems for enterprise clients',
      logo: 'https://via.placeholder.com/60x60/1DB954/FFFFFF?text=OT',
      repoLink: 'https://github.com/oldtech/main-app',
      activeIssues: 23,
      topBounties: [
        { title: 'Migrate to TypeScript', amount: '$600' },
        { title: 'Update deprecated dependencies', amount: '$400' },
        { title: 'Add API documentation', amount: '$200' }
      ]
    },
    {
      id: 5,
      name: 'MobileFirst',
      description: 'Mobile-first development and responsive design experts',
      logo: 'https://via.placeholder.com/60x60/1DB954/FFFFFF?text=MF',
      repoLink: 'https://github.com/mobilefirst/web-app',
      activeIssues: 6,
      topBounties: [
        { title: 'Responsive navigation menu', amount: '$250' },
        { title: 'Touch gesture support', amount: '$200' },
        { title: 'PWA implementation', amount: '$180' }
      ]
    },
    {
      id: 6,
      name: 'CloudNative',
      description: 'Kubernetes and containerization specialists',
      logo: 'https://via.placeholder.com/60x60/1DB954/FFFFFF?text=CN',
      repoLink: 'https://github.com/cloudnative/k8s-tools',
      activeIssues: 19,
      topBounties: [
        { title: 'Helm chart optimization', amount: '$800' },
        { title: 'Add monitoring dashboard', amount: '$500' },
        { title: 'Fix pod scaling issues', amount: '$350' }
      ]
    },
    {
      id: 7,
      name: 'DevSecOps',
      description: 'Security-first development practices and tools',
      logo: 'https://via.placeholder.com/60x60/1DB954/FFFFFF?text=DS',
      repoLink: 'https://github.com/devsecops/security-toolkit',
      activeIssues: 11,
      topBounties: [
        { title: 'Implement security scanning', amount: '$450' },
        { title: 'Add vulnerability reporting', amount: '$300' },
        { title: 'Fix CSRF protection', amount: '$250' }
      ]
    },
    {
      id: 8,
      name: 'OpenSource',
      description: 'Building the future with collaborative development',
      logo: 'https://via.placeholder.com/60x60/1DB954/FFFFFF?text=OS',
      repoLink: 'https://github.com/opensource/community-tools',
      activeIssues: 27,
      topBounties: [
        { title: 'Community contributor system', amount: '$900' },
        { title: 'Add project templates', amount: '$400' },
        { title: 'Improve documentation site', amount: '$300' }
      ]
    }
  ]

  return (
    <section className="main-content">
      <div className="main-content-container">
        <h2 className="section-title">Companies & Repositories</h2>
        <div className="companies-grid">
          {companies.map((company) => (
            <div key={company.id} className="company-card">
              <div className="company-header">
                <img src={company.logo} alt={`${company.name} logo`} className="company-logo" />
                <div className="company-info">
                  <h3 className="company-name">{company.name}</h3>
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
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default MainContent