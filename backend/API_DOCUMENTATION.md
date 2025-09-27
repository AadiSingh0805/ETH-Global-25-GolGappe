# Smart Contract API Endpoints

## Overview
This document describes the API endpoints for interacting with the GolGappe smart contracts:
- **RepoRegistry Contract**: `0xE865690eCAc3547dA4e87e648F7Fbb10778C6050`
- **BountyEscrow Contract**: `0x3bf06982df5959b3Bf26bA62B46069c42FA002e0`

## Environment Variables Required

Add these to your `.env` file:

```
RPC_URL=https://your-blockchain-rpc-url
PRIVATE_KEY=your-private-key-for-server-operations
```

## Blockchain Routes (`/api/blockchain`)

### Get All Repositories
```
GET /api/blockchain/repos
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "cid": "QmExample...",
      "owner": "0x123...",
      "isPublic": true,
      "issueIds": [1, 2, 3]
    }
  ]
}
```

### Get Specific Repository
```
GET /api/blockchain/repos/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "cid": "QmExample...",
    "owner": "0x123...",
    "isPublic": true,
    "issueIds": [1, 2, 3]
  }
}
```

### Register New Repository
```
POST /api/blockchain/repos
```

**Request Body:**
```json
{
  "cid": "QmExample...",
  "isPublic": true,
  "issueIds": [1, 2, 3],
  "privateKey": "optional-private-key"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionHash": "0xabc123...",
    "repoId": 1,
    "gasUsed": "150000"
  }
}
```

### Get Issue Bounty (Metadata)
```
GET /api/blockchain/issues/:issueId/bounty
```

**Response:**
```json
{
  "success": true,
  "data": {
    "issueId": 1,
    "bounty": "1.5",
    "bountyWei": "1500000000000000000"
  }
}
```

### Assign Bounty to Issue
```
POST /api/blockchain/repos/:repoId/issues/:issueId/bounty
```

**Request Body:**
```json
{
  "bounty": "1.5",
  "privateKey": "optional-private-key"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionHash": "0xabc123...",
    "repoId": 1,
    "issueId": 1,
    "bounty": "1.5",
    "gasUsed": "100000"
  }
}
```

## Escrow Routes (`/api/escrow`)

### Get Project Pool Balance
```
GET /api/escrow/projects/:repoId/pool
```

**Response:**
```json
{
  "success": true,
  "data": {
    "repoId": 1,
    "balance": "10.5",
    "balanceWei": "10500000000000000000"
  }
}
```

### Donate to Project Pool
```
POST /api/escrow/projects/:repoId/donate
```

**Request Body:**
```json
{
  "amount": "5.0",
  "privateKey": "donor-private-key"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionHash": "0xabc123...",
    "repoId": 1,
    "amount": "5.0",
    "donor": "0x123...",
    "gasUsed": "80000"
  }
}
```

### Get Issue Bounty Details (Escrow)
```
GET /api/escrow/projects/:repoId/issues/:issueId/bounty
```

**Response:**
```json
{
  "success": true,
  "data": {
    "repoId": 1,
    "issueId": 1,
    "amount": "2.0",
    "amountWei": "2000000000000000000",
    "paid": false
  }
}
```

### Fund Issue Bounty from Project Pool
```
POST /api/escrow/projects/:repoId/issues/:issueId/fund
```

**Request Body:**
```json
{
  "amount": "2.0",
  "privateKey": "owner-private-key"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionHash": "0xabc123...",
    "repoId": 1,
    "issueId": 1,
    "amount": "2.0",
    "gasUsed": "120000"
  }
}
```

### Release Bounty to Solver
```
POST /api/escrow/projects/:repoId/issues/:issueId/release
```

**Request Body:**
```json
{
  "solverAddress": "0x456...",
  "privateKey": "owner-private-key"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionHash": "0xabc123...",
    "repoId": 1,
    "issueId": 1,
    "solver": "0x456...",
    "amount": "2.0",
    "gasUsed": "90000"
  }
}
```

### Get Contract Owner
```
GET /api/escrow/owner
```

**Response:**
```json
{
  "success": true,
  "data": {
    "owner": "0x123..."
  }
}
```

## Error Responses

All endpoints follow this error format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

## Common HTTP Status Codes

- `200` - Success
- `400` - Bad Request (missing or invalid parameters)
- `500` - Internal Server Error (blockchain or server issues)

