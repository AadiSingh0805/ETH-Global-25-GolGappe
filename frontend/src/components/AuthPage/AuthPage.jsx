import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import './AuthPage.css'

const AuthPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { githubLogin, metamaskLogin, user, isAuthenticated, checkAuth } = useAuth()
  
  const [githubConnected, setGithubConnected] = useState(false)
  const [metamaskConnected, setMetamaskConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Check if user is already authenticated and redirect to role selection
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate('/role-selection')
    }
  }, [isAuthenticated, user, navigate])

  // Check for authentication success/error from URL params
  useEffect(() => {
    const authParam = searchParams.get('auth')
    const errorParam = searchParams.get('error')
    
    if (authParam === 'github_success' || authParam === 'success') {
      console.log('GitHub auth detected, refreshing user data...');
      // Refresh user data after GitHub auth - this should populate user data
      checkAuth().then(() => {
        console.log('User data refreshed after GitHub auth');
      });
    }
    
    if (errorParam) {
      setError(`Authentication error: ${errorParam}`)
    }
  }, [searchParams, checkAuth])

  // Update connection states based on user data
  useEffect(() => {
    if (user) {
      const hasGithub = user.hasGithub || user.github?.id;
      const hasWallet = user.hasWallet || user.wallet?.address;
      
      console.log('User data updated:', { user, hasGithub, hasWallet });
      
      setGithubConnected(hasGithub);
      setMetamaskConnected(hasWallet);
      
      // If both are connected, redirect to role selection
      if (hasGithub && hasWallet) {
        console.log('Both connections detected, redirecting to role selection');
        navigate('/role-selection');
      }
    } else {
      console.log('No user data available');
    }
  }, [user, navigate])

  const handleMetamaskConnect = async () => {
    try {
      setLoading(true)
      setError('')
      await metamaskLogin()
      setMetamaskConnected(true)
      
      // Automatically trigger GitHub login after MetaMask success
      console.log('MetaMask connected successfully, starting GitHub authorization...')
      await githubLogin()
      
    } catch (error) {
      console.error('MetaMask connection failed:', error)
      setError(error.message || 'Failed to connect MetaMask')
    } finally {
      setLoading(false)
    }
  }

  const handleGithubConnect = async () => {
    // Only allow GitHub connection after MetaMask is connected
    if (!metamaskConnected) {
      setError('Please connect MetaMask first')
      return
    }
    
    try {
      setLoading(true)
      setError('')
      await githubLogin()
    } catch (error) {
      console.error('GitHub connection failed:', error)
      setError(error.message || 'Failed to connect GitHub')
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = () => {
    if (githubConnected && metamaskConnected) {
      navigate('/role-selection')
    }
  }

  const canContinue = githubConnected && metamaskConnected

  // Debug logging
  console.log('Debug - Auth Status:', {
    user,
    isAuthenticated,
    githubConnected,
    metamaskConnected,
    canContinue,
    userHasGithub: user?.hasGithub,
    userHasWallet: user?.hasWallet,
    userGithubId: user?.github?.id,
    userWalletAddress: user?.wallet?.address
  })

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <img src="/vite.svg" alt="GolGappe Logo" className="auth-logo" />
          <h1 className="auth-title">Welcome to GolGappe</h1>
          <p className="auth-subtitle">
            Connect your wallet first, then authorize with GitHub
          </p>
        </div>

        {error && (
          <div className="error-message" style={{ 
            padding: '12px', 
            marginBottom: '20px', 
            backgroundColor: '#fee', 
            color: '#c33', 
            borderRadius: '8px',
            border: '1px solid #fcc'
          }}>
            {error}
          </div>
        )}

        <div className="auth-form">
          <div className="connection-section">
            {/* MetaMask button first */}
            <button 
              className={`connection-btn ${metamaskConnected ? 'connected' : ''}`}
              onClick={handleMetamaskConnect}
              disabled={metamaskConnected || loading}
            >
              <div className="btn-icon">
                <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.46 12.65l-9.75-7.11c-.44-.32-1.05-.32-1.49 0L1.47 12.65c-.59.43-.59 1.27 0 1.7l9.75 7.11c.44.32 1.05.32 1.49 0l9.75-7.11c.59-.43.59-1.27 0-1.7zM12 2.5l8.5 6.2-8.5 6.2-8.5-6.2L12 2.5z"/>
                </svg>
              </div>
              <div className="btn-content">
                <span className="btn-title">
                  {metamaskConnected ? 'MetaMask Connected' : '1. Connect MetaMask'}
                </span>
                <span className="btn-subtitle">
                  {metamaskConnected ? 'Successfully connected to your wallet' : 'Connect your wallet for payments'}
                </span>
              </div>
              {metamaskConnected && (
                <div className="success-icon">
                  <svg width="20" height="20" fill="#1DB954" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                </div>
              )}
            </button>

            {/* GitHub button second - disabled until MetaMask is connected */}
            <button 
              className={`connection-btn ${githubConnected ? 'connected' : ''} ${!metamaskConnected ? 'disabled' : ''}`}
              onClick={handleGithubConnect}
              disabled={!metamaskConnected || githubConnected || loading}
            >
              <div className="btn-icon">
                <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </div>
              <div className="btn-content">
                <span className="btn-title">
                  {githubConnected ? 'GitHub Connected' : '2. Authorize with GitHub'}
                </span>
                <span className="btn-subtitle">
                  {githubConnected ? 'Successfully connected to your GitHub account' : 
                   !metamaskConnected ? 'Connect MetaMask first' : 'Connect to access your repositories'}
                </span>
              </div>
              {githubConnected && (
                <div className="success-icon">
                  <svg width="20" height="20" fill="#1DB954" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                </div>
              )}
            </button>
          </div>

          <button 
            className={`continue-btn ${canContinue ? 'enabled' : 'disabled'}`}
            onClick={() => navigate('/role-selection')}
            disabled={!canContinue || loading}
          >
            {loading ? 'Connecting...' : 'Continue to Role Selection'}
          </button>

          {/* Temporary debug button - remove this later */}
          <button 
            className="debug-btn"
            onClick={() => {
              console.log('Force navigate to role selection');
              navigate('/role-selection');
            }}
            style={{ 
              marginTop: '10px', 
              backgroundColor: '#ff6b6b', 
              color: 'white', 
              border: 'none', 
              padding: '8px 16px', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            [DEBUG] Force Continue
          </button>

          {/* Refresh user data button */}
          <button 
            className="refresh-btn"
            onClick={async () => {
              console.log('Refreshing user data...');
              await checkAuth();
            }}
            style={{ 
              marginTop: '10px', 
              backgroundColor: '#1DB954', 
              color: 'white', 
              border: 'none', 
              padding: '8px 16px', 
              borderRadius: '4px',
              cursor: 'pointer',
              marginLeft: '10px'
            }}
          >
            Refresh User Data
          </button>

          {/* Debug info display */}
          <div style={{ 
            marginTop: '20px', 
            padding: '10px', 
            backgroundColor: '#2a2a2a', 
            borderRadius: '4px', 
            fontSize: '12px',
            fontFamily: 'monospace',
            color: '#fff'
          }}>
            <div>GitHub Connected: {String(githubConnected)}</div>
            <div>MetaMask Connected: {String(metamaskConnected)}</div>
            <div>Can Continue: {String(canContinue)}</div>
            <div>User Has GitHub: {String(user?.hasGithub)}</div>
            <div>User Has Wallet: {String(user?.hasWallet)}</div>
            <div>User GitHub ID: {user?.github?.id || 'none'}</div>
            <div>User Wallet: {user?.wallet?.address || 'none'}</div>
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