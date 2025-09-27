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

  // MetaMask nonce generation
  async getMetaMaskNonce(address) {
    try {
      return await api.post('/auth/metamask/nonce', { address });
    } catch (error) {
      throw error;
    }
  }

  // MetaMask signature verification
  async verifyMetaMaskSignature(address, signature, message) {
    try {
      return await api.post('/auth/metamask/verify', {
        address,
        signature,
        message
      });
    } catch (error) {
      throw error;
    }
  }

  // Full MetaMask connection flow
  async connectMetaMask() {
    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please connect your MetaMask wallet.');
      }

      const address = accounts[0];

      // Get nonce
      const nonceResponse = await this.getMetaMaskNonce(address);
      if (!nonceResponse.success) {
        throw new Error(nonceResponse.message || 'Failed to generate nonce');
      }

      // Sign message
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [nonceResponse.message, address]
      });

      // Verify and authenticate
      return await this.verifyMetaMaskSignature(address, signature, nonceResponse.message);
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