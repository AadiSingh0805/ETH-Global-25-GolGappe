import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import './App.css'
import LandingPage from './components/LandingPage/LandingPage'
import AuthPage from './components/AuthPage/AuthPage'
import RoleSelection from './components/RoleSelection/RoleSelection'
import CreatorDashboard from './components/CreatorDashboard/CreatorDashboard'
import ContributorDashboard from './components/ContributorDashboard/ContributorDashboard'
import BountyRedemption from './components/BountyRedemption/BountyRedemption'
import Navbar from './components/Navbar/Navbar'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Routes>
            {/* Landing page - public */}
            <Route path="/" element={<LandingPage />} />
            
            {/* Authentication page - handles MetaMask + GitHub */}
            <Route path="/auth" element={<AuthPage />} />
            
            {/* Role selection - after successful authentication */}
            <Route path="/role-selection" element={<RoleSelection />} />
            
            {/* Dashboard pages with navbar - protected */}
            <Route path="/creator/dashboard" element={
              <>
                <Navbar />
                <div className="app-content">
                  <CreatorDashboard />
                </div>
              </>
            } />
            
            <Route path="/contributor/dashboard" element={
              <>
                <Navbar />
                <div className="app-content">
                  <ContributorDashboard />
                </div>
              </>
            } />

            {/* Standalone bounty redemption page */}
            <Route path="/bounties/redeem" element={
              <>
                <Navbar />
                <div className="app-content">
                  <BountyRedemption />
                </div>
              </>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
