// Create a quick decoder script
// filepath: c:\Users\Aadi\Desktop\Projs\ETH-Global-25-GolGappe\agentic\decode.js

// Your latest topic ID from the successful run
const topicId = '0.0.6916751';
const sequenceNumber = 1;

async function decodeMessage() {
    try {
        const response = await fetch(
            `https://testnet.mirrornode.hedera.com/api/v1/topics/${topicId}/messages/${sequenceNumber}`
        );
        const data = await response.json();
        
        console.log('🔍 Raw Mirror Node Response:');
        console.log(JSON.stringify(data, null, 2));
        
        console.log('\n📋 Decoded Recommendation:');
        const decodedMessage = JSON.parse(Buffer.from(data.message, 'base64').toString('utf8'));
        console.log(JSON.stringify(decodedMessage, null, 2));
        
        console.log('\n🎯 Recommended Repositories:');
        decodedMessage.recommendedRepos.forEach((repo, index) => {
            console.log(`${index + 1}. ${repo}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

decodeMessage();