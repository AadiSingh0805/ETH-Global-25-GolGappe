import dotenv from 'dotenv';
dotenv.config();

export const config = {
  hedera: {
    network: 'testnet',
    accountId: process.env.HEDERA_ACCOUNT_ID || '0.0.123456',
    privateKey: process.env.HEDERA_PRIVATE_KEY || '',
    mirrorNodeUrl: 'https://testnet.mirrornode.hedera.com'
  },
  perplexity: {
    apiKey: process.env.PERPLEXITY_API_KEY || '',
    endpoint: 'https://api.perplexity.ai/chat/completions',
    model: 'sonar'
  }
};