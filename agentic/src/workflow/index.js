import path from 'path';
import { fileURLToPath } from 'url';
import { HederaClient } from '../hedera/client.js';
import { AIService } from '../services/aiService.js';
import { MirrorService } from '../services/mirrorService.js';
import { loadJsonFile, computeMessageHash, getCurrentTimestamp } from '../utils/helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AgenticWorkflow {
    constructor() {
        this.hederaClient = new HederaClient();
        this.aiService = new AIService();
        this.mirrorService = new MirrorService();
        this.topicId = null;
    }

    async initialize() {
        await this.hederaClient.initialize();
        console.log('Agentic workflow initialized');
    }

    async executeWorkflow() {
        try {
            console.log('Starting agentic AI workflow...');

            // Step 1: Load static data
            const userData = await this.loadGitHubUserData();
            const repoData = await this.loadRepoData();
            console.log('✓ Loaded static GitHub data');

            // Step 2: Get AI recommendations
            const recommendations = await this.aiService.getRecommendations(userData, repoData, 3);
            console.log('✓ Generated AI recommendations:', recommendations);

            // Step 3: Create HCS topic (if needed)
            if (!this.topicId) {
                this.topicId = await this.hederaClient.createTopic('AI Repository Recommendations');
                console.log('✓ Created HCS topic:', this.topicId.toString());
            }

            // Step 4: Submit to HCS
            const messageJson = JSON.stringify(recommendations);
            const messageHash = computeMessageHash(messageJson);
            
            const hcsResult = await this.hederaClient.submitMessage(this.topicId, messageJson);
            console.log('✓ Submitted to HCS:', hcsResult);

            // Step 5: Frontend flow - retrieve from Mirror Node
            console.log('Waiting for message to propagate to Mirror Node...');
            const mirrorResult = await this.mirrorService.getTopicMessage(
                hcsResult.topicId, 
                hcsResult.sequenceNumber
            );
            console.log('✓ Retrieved from Mirror Node:', mirrorResult.decodedMessage);

            // Return complete workflow result
            return {
                recommendations,
                messageHash,
                hcsResult,
                mirrorResult: mirrorResult.decodedMessage,
                success: true
            };

        } catch (error) {
            console.error('Workflow failed:', error);
            return {
                error: error.message,
                success: false
            };
        }
    }

    async loadGitHubUserData() {
        const dataPath = path.join(__dirname, '../../data/github-user.json');
        return await loadJsonFile(dataPath);
    }

    async loadRepoData() {
        const dataPath = path.join(__dirname, '../../data/repo-list.json');
        return await loadJsonFile(dataPath);
    }

    async cleanup() {
        await this.hederaClient.close();
        console.log('Workflow cleanup completed');
    }
}