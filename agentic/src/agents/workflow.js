function runWorkflow(githubUserInfo, repoList) {
    // Load the Hedera client
    const HederaClient = require('../hedera/client').HederaClient;
    const hederaClient = new HederaClient();

    // Load the AI service
    const callLLM = require('../services/aiService').callLLM;

    // Call the LLM with the GitHub data
    callLLM(githubUserInfo, repoList)
        .then(recommendations => {
            // Publish recommendations to Hedera Consensus Service
            const transactions = require('../hedera/transactions');
            return transactions.publishRecommendations(recommendations, hederaClient);
        })
        .then(() => {
            console.log('Recommendations published successfully.');
        })
        .catch(error => {
            console.error('Error during workflow execution:', error);
        });
}

module.exports = { runWorkflow };