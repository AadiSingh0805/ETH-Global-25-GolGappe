import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './LandingPage.css'

const LandingPage = () => {
  const navigate = useNavigate()

  const handleGetStarted = () => {
    navigate('/auth')
  }

  return (
    <div className="landing-page">
      <div className="landing-container">
        <div className="landing-header">
          <img src="/vite.svg" alt="GolGappe Logo" className="landing-logo" />
          <h1 className="landing-title">GolGappe</h1>
          <p className="landing-subtitle">
            Connect developers with bounty opportunities and build the future together
          </p>
        </div>

        <div className="get-started-section">
          <button className="get-started-btn" onClick={handleGetStarted}>
            Get Started
          </button>
          <p className="get-started-description">
            Connect your MetaMask wallet and GitHub account to begin
          </p>
        </div>
      </div>
    </div>
  )
}

export default LandingPage