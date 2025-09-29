import { useState, useEffect } from 'react'
import { escrowAPI, repositoryAPI } from '../../services/api'
import './BountyRedemption.css'

const BountyRedemption = () => {
  const [availableBounties, setAvailableBounties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [redeeming, setRedeeming] = useState(null) // ID of bounty being redeemed
  const [success, setSuccess] = useState(null)
  const [contributorAddress, setContributorAddress] = useState('')
  const [privateKey, setPrivateKey] = useState('')

  useEffect(() => {
    fetchAvailableBounties()
  }, [])

  const fetchAvailableBounties = async () => {
    try {
      setLoading(true)
      const reposResponse = await repositoryAPI.getListedRepositories()
      
      if (reposResponse.success) {
        const bountiesData = []
        
        // Get bounties from all repositories
        for (const repo of reposResponse.listedRepos) {
          try {
            // For each repository, check its issues for bounties
            if (repo.issueIds && repo.issueIds.length > 0) {
              for (const issueId of repo.issueIds) {
                try {
                  // Check if this issue has a bounty
                  const bountyDetails = await escrowAPI.getBountyDetails(repo.blockchainId, issueId)
                  if (bountyDetails.success && 
                      parseFloat(bountyDetails.data.amount) > 0 && 
                      !bountyDetails.data.paid) {
                    
                    bountiesData.push({
                      id: `${repo.blockchainId}-${issueId}`,
                      repoId: repo.blockchainId,
                      issueId: issueId,
                      title: `Issue #${issueId}`,
                      amount: bountyDetails.data.amount,
                      repoName: repo.metadata?.name || repo.name || 'Unknown Repository',
                      repoOwner: repo.owner,
                      description: `Bounty for issue #${issueId} in ${repo.metadata?.name || repo.name}`
                    })
                  }
                } catch (issueError) {
                  console.error(`Error checking bounty for issue ${issueId}:`, issueError)
                }
              }
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
    if (!contributorAddress || !privateKey) {
      setError('Please provide both contributor address and private key')
      return
    }

    try {
      setRedeeming(bounty.id)
      setError(null)
      setSuccess(null)

      // Complete the bounty
      const completionData = {
        contributorAddress,
        metadataCID: null, // Could be enhanced to include proof of work
        privateKey
      }

      const result = await repositoryAPI.completeBounty(
        bounty.repoId,
        bounty.issueId,
        completionData
      )

      if (result.success) {
        setSuccess(`Successfully redeemed bounty! Transaction hash: ${result.transactionHash}`)
        // Refresh the bounties list
        await fetchAvailableBounties()
        // Clear form
        setContributorAddress('')
        setPrivateKey('')
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
            <label htmlFor="contributorAddress">Your Wallet Address:</label>
            <input
              type="text"
              id="contributorAddress"
              value={contributorAddress}
              onChange={(e) => setContributorAddress(e.target.value)}
              placeholder="0x..."
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="privateKey">Private Key (for transaction signing):</label>
            <input
              type="password"
              id="privateKey"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder="Your private key"
              className="form-input"
            />
            <small className="form-help">
              Your private key is used locally to sign transactions and is not stored.
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
                    disabled={redeeming === bounty.id || !contributorAddress || !privateKey}
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