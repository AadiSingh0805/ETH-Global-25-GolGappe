import { 
    Client, 
    PrivateKey, 
    AccountId, 
    TopicCreateTransaction,
    TopicMessageSubmitTransaction,
    TopicId,
    AccountBalanceQuery
} from '@hashgraph/sdk';
import { config } from '../config/index.js';

export class HederaClient {
    constructor() {
        this.client = null;
        this.accountId = null;
        this.privateKey = null;
    }

    async initialize() {
        try {
            this.accountId = AccountId.fromString(config.hedera.accountId);
            this.privateKey = PrivateKey.fromStringECDSA(config.hedera.privateKey);

            // Use testnet instead of previewnet
            this.client = Client.forTestnet().setOperator(
                this.accountId,
                this.privateKey
            );

            // Validate account exists and has balance
            await this.validateAccount();

            console.log('Hedera client initialized for Testnet');
            return true;
        } catch (error) {
            console.error('Failed to initialize Hedera client:', error.message);
            throw error;
        }
    }

    async validateAccount() {
        try {
            const balance = await new AccountBalanceQuery()
                .setAccountId(this.accountId)
                .execute(this.client);

            console.log(`Account ${this.accountId} balance: ${balance.hbars.toString()}`);
            
            if (balance.hbars.toTinybars().toNumber() === 0) {
                throw new Error('Account has zero HBAR balance. Please fund your account at portal.hedera.com');
            }
        } catch (error) {
            if (error.message.includes('ACCOUNT_ID_DOES_NOT_EXIST')) {
                throw new Error(`Account ${this.accountId} does not exist on Testnet. Please create a new account at portal.hedera.com`);
            }
            throw error;
        }
    }

    async createTopic(memo = 'Agentic AI Recommendations Topic') {
        try {
            const transaction = new TopicCreateTransaction()
                .setTopicMemo(memo)
                .setMaxTransactionFee(100_000_000); // 1 HBAR max fee

            const txResponse = await transaction.execute(this.client);
            const receipt = await txResponse.getReceipt(this.client);
            
            const topicId = receipt.topicId;
            console.log(`Created topic: ${topicId}`);
            
            return topicId;
        } catch (error) {
            console.error('Failed to create topic:', error);
            throw error;
        }
    }

    async submitMessage(topicId, message) {
        try {
            const transaction = new TopicMessageSubmitTransaction()
                .setTopicId(topicId)
                .setMessage(message)
                .setMaxTransactionFee(100_000_000); // 1 HBAR max fee

            const txResponse = await transaction.execute(this.client);
            const receipt = await txResponse.getReceipt(this.client);
            
            const result = {
                topicId: topicId.toString(),
                sequenceNumber: receipt.topicSequenceNumber,
                consensusTimestamp: receipt.consensusTimestamp,
                transactionId: txResponse.transactionId.toString()
            };

            console.log('Message submitted to HCS:', result);
            return result;
        } catch (error) {
            console.error('Failed to submit message:', error);
            throw error;
        }
    }

    async close() {
        if (this.client) {
            this.client.close();
        }
    }
}