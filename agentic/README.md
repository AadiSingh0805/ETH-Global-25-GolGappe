# Hedera Agentic AI Workflow

End-to-end agentic AI workflow using Hedera Previewnet for GitHub repository recommendations.

## Features

- 📊 **Static Data Loading**: GitHub user profiles and repository metadata
- 🤖 **AI Recommendations**: Hedera LLM (Eliza) integration for personalized suggestions  
- 🔗 **Hedera Consensus Service**: Immutable storage of recommendations
- 🌐 **Mirror Node Integration**: Frontend data retrieval
- 🔐 **Message Integrity**: Keccak256 hashing for verification

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Configuration**:
   ```bash
   cp .env.example .env
   # Edit .env with your Hedera Previewnet credentials
   ```

3. **Run the Workflow**:
   ```bash
   npm start
   ```

## Architecture

```
GitHub Data → AI Service (Eliza) → HCS Topic → Mirror Node → Frontend
     ↓              ↓                 ↓           ↓          ↓
  JSON Files   Recommendations   Consensus   Message Hash  Display
```

## Workflow Steps

1. **Data Input**: Load static GitHub user info and repository list
2. **AI Processing**: Generate recommendations using Hedera LLM
3. **HCS Storage**: Submit recommendations to consensus service
4. **Message Integrity**: Compute and store message hash
5. **Frontend Retrieval**: Query Mirror Node for immutable recommendations

## Configuration

- **Network**: Hedera Previewnet only
- **Consensus**: HCS topics for recommendation storage
- **AI Model**: Hedera Eliza LLM service
- **Frontend**: Mirror Node REST API integration

## Example Output

```json
{
  "user": "alice_dev", 
  "recommendedRepos": ["hedera-defi-protocol", "ai-trading-algorithms", "web3-analytics-dashboard"],
  "timestamp": "2025-09-27T12:00:00Z"
}
```