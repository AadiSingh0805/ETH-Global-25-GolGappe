import { useState } from 'react'
import './AIRecommendations.css'

const AIRecommendations = () => {
  const [recommendations, setRecommendations] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [topicId, setTopicId] = useState('0.0.6917683') // Default to your latest topic

  // Your HCS topic ID from the workflow output - update this with the latest topic ID
  // From your output: "Created topic: 0.0.6917683"
  const MIRROR_NODE_URL = `https://testnet.mirrornode.hedera.com/api/v1/topics/${topicId}/messages`

  const fetchRecommendations = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔍 Fetching AI recommendations from HCS Mirror Node...')
      console.log('📡 Mirror Node URL:', MIRROR_NODE_URL)
      
      const response = await fetch(MIRROR_NODE_URL)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch from Mirror Node: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('📊 Mirror Node Response:', data)
      
      if (data.messages && data.messages.length > 0) {
        // Get the latest message (messages are sorted by sequence_number)
        const latestMessage = data.messages[data.messages.length - 1]
        
        // Decode the base64 message content
        const messageContent = atob(latestMessage.message)
        console.log('📝 Decoded message:', messageContent)
        
        const parsedRecommendations = JSON.parse(messageContent)
        setRecommendations(parsedRecommendations)
        
        console.log('✅ Successfully fetched recommendations:', parsedRecommendations)
      } else {
        throw new Error('No messages found in the topic')
      }
      
    } catch (error) {
      console.error('❌ Error fetching recommendations:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const getRepoDescription = (repoName) => {
    const descriptions = {
      'hedera-defi-protocol': 'DeFi protocol built on Hedera with advanced yield farming and liquidity management features',
      'ai-trading-algorithms': 'Machine learning-powered trading algorithms with real-time market analysis and portfolio optimization',
      'smart-contract-auditor': 'Automated smart contract security auditing tool with vulnerability detection and gas optimization',
      'ethereum-bridge': 'Cross-chain bridge connecting Ethereum and Hedera networks for seamless asset transfers',
      'nft-marketplace': 'Decentralized NFT marketplace with advanced trading features and creator royalties',
      'dao-governance': 'Decentralized governance platform for community-driven decision making and proposal management'
    }
    
    return descriptions[repoName] || 'AI-recommended repository for contributing based on your skills and interests'
  }

  const getRepoIcon = (repoName) => {
    const icons = {
      'hedera-defi-protocol': '🏦',
      'ai-trading-algorithms': '🤖',
      'smart-contract-auditor': '🔒',
      'ethereum-bridge': '🌉',
      'nft-marketplace': '🎨',
      'dao-governance': '🗳️'
    }
    
    return icons[repoName] || '💡'
  }

  return (
    <section className="ai-recommendations">
      <div className="ai-recommendations-container">
        <div className="section-header">
          <h2 className="section-title">🤖 AI-Powered Repository Recommendations</h2>
          <p className="section-subtitle">
            Get personalized repository recommendations powered by AI and stored on Hedera HCS
          </p>
          
          <div className="topic-input-section">
            <label htmlFor="topicId" className="topic-label">
              HCS Topic ID (optional - uses latest by default):
            </label>
            <input
              id="topicId"
              type="text"
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              placeholder="0.0.6917683"
              className="topic-input"
            />
          </div>
          
          <button 
            className="fetch-recommendations-btn"
            onClick={fetchRecommendations}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Fetching from HCS...
              </>
            ) : (
              <>
                ✨ Get AI Recommendations
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="error-message">
            <p>❌ Error: {error}</p>
            <p className="error-details">
              Make sure the HCS topic has messages and the Mirror Node is accessible.
            </p>
          </div>
        )}

        {recommendations && (
          <div className="recommendations-section">
            <div className="recommendations-header">
              <h3>Recommendations for: <span className="username">{recommendations.user}</span></h3>
              <p className="timestamp">
                Generated: {new Date(recommendations.timestamp).toLocaleString()}
              </p>
            </div>

            <div className="recommendations-grid">
              {recommendations.recommendedRepos.map((repoName, index) => (
                <div key={index} className="recommendation-card">
                  <div className="card-header">
                    <div className="repo-icon">{getRepoIcon(repoName)}</div>
                    <div className="repo-info">
                      <h4 className="repo-name">{repoName}</h4>
                      <span className="ai-badge">AI Recommended</span>
                    </div>
                  </div>
                  
                  <p className="repo-description">
                    {getRepoDescription(repoName)}
                  </p>
                  
                  <div className="repo-stats">
                    <div className="stat">
                      <span className="stat-value">{Math.floor(Math.random() * 50) + 10}</span>
                      <span className="stat-label">Issues</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">{Math.floor(Math.random() * 20) + 5}</span>
                      <span className="stat-label">Bounties</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">${Math.floor(Math.random() * 5000) + 1000}</span>
                      <span className="stat-label">Total Rewards</span>
                    </div>
                  </div>
                  
                  <div className="card-actions">
                    <button className="explore-btn">
                      🔍 Explore Repository
                    </button>
                    <button className="view-bounties-btn">
                      💰 View Bounties
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="hcs-info">
              <p className="hcs-details">
                📡 Data fetched from Hedera Consensus Service (HCS)
                <br />
                <small>Topic ID: {topicId}</small>
              </p>
            </div>
          </div>
        )}

        {!recommendations && !loading && !error && (
          <div className="empty-state">
            <div className="empty-icon">🤖</div>
            <h3>Ready to get AI recommendations?</h3>
            <p>Click the button above to fetch personalized repository recommendations from Hedera HCS</p>
          </div>
        )}
      </div>
    </section>
  )
}

export default AIRecommendations