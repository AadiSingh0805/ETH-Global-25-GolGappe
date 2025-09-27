const { Client, TopicCreateTransaction, TopicMessageSubmitTransaction } = require('@hashgraph/sdk');
const config = require('../config');

const client = Client.forPreviewnet();
client.setOperator(config.operatorId, config.operatorKey);

async function createTopicIfNotExists(topicId) {
    // Logic to check if the topic exists and create it if it doesn't
    // This is a placeholder for the actual implementation
}

async function publishMessageToTopic(topicId, message) {
    const transaction = new TopicMessageSubmitTransaction()
        .setTopicId(topicId)
        .setMessage(JSON.stringify(message));

    const response = await transaction.execute(client);
    return response.getReceipt(client);
}

module.exports = {
    createTopicIfNotExists,
    publishMessageToTopic,
};