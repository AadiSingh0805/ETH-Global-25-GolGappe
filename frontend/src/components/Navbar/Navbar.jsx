import { useState } from 'react'
import './Navbar.css'

const Navbar = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen)
  }

  const handleSignOut = () => {
    // Add sign out logic here
    console.log('Signing out...')
    setIsDropdownOpen(false)
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-left">
          <div className="navbar-logo">
            <img src="/dog.png" alt="Logo" className="logo-icon" />
            <span className="app-name">GitBountys</span>
          </div>
        </div>
        <div className="navbar-right">
          <div className="navbar-links">
            <a href="#" className="nav-link">Browse</a>
            <a href="#" className="nav-link">Leaderboard</a>
          </div>
          <div className="profile-section">
            <div className="profile-dropdown" onClick={toggleDropdown}>
              <span className="username">john_dev</span>
              <svg 
                className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`} 
                width="16" 
                height="16" 
                fill="currentColor" 
                viewBox="0 0 24 24"
              >
                <path d="M7 10l5 5 5-5z"/>
              </svg>
            </div>
            
            {isDropdownOpen && (
              <div className="dropdown-menu">
                <div className="dropdown-header">
                  <div className="user-info">
                    <span className="display-name">john_dev</span>
                    <span className="user-level">Level 6 • 2,850 pts</span>
                  </div>
                </div>
                
                <div className="dropdown-divider"></div>
                
                <div className="dropdown-items">
                  <a href="#" className="dropdown-item">
                    <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <span>My Profile</span>
                  </a>
                  
                  <a href="#" className="dropdown-item">
                    <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.20.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.96.76 1.58V19z"/>
                    </svg>
                    <span>My Submissions</span>
                  </a>
                  
                  <a href="#" className="dropdown-item">
                    <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    <span>My Achievements</span>
                  </a>
                  
                  <a href="#" className="dropdown-item">
                    <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
                    </svg>
                    <span>Earnings</span>
                  </a>
                  
                  <div className="dropdown-divider"></div>
                  
                  <a href="#" className="dropdown-item">
                    <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
                    </svg>
                    <span>Settings</span>
                  </a>
                  
                  <a href="#" className="dropdown-item">
                    <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15h4v-2H10v2zm0-4h4v-6H10v6z"/>
                    </svg>
                    <span>Help & Support</span>
                  </a>
                </div>
                
                <div className="dropdown-divider"></div>
                
                <button className="dropdown-item sign-out" onClick={handleSignOut}>
                  <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                  </svg>
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Overlay to close dropdown when clicking outside */}
      {isDropdownOpen && (
        <div className="dropdown-overlay" onClick={() => setIsDropdownOpen(false)}></div>
      )}
    </nav>
  )
}

export default Navbar