require('@nomicfoundation/hardhat-toolbox');

module.exports = {
  solidity: {
    version: '0.8.24',
    settings: {
      evmVersion: 'cancun',
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 31337,
      accounts: {
        mnemonic: 'test test test test test test test test test test test junk'
      }
    },
    localhost: {
      url: 'http://127.0.0.1:8545'
    }
  }
};
