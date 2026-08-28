import { ethers } from 'ethers';

class WalletIntegrationService {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.userAddress = null;
    }

    /**
     * Connect using MetaMask (Injected Provider)
     */
    async connectMetaMask() {
        if (typeof window !== 'undefined' && typeof window.ethereum !== 'undefined') {
            try {
                // Request account access from MetaMask
                await window.ethereum.request({ method: 'eth_requestAccounts' });
                
                // Wrap the injected provider with ethers.js (v6 BrowserProvider)
                const browserProvider = new ethers.BrowserProvider(window.ethereum);
                this.signer = await browserProvider.getSigner();
                this.userAddress = await this.signer.getAddress();
                this.provider = browserProvider;
                
                console.log("Connected to MetaMask:", this.userAddress);
                return this.userAddress;
            } catch (error) {
                console.error("MetaMask connection failed:", error);
                throw error;
            }
        } else {
            if (typeof window !== 'undefined') {
                alert("Please install MetaMask!");
            }
            throw new Error("MetaMask not found");
        }
    }

    /**
     * Connect using WalletConnect (Dynamically imported to avoid page load crashes)
     */
    async connectWalletConnect() {
        try {
            // Dynamically import WalletConnectProvider on demand
            const WalletConnectModule = await import('@walletconnect/web3-provider');
            const WalletConnectProvider = WalletConnectModule.default || WalletConnectModule;

            // Configure the WalletConnect Provider
            const walletConnectProvider = new WalletConnectProvider({
                rpc: {
                    1: "https://cloudflare-eth.com/", 
                    314159: "https://api.calibration.node.glif.io/rpc/v1" 
                },
                qrcode: true,
            });

            // Enable session (triggers QR Code modal)
            await walletConnectProvider.enable();

            // Wrap the provider with ethers.js (v6 uses BrowserProvider for EIP-1193 providers)
            const web3Provider = new ethers.BrowserProvider(walletConnectProvider);
            this.signer = await web3Provider.getSigner();
            this.userAddress = await this.signer.getAddress();
            this.provider = web3Provider;

            console.log("Connected via WalletConnect:", this.userAddress);
            return this.userAddress;
        } catch (error) {
            console.error("WalletConnect connection failed:", error);
            throw error;
        }
    }

    /**
     * Listen for account or network changes
     */
    setupEventListeners(callback) {
        if (typeof window !== 'undefined' && window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                console.log("Account changed:", accounts[0]);
                if (callback) callback(accounts[0]);
            });

            window.ethereum.on('chainChanged', (chainId) => {
                console.log("Network changed. Refreshing page...");
                window.location.reload();
            });
        }
    }
}

export default new WalletIntegrationService();
