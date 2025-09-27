import axios from 'axios';
import { config } from '../config/index.js';
import { delay } from '../utils/helpers.js';

export class MirrorService {
    constructor() {
        this.mirrorNodeUrl = config.hedera.mirrorNodeUrl;
    }

    async getTopicMessage(topicId, sequenceNumber, maxRetries = 10) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                const url = `${this.mirrorNodeUrl}/api/v1/topics/${topicId}/messages/${sequenceNumber}`;
                const response = await axios.get(url);
                
                if (response.data && response.data.message) {
                    // Decode base64 message
                    const decodedMessage = Buffer.from(response.data.message, 'base64').toString('utf8');
                    return {
                        ...response.data,
                        decodedMessage: JSON.parse(decodedMessage)
                    };
                }
            } catch (error) {
                if (error.response && error.response.status === 404) {
                    console.log(`Message not yet available, retry ${i + 1}/${maxRetries}`);
                    await delay(2000); // Wait 2 seconds before retry
                    continue;
                }
                throw error;
            }
        }
        throw new Error('Message not found after maximum retries');
    }

    async getTopicMessages(topicId, limit = 10) {
        try {
            const url = `${this.mirrorNodeUrl}/api/v1/topics/${topicId}/messages?limit=${limit}&order=desc`;
            const response = await axios.get(url);
            
            return response.data.messages.map(message => ({
                ...message,
                decodedMessage: JSON.parse(Buffer.from(message.message, 'base64').toString('utf8'))
            }));
        } catch (error) {
            console.error('Failed to get topic messages:', error);
            throw error;
        }
    }
}