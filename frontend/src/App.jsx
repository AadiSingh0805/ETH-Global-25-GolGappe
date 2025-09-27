import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import './App.css'
import Navbar from './components/Navbar/Navbar'
import TopSection from './components/TopSection/TopSection'
import MainContent from './components/MainContent/MainContent'
import LandingPage from './components/LandingPage/LandingPage'
import AuthPage from './components/AuthPage/AuthPage_new'
import CreatorDashboard from './components/CreatorDashboard/CreatorDashboard'
import ContributorDashboard from './components/ContributorDashboard/ContributorDashboard'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Navbar />
          <div className="app-content">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/:userType/auth" element={<AuthPage />} />
              <Route path="/creator/dashboard" element={<CreatorDashboard />} />
              <Route path="/contributor/dashboard" element={<ContributorDashboard />} />
            </Routes>
          </div>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
