import { MirrorService } from '../services/mirrorService.js';

export class FrontendDemo {
    constructor() {
        this.mirrorService = new MirrorService();
    }

    async displayRecommendations(topicId, sequenceNumber) {
        try {
            console.log('\n=== Frontend Demo: Fetching Recommendations ===');
            
            const message = await this.mirrorService.getTopicMessage(topicId, sequenceNumber);
            const recommendations = message.decodedMessage;
            
            console.log('\n📊 Repository Recommendations Dashboard');
            console.log('=====================================');
            console.log(`👤 User: ${recommendations.user}`);
            console.log(`⏰ Generated: ${recommendations.timestamp}`);
            console.log('\n🎯 Recommended Repositories:');
            
            recommendations.recommendedRepos.forEach((repo, index) => {
                console.log(`${index + 1}. ${repo}`);
            });
            
            console.log('\n✅ Data retrieved from Hedera Mirror Node');
            console.log(`📍 Topic ID: ${topicId}`);
            console.log(`🔢 Sequence Number: ${sequenceNumber}`);
            
            return recommendations;
        } catch (error) {
            console.error('Frontend demo failed:', error);
            throw error;
        }
    }

    async listRecentRecommendations(topicId, limit = 5) {
        try {
            console.log('\n=== Recent Recommendations ===');
            
            const messages = await this.mirrorService.getTopicMessages(topicId, limit);
            
            messages.forEach((message, index) => {
                const recommendation = message.decodedMessage;
                console.log(`\n${index + 1}. User: ${recommendation.user}`);
                console.log(`   Repos: ${recommendation.recommendedRepos.join(', ')}`);
                console.log(`   Time: ${recommendation.timestamp}`);
            });
            
        } catch (error) {
            console.error('Failed to list recent recommendations:', error);
            throw error;
        }
    }
}