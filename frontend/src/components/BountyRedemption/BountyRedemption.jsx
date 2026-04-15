import { useState, useEffect } from 'react'
import { repositoryAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import './BountyRedemption.css'

const BountyRedemption = () => {
  const { user } = useAuth()
  const payoutOptions = [
    { value: 'ETH', label: 'ETH' },
    { value: 'BTC', label: 'BTC' },
    { value: 'USDC', label: 'USDC' },
  ]
  const [availableBounties, setAvailableBounties] = useState([])
  const [payoutEstimates, setPayoutEstimates] = useState({})
  const [loading, setLoading] = useState(true)
  const [estimating, setEstimating] = useState(false)
  const [error, setError] = useState(null)
  const [redeeming, setRedeeming] = useState(null) // ID of bounty being redeemed
  const [success, setSuccess] = useState(null)
  const [contributorAddress, setContributorAddress] = useState('')
  const [payoutCurrency, setPayoutCurrency] = useState('ETH')

  useEffect(() => {
    fetchAvailableBounties()
  }, [])

  useEffect(() => {
    const fetchPayoutEstimates = async () => {
      if (availableBounties.length === 0) {
        setPayoutEstimates({})
        return
      }

      try {
        setEstimating(true)
        const quoteResults = await Promise.all(
          availableBounties.map(async (bounty) => {
            try {
              const quote = await repositoryAPI.getBountyPayoutQuote(
                bounty.repoId,
                bounty.issueId,
                payoutCurrency
              )

              if (quote.success && quote.quote) {
                return [bounty.id, quote.quote]
              }
            } catch (quoteError) {
              console.error(`Quote error for bounty ${bounty.id}:`, quoteError)
            }

            return [bounty.id, null]
          })
        )

        setPayoutEstimates(Object.fromEntries(quoteResults))
      } finally {
        setEstimating(false)
      }
    }

    fetchPayoutEstimates()
  }, [availableBounties, payoutCurrency])

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
        payoutCurrency,
        metadataCID: null
      }

      const result = await repositoryAPI.completeBounty(
        bounty.repoId,
        bounty.issueId,
        completionData
      )

      if (result.success) {
        setSuccess(`Successfully redeemed bounty in ${result.payoutCurrency || payoutCurrency}! Claim reference: ${result.transactionHash}`)
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

          <div className="form-group">
            <label htmlFor="payoutCurrency">Claim Currency:</label>
            <select
              id="payoutCurrency"
              value={payoutCurrency}
              onChange={(e) => setPayoutCurrency(e.target.value)}
              className="form-input token-select"
              aria-label="Select claim currency"
            >
              {payoutOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <small className="form-help">
              Choose ETH, BTC, or USDC before transfer.
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
                  <div className="bounty-amount">{bounty.amount} ETH ({payoutCurrency} payout)</div>
                </div>
                
                <div className="bounty-details">
                  <p className="bounty-repo">
                    <strong>Repository:</strong> {bounty.repoName}
                  </p>
                  <p className="bounty-description">{bounty.description}</p>
                  <p className="bounty-issue">
                    <strong>Issue ID:</strong> {bounty.issueId}
                  </p>
                  <p className="bounty-estimate">
                    <strong>Estimated payout:</strong>{' '}
                    {estimating
                      ? 'Calculating...'
                      : payoutEstimates[bounty.id]
                        ? `${payoutEstimates[bounty.id].estimatedOutputDisplay} ${payoutEstimates[bounty.id].payoutCurrency}`
                        : `~${bounty.amount} ${payoutCurrency}`}
                  </p>
                </div>

                <div className="bounty-actions">
                  <button
                    className="redeem-button"
                    onClick={() => handleRedeemBounty(bounty)}
                    disabled={redeeming === bounty.id || !contributorAddress}
                  >
                    {redeeming === bounty.id ? 'Redeeming...' : `Redeem as ${payoutCurrency}`}
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