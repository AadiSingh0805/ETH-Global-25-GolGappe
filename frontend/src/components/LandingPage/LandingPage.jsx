import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './LandingPage.css'

const LandingPage = () => {
  const navigate = useNavigate()

  const handleCreatorClick = () => {
    navigate('/creator/auth')
  }

  const handleContributorClick = () => {
    navigate('/contributor/auth')
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

        <div className="options-container">
          <div className="option-card creator-card" onClick={handleCreatorClick}>
            <div className="option-icon">
              <svg width="64" height="64" fill="#1DB954" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <h3 className="option-title">Organization</h3>
            <p className="option-description">
              Post bounties, manage repositories, and find talented contributors for your projects
            </p>
            <div className="option-features">
              <span className="feature-tag">Post Bounties</span>
              <span className="feature-tag">Manage Projects</span>
              <span className="feature-tag">Find Talent</span>
            </div>
          </div>

          <div className="option-card contributor-card" onClick={handleContributorClick}>
            <div className="option-icon">
              <svg width="64" height="64" fill="#1DB954" viewBox="0 0 24 24">
                <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zM4 18v-6h2.5l6 6H10l-2.5-2.5L4 18zm6.5-6.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5S9 9.17 9 10.5s.67 1.5 1.5 1.5zM12.5 11H11V5.5C11 4.67 11.67 4 12.5 4h3c.83 0 1.5.67 1.5 1.5V11h-1.5V6h-1v5h-2z"/>
              </svg>
            </div>
            <h3 className="option-title">Contributor</h3>
            <p className="option-description">
              Solve issues, earn bounties, and showcase your skills to top companies
            </p>
            <div className="option-features">
              <span className="feature-tag">Earn Bounties</span>
              <span className="feature-tag">Build Portfolio</span>
              <span className="feature-tag">Get Recognized</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LandingPage