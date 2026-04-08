import { useState, useEffect } from 'react'
import { repositoryAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import './BountyRedemption.css'

const BountyRedemption = () => {
  const { user } = useAuth()
  const [availableBounties, setAvailableBounties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [redeeming, setRedeeming] = useState(null) // ID of bounty being redeemed
  const [success, setSuccess] = useState(null)
  const [contributorAddress, setContributorAddress] = useState('')

  useEffect(() => {
    fetchAvailableBounties()
  }, [])

  useEffect(() => {
    const saved = sessionStorage.getItem('claimContributorAddress')
    if (saved) {
      setContributorAddress(saved)
      return
    }

    if (user?.wallet?.address) {
      setContributorAddress(user.wallet.address)
      sessionStorage.setItem('claimContributorAddress', user.wallet.address)
    }
  }, [user])

  const connectWalletForClaim = async () => {
    try {
      if (!window.ethereum) {
        setError('MetaMask not found. Please install MetaMask.')
        return
      }

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      const address = accounts?.[0] || ''
      if (!address) {
        setError('No wallet address found from MetaMask')
        return
      }

      setContributorAddress(address)
      sessionStorage.setItem('claimContributorAddress', address)
      setError(null)
    } catch (walletError) {
      setError(walletError?.message || 'Failed to connect wallet')
    }
  }

  const fetchAvailableBounties = async () => {
    try {
      setLoading(true)
      const reposResponse = await repositoryAPI.getListedRepositories()
      
      if (reposResponse.success) {
        const bountiesData = []
        
            // Get bounties from all listed repositories
        for (const repo of reposResponse.listedRepos) {
          try {
                const repoBounties = await repositoryAPI.getRepositoryBounties(repo.blockchainId)
                if (repoBounties.success && repoBounties.bounties) {
                  const active = repoBounties.bounties.filter(b => !b.paid && b.status !== 'completed')
                  active.forEach((bounty) => {
                    bountiesData.push({
                      id: `${repo.blockchainId}-${bounty.issueId}`,
                      repoId: repo.blockchainId,
                      issueId: bounty.issueId,
                      title: bounty.title || `Issue #${bounty.issueId}`,
                      amount: bounty.amount,
                      repoName: repo.metadata?.name || repo.name || 'Unknown Repository',
                      repoOwner: repo.owner,
                      description: bounty.description || `Bounty for issue #${bounty.issueId}`
                    })
                  })
                }
          } catch (error) {
            console.error(`Error fetching bounties for repo ${repo.blockchainId}:`, error)
          }
        }
        
        setAvailableBounties(bountiesData)
      }
    } catch (error) {
      console.error('Error fetching bounties:', error)
      setError('Failed to load available bounties')
    } finally {
      setLoading(false)
    }
  }

  const handleRedeemBounty = async (bounty) => {
    if (!contributorAddress) {
      setError('Please provide your contributor address')
      return
    }

    try {
      setRedeeming(bounty.id)
      setError(null)
      setSuccess(null)

      // Complete the bounty
      const completionData = {
        contributorAddress,
        metadataCID: null
      }

      const result = await repositoryAPI.completeBounty(
        bounty.repoId,
        bounty.issueId,
        completionData
      )

      if (result.success) {
            setSuccess(`Successfully redeemed bounty! Claim reference: ${result.transactionHash}`)
        // Refresh the bounties list
        await fetchAvailableBounties()
        // Clear form
        setContributorAddress('')
      } else {
        setError(result.message || 'Failed to redeem bounty')
      }
    } catch (error) {
      console.error('Error redeeming bounty:', error)
      setError('Failed to redeem bounty')
    } finally {
      setRedeeming(null)
    }
  }

  if (loading) {
    return (
      <div className="bounty-redemption">
        <div className="container">
          <h2>Redeem Your Bounties</h2>
          <div className="loading-message">Loading available bounties...</div>
        </div>
      </div>
    )
  }

  if (error && availableBounties.length === 0) {
    return (
      <div className="bounty-redemption">
        <div className="container">
          <h2>Redeem Your Bounties</h2>
          <div className="error-message">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bounty-redemption">
      <div className="container">
        <h2>Redeem Your Bounties</h2>
        <p className="description">
          Complete the work for assigned bounties and redeem your rewards here.
        </p>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="redemption-form">
          <div className="form-group">
                <label htmlFor="contributorAddress">Your Contributor Address:</label>
            <input
              type="text"
              id="contributorAddress"
              value={contributorAddress}
              onChange={(e) => {
                setContributorAddress(e.target.value)
                sessionStorage.setItem('claimContributorAddress', e.target.value)
              }}
                  placeholder="Enter your payout address or identifier"
              className="form-input"
            />
            <button
              type="button"
              className="redeem-button"
              style={{ marginTop: '8px' }}
              onClick={connectWalletForClaim}
            >
              Use Connected MetaMask Address
            </button>
          </div>

          <div className="form-group">
            <small className="form-help">
              Claim triggers an on-chain payout to the address you provide.
            </small>
          </div>
        </div>

        {availableBounties.length === 0 ? (
          <div className="empty-state">
            <p>No bounties available for redemption.</p>
            <p>Complete assigned work on GitHub and it will appear here!</p>
          </div>
        ) : (
          <div className="bounties-grid">
            {availableBounties.map((bounty) => (
              <div key={bounty.id} className="bounty-card">
                <div className="bounty-header">
                  <h3 className="bounty-title">{bounty.title}</h3>
                  <div className="bounty-amount">{bounty.amount} ETH</div>
                </div>
                
                <div className="bounty-details">
                  <p className="bounty-repo">
                    <strong>Repository:</strong> {bounty.repoName}
                  </p>
                  <p className="bounty-description">{bounty.description}</p>
                  <p className="bounty-issue">
                    <strong>Issue ID:</strong> {bounty.issueId}
                  </p>
                </div>

                <div className="bounty-actions">
                  <button
                    className="redeem-button"
                    onClick={() => handleRedeemBounty(bounty)}
                    disabled={redeeming === bounty.id || !contributorAddress}
                  >
                    {redeeming === bounty.id ? 'Redeeming...' : 'Redeem Bounty'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default BountyRedemption