## Authentication

- For read operations: No authentication required
- For write operations: Either provide `privateKey` in request body or ensure server has `PRIVATE_KEY` in environment variables

## Gas Estimation

All write operations return `gasUsed` in the response. Consider implementing gas estimation endpoints if needed:

```javascript
// Example gas estimation
const gasEstimate = await contract.estimateGas.registerRepo(cid, isPublic, issueIds);
```

## Rate Limiting

The server implements rate limiting (100 requests per 15 minutes per IP). Blockchain operations may take longer due to network confirmation times.

## GitHub Integration Routes (`/api/github`)

### Get User's GitHub Repositories with Blockchain Data
```
GET /api/github/repos
```

**Headers:**
```
Authorization: Bearer <session-token>
```

**Query Parameters:**
- `type`: Repository type (`owner`, `all`, `public`, `private`) - default: `owner`
- `sort`: Sort by (`created`, `updated`, `pushed`, `full_name`) - default: `updated`
- `per_page`: Results per page (max 100) - default: `50`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "github": {
        "id": 123456,
        "name": "my-repo",
        "full_name": "user/my-repo",
        "description": "My awesome repository",
        "url": "https://github.com/user/my-repo",
        "clone_url": "https://github.com/user/my-repo.git",
        "default_branch": "main",
        "created_at": "2023-01-01T00:00:00Z",
        "updated_at": "2023-12-01T00:00:00Z",
        "stars": 42,
        "forks": 5,
        "language": "JavaScript",
        "is_private": false,
        "has_issues": true
      },
      "blockchain": {
        "blockchainId": 1,
        "cid": "github_123456_abc123",
        "owner": "0x123...",
        "isPublic": true,
        "issueIds": [1, 2, 3],
        "poolBalance": "5.2500"
      },
      "isRegistered": true
    }
  ]
}
```

### Get Specific Repository with Issues and Blockchain Data
```
GET /api/github/repos/:owner/:repo
```

**Headers:**
```
Authorization: Bearer <session-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "repository": {
      "id": 123456,
      "name": "my-repo",
      "full_name": "user/my-repo",
      "description": "My awesome repository",
      "url": "https://github.com/user/my-repo",
      "stars": 42,
      "forks": 5,
      "language": "JavaScript",
      "languages": {
        "JavaScript": 12345,
        "CSS": 5432
      },
      "topics": ["web3", "blockchain"],
      "contributors_count": 3
    },
    "issues": [
      {
        "id": 987654,
        "number": 1,
        "title": "Fix authentication bug",
        "body": "There's a bug in the auth system...",
        "state": "open",
        "labels": [{"name": "bug"}, {"name": "urgent"}],
        "assignees": [],
        "creator": {"login": "user", "avatar_url": "..."},
        "created_at": "2023-11-01T00:00:00Z",
        "updated_at": "2023-11-01T00:00:00Z",
        "url": "https://github.com/user/my-repo/issues/1",
        "comments_count": 3,
        "bounty": {
          "issueId": 1,
          "metadataBounty": "1.5000",
          "escrowAmount": "1.0000",
          "paid": false
        }
      }
    ],
    "contributors": [
      {
        "id": 123,
        "login": "contributor1",
        "avatar_url": "...",
        "contributions": 42,
        "url": "https://github.com/contributor1"
      }
    ],
    "readme": {
      "content": "# My Repo\n\nThis is my awesome repository...",
      "download_url": "https://raw.githubusercontent.com/..."
    },
    "recent_commits": [
      {
        "sha": "abc123",
        "message": "Fix bug in auth system",
        "author": {"name": "User", "email": "user@example.com"},
        "date": "2023-11-01T00:00:00Z",
        "url": "https://github.com/user/my-repo/commit/abc123"
      }
    ],
    "blockchain": {
      "blockchainId": 1,
      "cid": "github_123456_abc123",
      "owner": "0x123...",
      "isPublic": true,
      "poolBalance": "5.2500",
      "issuesWithBounties": [
        {
          "issueId": 1,
          "metadataBounty": "1.5000",
          "escrowAmount": "1.0000",
          "paid": false
        }
      ]
    },
    "isRegistered": true
  }
}
```

### Register GitHub Repository to Blockchain
```
POST /api/github/repos/:owner/:repo/register
```

**Headers:**
```
Authorization: Bearer <session-token>
```

**Request Body:**
```json
{
  "isPublic": true,
  "selectedIssues": [1, 2, 5],
  "privateKey": "optional-private-key-for-signing"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionHash": "0xabc123...",
    "repoId": 1,
    "cid": "github_123456_abc123",
    "github": {
      "id": 123456,
      "name": "my-repo",
      "full_name": "user/my-repo"
    },
    "registeredIssues": [1, 2, 5],
    "metadata": {
      "github": {...},
      "issues": [...],
      "registered_at": "2023-12-01T00:00:00Z"
    },
    "gasUsed": "150000"
  }
}
```

### Get Specific Issue with Bounty Data
```
GET /api/github/repos/:owner/:repo/issues/:issueNumber
```

**Headers:**
```
Authorization: Bearer <session-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "issue": {
      "id": 987654,
      "number": 1,
      "title": "Fix authentication bug",
      "body": "There's a bug in the auth system...",
      "state": "open",
      "labels": [{"name": "bug"}],
      "assignees": [],
      "creator": {"login": "user"},
      "created_at": "2023-11-01T00:00:00Z",
      "updated_at": "2023-11-01T00:00:00Z",
      "url": "https://github.com/user/my-repo/issues/1",
      "comments_count": 3,
      "comments_data": [
        {
          "id": 111,
          "body": "I can help with this",
          "user": {"login": "contributor"},
          "created_at": "2023-11-01T01:00:00Z"
        }
      ]
    },
    "bounty": {
      "repoId": 1,
      "metadataBounty": "1.5000",
      "escrowAmount": "1.0000",
      "paid": false
    }
  }
}
```

## Analytics Routes (`/api/analytics`)

### Get All Repos with Complete Bounty Information
```
GET /api/analytics/repos
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "cid": "QmExample...",
      "owner": "0x123...",
      "isPublic": true,
      "poolBalance": "10.5000",
      "issues": [
        {
          "id": 1,
          "metadataBounty": "2.0000",
          "escrowAmount": "1.5000",
          "paid": false
        }
      ]
    }
  ]
}
```

### Get Repository Statistics
```
GET /api/analytics/repos/:repoId/statistics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "repoId": 1,
    "owner": "0x123...",
    "isPublic": true,
    "totalIssues": 3,
    "activeBounties": 2,
    "completedBounties": 1,
    "poolBalance": "10.5000",
    "totalBountiesValue": "5.0000",
    "paidBountiesValue": "2.0000"
  }
}
```

### Get Blockchain Events
```
GET /api/analytics/events?fromBlock=earliest&toBlock=latest
```

**Response:**
```json
{
  "success": true,
  "data": {
    "repoRegistered": [...],
    "bountyAssigned": [...],
    "projectDonated": [...],
    "bountyFunded": [...],
    "bountyReleased": [...]
  }
}
```

### Estimate Gas for Operations
```
POST /api/analytics/gas-estimate
```

**Request Body:**
```json
{
  "operation": "registerRepo",
  "params": {
    "cid": "QmExample...",
    "isPublic": true,
    "issueIds": [1, 2, 3]
  },
  "privateKey": "optional-private-key"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "operation": "registerRepo",
    "gasEstimate": "150000",
    "gasEstimateFormatted": "150,000"
  }
}
```

### Get Network Information
```
GET /api/analytics/network-info
```

**Response:**
```json
{
  "success": true,
  "data": {
    "chainId": 1,
    "name": "mainnet",
    "currentBlockNumber": 18500000,
    "gasPrice": "20000000000",
    "maxFeePerGas": "30000000000",
    "maxPriorityFeePerGas": "2000000000"
  }
}
```

## Testing

Run the test script to verify all endpoints:

```bash
cd backend
node test-api.js
```

## Frontend Integration Example

```javascript
// Example usage in frontend
const registerRepo = async (cid, isPublic, issueIds, privateKey) => {
  const response = await fetch('/api/blockchain/repos', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cid,
      isPublic,
      issueIds,
      privateKey
    })
  });
  
  return response.json();
};

// Get all repos with bounty information
const getAllReposWithBounties = async () => {
  const response = await fetch('/api/analytics/repos');
  return response.json();
};

// Estimate gas before transaction
const estimateGas = async (operation, params) => {
  const response = await fetch('/api/analytics/gas-estimate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ operation, params })
  });
  
  return response.json();
};
```