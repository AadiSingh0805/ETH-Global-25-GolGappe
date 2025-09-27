import api from './api.js';
import { ethers } from 'ethers';

// Authentication service
class AuthService {
  // GitHub authentication
  async githubLogin() {
    try {
      const response = await api.get('/auth/github');
      if (response.success && response.authUrl) {
        window.location.href = response.authUrl;
      }
      return response;
    } catch (error) {
      throw error;
    }
  }

  // MetaMask authentication
  async connectMetaMask() {
    try {
      // Check if MetaMask is installed
      if (typeof window.ethereum === 'undefined') {
        throw { success: false, message: 'MetaMask is not installed' };
      }

      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      if (!accounts.length) {
        throw { success: false, message: 'No accounts found' };
      }

      const address = accounts[0];

      // Get nonce from backend
      const nonceResponse = await api.post('/auth/metamask/nonce', { address });
      
      if (!nonceResponse.success) {
        throw nonceResponse;
      }

      // Request signature from MetaMask
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(nonceResponse.message);

      // Verify signature with backend
      const verifyResponse = await api.post('/auth/metamask/verify', {
        address,
        signature,
        message: nonceResponse.message
      });

      return verifyResponse;
    } catch (error) {
      console.error('MetaMask connection error:', error);
      throw error;
    }
  }

  // Get current user
  async getCurrentUser() {
    try {
      return await api.get('/auth/me');
    } catch (error) {
      throw error;
    }
  }

  // Check authentication status
  async checkAuthStatus() {
    try {
      return await api.get('/auth/status');
    } catch (error) {
      throw error;
    }
  }

  // Logout
  async logout() {
    try {
      return await api.post('/auth/logout');
    } catch (error) {
      throw error;
    }
  }

  // Link wallet to existing account
  async linkWallet(address) {
    try {
      // Get provider
      if (typeof window.ethereum === 'undefined') {
        throw { success: false, message: 'MetaMask is not installed' };
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Create message to sign
      const message = `Link wallet ${address} to GolGappe account at ${new Date().toISOString()}`;
      const signature = await signer.signMessage(message);

      return await api.post('/users/link/wallet', {
        address,
        signature,
        message
      });
    } catch (error) {
      throw error;
    }
  }
}

export default new AuthService();