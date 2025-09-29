import path from 'path';
import { fileURLToPath } from 'url';
import { HederaClient } from '../hedera/client.js';
import { AIService } from '../services/aiService.js';
import { MirrorService } from '../services/mirrorService.js';
import { GitHubService } from '../services/githubService.js';
import { loadJsonFile, computeMessageHash, getCurrentTimestamp } from '../utils/helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AgenticWorkflow {
    constructor(options = {}) {
        this.hederaClient = new HederaClient();
        this.aiService = new AIService();
        this.mirrorService = new MirrorService();
        this.githubService = new GitHubService();
        this.topicId = null;
        
        // Configuration options
        this.options = {
            githubUsername: options.githubUsername || null,
            githubToken: options.githubToken || process.env.GITHUB_TOKEN || null,
            useStaticData: options.useStaticData || false,
            ...options
        };
    }

    async initialize() {
        await this.hederaClient.initialize();
        console.log('Agentic workflow initialized');
    }

    async executeWorkflow() {
        try {
            console.log('Starting agentic AI workflow...');

            // Step 1: Load user data and repositories
            let userData, repoData;
            
            if (this.options.useStaticData) {
                // Use static data files (fallback)
                userData = await this.loadGitHubUserData();
                repoData = await this.loadRepoData();
                console.log('✓ Loaded static GitHub data');
            } else {
                // Fetch real data from GitHub API
                console.log('🔍 Fetching real GitHub data...');
                
                // Get user profile
                userData = await this.githubService.getUserProfile(
                    this.options.githubUsername, 
                    this.options.githubToken
                );
                
                // Get user repositories
                repoData = await this.githubService.getUserRepositories(
                    this.options.githubUsername, 
                    this.options.githubToken
                );
                
                // Enhance user data with skills analysis
                const skills = this.githubService.analyzeUserSkills(repoData.repositories);
                userData.skills = {
                    ...userData.skills,
                    ...skills
                };
                
                userData.recentActivity = {
                    ...userData.recentActivity,
                    mostUsedLanguages: skills.languages.slice(0, 3),
                    activeRepos: repoData.repositories.slice(0, 5).map(repo => repo.name),
                    topicsOfInterest: skills.interests.slice(0, 10)
                };
                
                console.log('✓ Loaded real GitHub data');
                console.log(`  - User: ${userData.username}`);
                console.log(`  - Repositories: ${repoData.repositories.length}`);
                console.log(`  - Top languages: ${skills.languages.slice(0, 3).join(', ')}`);
                console.log(`  - Top topics: ${skills.interests.slice(0, 5).join(', ')}`);
            }

            // Step 2: Get AI recommendations using Perplexity
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
                userData,
                repoData,
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