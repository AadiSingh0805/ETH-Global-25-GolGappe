import { useNavigate } from 'react-router-dom'
import './AuthPage.css'

const AuthPage = () => {
  const navigate = useNavigate()

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <img src="/vite.svg" alt="GolGappe Logo" className="auth-logo" />
          <h1 className="auth-title">Choose Your Role</h1>
          <p className="auth-subtitle">
            Select how you want to participate in the GolGappe platform
          </p>
        </div>

        <div className="auth-form">
          <div className="connection-section">
            <button 
              className="connection-btn"
              onClick={() => navigate('/creator-dashboard')}
            >
              <div className="btn-icon">
                <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
                </svg>
              </div>
              <div className="btn-content">
                <span className="btn-title">Repository Owner</span>
                <span className="btn-subtitle">Post bounties and manage your projects</span>
              </div>
            </button>

            <button 
              className="connection-btn"
              onClick={() => navigate('/contributor-dashboard')}
            >
              <div className="btn-icon">
                <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <div className="btn-content">
                <span className="btn-title">Bounty Hunter</span>
                <span className="btn-subtitle">Find and solve issues to earn rewards</span>
              </div>
            </button>
          </div>

          <button 
            className="back-btn"
            onClick={() => navigate('/')}
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}

export default AuthPage