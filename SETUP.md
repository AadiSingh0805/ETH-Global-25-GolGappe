# GolGappe - ETH Global 2025 Project

## Backend & Frontend Authentication Setup

### Backend Setup

1. **Install Dependencies**
```bash
cd backend
npm install
```

2. **Configure Environment Variables**
Copy `.env.example` to `.env` and fill in your GitHub App credentials:

```bash
# Environment Variables
NODE_ENV=development
PORT=5000

# Database (MongoDB)
MONGODB_URI=mongodb://localhost:27017/golgappe

# GitHub OAuth (Replace with your actual GitHub App credentials)
GITHUB_CLIENT_ID=your-github-client-id-here
GITHUB_CLIENT_SECRET=your-github-client-secret-here
GITHUB_CALLBACK_URL=http://localhost:5000/api/auth/github/callback

# Session Secret (Change this to a random string)
SESSION_SECRET=golgappe-super-secret-key-2025

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

3. **GitHub App Configuration**

Create a GitHub App at https://github.com/settings/apps with these settings:

- **Homepage URL**: `http://localhost:5173`
- **Authorization callback URL**: `http://localhost:5000/api/auth/github/callback`
- **Permissions**:
  - Account permissions → Email addresses: Read-only
  - Account permissions → Profile: Read-only
- **Where can this GitHub App be installed?**: Any account

Copy the **Client ID** and **Client Secret** to your `.env` file.

4. **Start Backend Server**
```bash
npm run dev
```

The backend will run on http://localhost:5000

### Frontend Setup

1. **Install Dependencies**
```bash
cd frontend
npm install
```

2. **Start Frontend Server**
```bash
npm run dev
```

The frontend will run on http://localhost:5173

### API Endpoints

#### Authentication Endpoints

- `GET /api/auth/github` - Get GitHub OAuth URL
- `GET /api/auth/github/callback` - GitHub OAuth callback
- `POST /api/auth/metamask/nonce` - Get MetaMask nonce for signing
- `POST /api/auth/metamask/verify` - Verify MetaMask signature
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/status` - Check authentication status

#### User Endpoints

- `GET /api/users/profile/:username?` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/link/wallet` - Link wallet to account
- `GET /api/users/stats` - Get user statistics

#### Project Endpoints (Placeholder)

- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create new project

### Authentication Flow

#### GitHub Authentication
1. User clicks "Connect with GitHub"
2. Frontend calls `/api/auth/github` to get OAuth URL
3. User is redirected to GitHub for authorization
4. GitHub redirects back to `/api/auth/github/callback`
5. Backend creates/updates user and sets session
6. User is redirected to frontend dashboard

#### MetaMask Authentication
1. User clicks "Connect to MetaMask"
2. Frontend calls `/api/auth/metamask/nonce` with wallet address
3. Backend generates and returns a nonce
4. Frontend prompts user to sign the message with MetaMask
5. Frontend calls `/api/auth/metamask/verify` with signature
6. Backend verifies signature and creates/updates user
7. Session is established

### Database Schema

The application uses MongoDB with a User model that supports both GitHub and MetaMask authentication:

```javascript
{
  username: String,
  displayName: String,
  email: String,
  avatar: String,
  bio: String,
  github: {
    id: String,
    username: String,
    email: String,
    avatar: String,
    profileUrl: String,
    accessToken: String
  },
  wallet: {
    address: String,
    isVerified: Boolean,
    nonce: String
  },
  role: String, // 'creator' or 'contributor'
  // ... more fields
}
```

### Testing the Setup

1. Make sure MongoDB is running locally
2. Start the backend server (`npm run dev` in backend folder)
3. Start the frontend server (`npm run dev` in frontend folder)
4. Navigate to http://localhost:5173
5. Click on "Join as Creator" or "Join as Contributor"
6. Test both GitHub and MetaMask authentication

### Development Notes

- Sessions are used instead of JWT tokens for simplicity
- CORS is configured to allow credentials
- Error handling includes user-friendly messages
- The authentication context provides React hooks for the frontend
- MetaMask integration uses ethers.js for signature verification

### Next Steps

1. Set up your GitHub App with the correct credentials
2. Install and start MongoDB locally
3. Test both authentication methods
4. Implement additional project features as needed

### Troubleshooting

- **GitHub OAuth not working**: Check your Client ID, Client Secret, and callback URL
- **MetaMask not connecting**: Make sure you have MetaMask installed and enabled
- **Database connection issues**: Ensure MongoDB is running on port 27017
- **CORS errors**: Make sure frontend and backend URLs match the configuration