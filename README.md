# 🚀 GitBountys - Decentralized Bounty System for GitHub

[![ETH Global 2025](https://img.shields.io/badge/ETH%20Global-2025-green)](https://ethglobal.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19+-blue)](https://reactjs.org/)

> A revolutionary platform that bridges GitHub repositories with blockchain-powered bounty systems, enabling developers to earn cryptocurrency for contributing to open-source projects.

## 🌟 Overview

GitBountys transforms the way open-source development is incentivized by creating a decentralized bounty system where:

- **Project Creators** can list their repositories and fund bounties for specific issues
- **Contributors** can discover and work on paid coding challenges
- **Automated Escrow** ensures secure payments using smart contracts
- **GitHub Integration** provides seamless workflow with existing development processes

## ✨ Key Features

### 🎯 For Project Creators
- **Repository Registration**: Easily list your GitHub repositories
- **Issue Management**: Create and manage bounties for specific issues
- **Automated Verification**: GitHub integration for automatic contribution verification
- **Secure Payments**: MetaMask integration for safe cryptocurrency transactions

### 💰 For Contributors
- **Bounty Discovery**: Browse available bounties across different projects
- **Skill-Based Filtering**: Find opportunities matching your expertise
- **Automated Rewards**: Get paid automatically when your contributions are accepted
- **Portfolio Building**: Build your reputation in the decentralized development ecosystem

### 🔒 Security & Trust
- **Smart Contract Escrow**: Funds are held securely until work is completed
- **GitHub OAuth**: Secure authentication and repository access
- **MetaMask Integration**: No private keys required, users control their transactions
- **Filecoin Network**: Built on reliable and fast blockchain infrastructure

## 🏗️ Architecture

```
├── 🎨 Frontend (React + Vite)
│   ├── Modern UI with Spotify-inspired design
│   ├── MetaMask wallet integration
│   ├── GitHub OAuth authentication
│   └── Responsive design (16:9 optimized)
│
├── ⚙️ Backend (Node.js + Express)
│   ├── GitHub API integration
│   ├── Smart contract interactions
│   ├── User authentication & authorization
│   └── RESTful API endpoints
│
├── 🤖 Agentic System (AI-Powered)
│   ├── Hedera Hashgraph integration
│   ├── Automated workflow management
│   ├── AI-driven bounty matching
│   └── Smart analytics and insights
│
└── 🔗 Blockchain Integration
    ├── Filecoin Calibration Testnet
    ├── Smart contract: 0xE865690eCAc3547dA4e87e648F7Fbb10778C6050
    └── Secure escrow system
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MetaMask browser extension
- GitHub account
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/AadiSingh0805/ETH-Global-25-GolGappe.git
cd ETH-Global-25-GolGappe
```

### 2. Backend Setup
```bash
cd backend
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
# See SETUP.md for detailed configuration
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

### 4. Agentic System Setup
```bash
cd ../agentic
npm install

# Configure Hedera credentials
cp .env.example .env
```

### 5. Start Development Servers
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend  
cd frontend
npm run dev

# Terminal 3: Agentic System
cd agentic
npm start
```

Open [http://localhost:5173](http://localhost:5173) to view the application.

## 🔧 Configuration

### Environment Variables

#### Backend (`backend/.env`)
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/golgappe
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
SESSION_SECRET=your-session-secret
```

#### Agentic System (`agentic/.env`)
```env
HEDERA_ACCOUNT_ID=your-hedera-account-id
HEDERA_PRIVATE_KEY=your-hedera-private-key
HEDERA_NETWORK=testnet
```

For detailed setup instructions, see [SETUP.md](./SETUP.md).

## 🎮 How to Use

### For Project Creators
1. **Connect Wallet**: Use MetaMask to connect your cryptocurrency wallet
2. **GitHub Login**: Authenticate with your GitHub account
3. **Register Repository**: Add your repository to the platform
4. **Create Bounties**: Set up bounties for specific issues with funding
5. **Manage Projects**: Monitor contributions and approve payments

### For Contributors
1. **Browse Bounties**: Explore available bounties on the contributor dashboard
2. **Select Projects**: Choose bounties that match your skills
3. **Submit Work**: Complete the work and submit your GitHub pull request
4. **Get Paid**: Receive automatic payment when your work is approved

## 📱 User Interface

### 🎨 Design System
- **Color Scheme**: Spotify-inspired green theme (#1DB954)
- **Typography**: Modern, clean fonts with excellent readability
- **Layout**: Responsive design optimized for 16:9 aspect ratio
- **Animations**: Smooth transitions and glassmorphism effects

### 📱 Responsive Design
- **Desktop**: Full-featured dashboard experience
- **Tablet**: Optimized touch interface
- **Mobile**: Streamlined mobile-first design

## 🛠️ Tech Stack

### Frontend
- **React 19** - Modern UI library
- **Vite** - Fast build tool and dev server
- **Ethers.js** - Ethereum blockchain interaction
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Passport.js** - Authentication middleware
- **Octokit** - GitHub API integration

### Blockchain
- **Filecoin Calibration Testnet** - Blockchain network
- **MetaMask** - Wallet integration
- **Smart Contracts** - Automated escrow system
- **Web3** - Blockchain connectivity

### AI/ML
- **Hedera Hashgraph** - Distributed ledger technology
- **AI Agents** - Automated workflow management
- **Machine Learning** - Bounty matching algorithms

## 📊 Smart Contract

**Contract Address**: `0xE865690eCAc3547dA4e87e648F7Fbb10778C6050`  
**Network**: Filecoin Calibration Testnet (Chain ID: 314159)

### Key Functions
- `donateToProject(uint256 _repoId)` - Fund a repository bounty pool
- `getProjectPool(uint256 _repoId)` - Check current pool balance
- `withdrawFunds(uint256 _repoId)` - Withdraw earned rewards

## 🤝 Contributing

We welcome contributions from the community! Here's how to get started:

1. **Fork the Repository**
2. **Create Feature Branch**: `git checkout -b feature/amazing-feature`
3. **Commit Changes**: `git commit -m 'Add amazing feature'`
4. **Push to Branch**: `git push origin feature/amazing-feature`
5. **Open Pull Request**

### Development Guidelines
- Follow existing code style and conventions
- Write tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting

## 📚 Documentation

- [Setup Guide](./SETUP.md) - Complete setup instructions
- [Donation System](./DONATION_SYSTEM.md) - MetaMask integration details
- [Ownership Guide](./OWNERSHIP_ERROR_GUIDE.md) - Repository ownership troubleshooting
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues and solutions

## 🚨 Troubleshooting

### Common Issues
- **MetaMask Connection**: Ensure MetaMask is installed and unlocked
- **Network Issues**: Switch to Filecoin Calibration Testnet
- **GitHub OAuth**: Check OAuth app configuration
- **Build Errors**: Clear node_modules and reinstall dependencies

For detailed troubleshooting, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

## 🎯 Roadmap

### Phase 1 (Current)
- ✅ Basic bounty system
- ✅ GitHub integration
- ✅ MetaMask payments
- ✅ User dashboards

### Phase 2 (Q2 2025)
- 🔄 Multi-blockchain support
- 🔄 Advanced AI matching
- 🔄 Reputation system
- 🔄 Mobile app

### Phase 3 (Q3 2025)
- 📋 DAO governance
- 📋 Advanced analytics
- 📋 Enterprise features
- 📋 Global expansion

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏆 ETH Global 2025

Built with ❤️ for ETH Global 2025 hackathon. 

**Team**: GolGappe  
**Track**: Open Source & Developer Tooling  
**Demo**: [Live Demo](https://your-demo-url.com)

## 📞 Support

- **GitHub Issues**: [Report bugs and request features](https://github.com/AadiSingh0805/ETH-Global-25-GolGappe/issues)
- **Discord**: Join our community server
- **Email**: support@gitbountys.com

## 🙏 Acknowledgments

- ETH Global for hosting an amazing hackathon
- GitHub for providing excellent APIs
- MetaMask for secure wallet integration
- Filecoin for reliable blockchain infrastructure
- Open source community for inspiration and support

---

**Made with 💚 by the GolGappe team**

*Revolutionizing open-source development, one bounty at a time.*