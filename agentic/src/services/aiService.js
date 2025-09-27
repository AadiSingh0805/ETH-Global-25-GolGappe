import axios from 'axios';
import { config } from '../config/index.js';

export class AIService {
    constructor() {
        this.perplexityEndpoint = config.perplexity.endpoint;
        this.apiKey = config.perplexity.apiKey;
        this.model = config.perplexity.model;
    }

    async getRecommendations(userData, repoData, topN = 3) {
        try {
            // Check if Perplexity API key is configured
            if (!this.apiKey || this.apiKey === 'your_perplexity_api_key_here' || this.apiKey === '') {
                console.log('Perplexity API key not configured, using fallback algorithm');
                return this.getFallbackRecommendations(userData, repoData, topN);
            }

            const prompt = this.buildPrompt(userData, repoData, topN);
            
            const response = await axios.post(this.perplexityEndpoint, {
                model: this.model,
                messages: [
                    {
                        role: "system",
                        content: "You are a GitHub repository recommendation system. Respond only with valid JSON in the exact format requested. Do not include any explanations or markdown formatting."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 500,
                temperature: 0.7,
                top_p: 0.9,
                return_citations: false,
                return_images: false,
                return_related_questions: false
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            });

            const aiContent = response.data.choices[0].message.content;
            const recommendations = this.parseRecommendations(aiContent, userData.username, topN);
            console.log('✓ Generated Perplexity recommendations');
            return recommendations;
        } catch (error) {
            console.error('Failed to get Perplexity recommendations:', error.response?.data || error.message);
            console.log('Falling back to rule-based recommendations');
            return this.getFallbackRecommendations(userData, repoData, topN);
        }
    }

    buildPrompt(userData, repoData, topN) {
        return `
You are a GitHub repository recommendation system. Based on the user profile and available repositories, recommend the top ${topN} repositories that best match the user's skills and interests.

User Profile:
Username: ${userData.username}
Skills: ${userData.skills.languages.join(', ')}
Interests: ${userData.skills.interests.join(', ')}
Recent Activity: ${userData.recentActivity.topicsOfInterest.join(', ')}

Available Repositories:
${repoData.repositories.map(repo => 
    `- ${repo.name}: ${repo.description} (${repo.language}, Topics: ${repo.topics.join(', ')})`
).join('\n')}

Please respond with ONLY a JSON object in this exact format:
{
  "user": "${userData.username}",
  "recommendedRepos": ["repo_name1", "repo_name2", "repo_name3"],
  "timestamp": "${new Date().toISOString()}"
}

Do not include any explanation, markdown formatting, or additional text - just the raw JSON.
`;
    }

    parseRecommendations(aiResponse, username, topN) {
        try {
            // Clean the response and try to extract JSON
            let cleanResponse = aiResponse.trim();
            
            // Remove markdown code blocks if present
            cleanResponse = cleanResponse.replace(/```json\s*|\s*```/g, '');
            cleanResponse = cleanResponse.replace(/```\s*|\s*```/g, '');
            
            // Try to find JSON object in the response
            const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.recommendedRepos && Array.isArray(parsed.recommendedRepos)) {
                    return {
                        user: username,
                        recommendedRepos: parsed.recommendedRepos.slice(0, topN),
                        timestamp: new Date().toISOString()
                    };
                }
            }
            throw new Error('Invalid AI response format');
        } catch (error) {
            console.error('Failed to parse Perplexity recommendations:', error);
            throw error;
        }
    }

    getFallbackRecommendations(userData, repoData, topN) {
        console.log('Using fallback recommendation algorithm');
        
        const userLanguages = userData.skills.languages.map(lang => lang.toLowerCase());
        const userInterests = userData.skills.interests.map(interest => interest.toLowerCase());
        const userTopics = userData.recentActivity.topicsOfInterest;

        const scoredRepos = repoData.repositories.map(repo => {
            let score = 0;

            // Language match
            if (userLanguages.includes(repo.language.toLowerCase())) {
                score += 3;
            }

            // Topic/interest match
            repo.topics.forEach(topic => {
                if (userTopics.includes(topic) || 
                    userInterests.some(interest => interest.includes(topic) || topic.includes(interest))) {
                    score += 2;
                }
            });

            // Activity level (more stars/forks = more points)
            score += Math.log(repo.stars + 1) * 0.1;
            score += Math.log(repo.forks + 1) * 0.05;

            return { ...repo, score };
        });

        const topRepos = scoredRepos
            .sort((a, b) => b.score - a.score)
            .slice(0, topN)
            .map(repo => repo.name);

        return {
            user: userData.username,
            recommendedRepos: topRepos,
            timestamp: new Date().toISOString()
        };
    }
}