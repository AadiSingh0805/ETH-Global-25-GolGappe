import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import './App.css'
import LandingPage from './components/LandingPage/LandingPage'
import AuthPage from './components/AuthPage/AuthPage_new'
import CreatorDashboard from './components/CreatorDashboard/CreatorDashboard'
import ContributorDashboard from './components/ContributorDashboard/ContributorDashboard'
import Navbar from './components/Navbar/Navbar'

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          {/* Landing page without navbar */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Auth pages without navbar */}
          <Route path="/:userType/auth" element={<AuthPage />} />
          
          {/* Dashboard pages with navbar */}
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
        </Routes>
      </div>
    </Router>
  )
}

export default App
