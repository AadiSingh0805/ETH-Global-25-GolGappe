import TopSection from '../TopSection/TopSection'
import MainContent from '../MainContent/MainContent'
import './ContributorDashboard.css'

const ContributorDashboard = () => {
  return (
    <div className="contributor-dashboard">
      <div className="dashboard-header">
        <div className="header-container">
          <h1 className="dashboard-title">Contributor Dashboard</h1>
          <p className="dashboard-subtitle">Discover bounties and showcase your skills</p>
        </div>
      </div>
      <TopSection />
      <MainContent />
    </div>
  )
}

export default ContributorDashboard