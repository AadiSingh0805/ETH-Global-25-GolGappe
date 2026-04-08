require('@nomicfoundation/hardhat-toolbox');

module.exports = {
  solidity: '0.8.24',
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
