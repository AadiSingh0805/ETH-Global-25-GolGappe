import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import './RoleSelection.css'

const RoleSelection = () => {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/auth')
    }
  }, [isAuthenticated, user, navigate])

  // Don't render anything while redirecting
  if (!isAuthenticated || !user) {
    return <div>Loading...</div>
  }

  const handleCreatorClick = () => {
    navigate('/creator/dashboard')
  }

  const handleContributorClick = () => {
    navigate('/contributor/dashboard')
  }

  return (
    <div className="role-selection-page">
      <div className="role-selection-container">
        <div className="role-selection-header">
          <img src="/vite.svg" alt="GolGappe Logo" className="role-selection-logo" />
          <h1 className="role-selection-title">Welcome to GolGappe</h1>
          <p className="role-selection-subtitle">
            Hi {user.name || user.username}! Choose your role to get started
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
            <h3 className="option-title">Developer</h3>
            <p className="option-description">
              Browse bounties, contribute to projects, and earn rewards for your skills
            </p>
            <div className="option-features">
              <span className="feature-tag">Browse Bounties</span>
              <span className="feature-tag">Contribute Code</span>
              <span className="feature-tag">Earn Rewards</span>
            </div>
          </div>
        </div>

        <div className="user-info">
          <p>Connected as: {user.name || user.username}</p>
          <p>GitHub: ✅ Connected | MetaMask: ✅ Connected</p>
        </div>
      </div>
    </div>
  )
}

export default RoleSelection