import './CreatorDashboard.css'

const CreatorDashboard = () => {
  return (
    <div className="creator-dashboard">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Creator Dashboard</h1>
          <p className="dashboard-subtitle">Manage your bounties and projects</p>
        </div>
        
        <div className="dashboard-content">
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="64" height="64" fill="#1DB954" viewBox="0 0 24 24">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
            </div>
            <h3>Welcome to your Creator Dashboard!</h3>
            <p>Your dashboard is being prepared. Soon you'll be able to:</p>
            <ul className="feature-list">
              <li>Create and manage bounties</li>
              <li>Track project progress</li>
              <li>Review contributor submissions</li>
              <li>Manage payments and rewards</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreatorDashboard