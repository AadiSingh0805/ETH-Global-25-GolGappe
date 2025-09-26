import './Navbar.css'

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-left">
          <div className="navbar-logo">
            <img src="/vite.svg" alt="Logo" className="logo-icon" />
            <span className="app-name">GolGappe</span>
          </div>
        </div>
        <div className="navbar-right">
          <div className="navbar-links">
            <a href="#" className="nav-link">Browse</a>
            <a href="#" className="nav-link">Leaderboard</a>
          </div>
          <div className="profile-section">
            <div className="profile-avatar">
              <img src="https://via.placeholder.com/32x32/1DB954/FFFFFF?text=U" alt="Profile" />
            </div>
            <span className="username">Username</span>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar