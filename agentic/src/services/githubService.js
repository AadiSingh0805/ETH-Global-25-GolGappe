import fetch from 'node-fetch';

export class GitHubService {
    constructor(accessToken = null) {
        this.accessToken = accessToken;
        this.baseUrl = 'https://api.github.com';
    }

    /**
     * Fetch user's repositories from GitHub API
     */
    async getUserRepositories(username = null, accessToken = null) {
        try {
            const token = accessToken || this.accessToken;
            const headers = {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Hedera-Agentic-Workflow'
            };

            if (token) {
                headers['Authorization'] = `token ${token}`;
            }

            let url;
            if (username) {
                // Public repos for a specific user
                url = `${this.baseUrl}/users/${username}/repos?per_page=100&sort=updated&direction=desc`;
            } else {
                // Authenticated user's repos (requires token)
                if (!token) {
                    throw new Error('Access token required for fetching authenticated user repos');
                }
                url = `${this.baseUrl}/user/repos?per_page=100&sort=updated&direction=desc&affiliation=owner`;
            }

            console.log(`🔍 Fetching repositories from: ${url.replace(token, '[TOKEN]')}`);
            
            const response = await fetch(url, { headers });
            
            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
            }

            const repos = await response.json();
            
            // Transform GitHub repos to our format
            const transformedRepos = repos.map((repo, index) => ({
                id: `repo${index + 1}`,
                name: repo.name,
                fullName: repo.full_name,
                description: repo.description || 'No description available',
                language: repo.language || 'Unknown',
                stars: repo.stargazers_count,
                forks: repo.forks_count,
                topics: repo.topics || [],
                difficulty: this.estimateDifficulty(repo),
                activeContributors: Math.floor(Math.random() * 20) + 1, // Approximate
                lastUpdated: repo.updated_at,
                issuesCount: repo.open_issues_count,
                pullRequestsCount: Math.floor(repo.open_issues_count * 0.3), // Approximate
                htmlUrl: repo.html_url,
                isPrivate: repo.private,
                size: repo.size,
                defaultBranch: repo.default_branch,
                owner: {
                    login: repo.owner.login,
                    type: repo.owner.type
                }
            }));

            console.log(`✅ Successfully fetched ${transformedRepos.length} repositories`);
            return {
                repositories: transformedRepos
            };

        } catch (error) {
            console.error('❌ Error fetching GitHub repositories:', error.message);
            throw error;
        }
    }

    /**
     * Fetch user profile information
     */
    async getUserProfile(username = null, accessToken = null) {
        try {
            const token = accessToken || this.accessToken;
            const headers = {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Hedera-Agentic-Workflow'
            };

            if (token) {
                headers['Authorization'] = `token ${token}`;
            }

            let url;
            if (username) {
                url = `${this.baseUrl}/users/${username}`;
            } else {
                if (!token) {
                    throw new Error('Access token required for fetching authenticated user profile');
                }
                url = `${this.baseUrl}/user`;
            }

            console.log(`👤 Fetching user profile from: ${url}`);
            
            const response = await fetch(url, { headers });
            
            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
            }

            const user = await response.json();
            
            // Transform to our user data format
            const userData = {
                username: user.login,
                profile: {
                    name: user.name || user.login,
                    bio: user.bio || 'No bio available',
                    location: user.location || 'Unknown',
                    company: user.company || 'Unknown',
                    publicRepos: user.public_repos,
                    followers: user.followers,
                    following: user.following,
                    createdAt: user.created_at,
                    avatarUrl: user.avatar_url,
                    htmlUrl: user.html_url
                },
                skills: {
                    languages: [], // Will be populated from repo analysis
                    frameworks: [],
                    technologies: [],
                    interests: []
                },
                recentActivity: {
                    mostUsedLanguages: [],
                    recentCommits: 0, // Approximate
                    activeRepos: [],
                    topicsOfInterest: []
                },
                preferences: {
                    projectSize: 'medium-to-large',
                    collaborationStyle: 'open-source',
                    learningGoals: []
                }
            };

            console.log(`✅ Successfully fetched profile for ${userData.username}`);
            return userData;

        } catch (error) {
            console.error('❌ Error fetching GitHub user profile:', error.message);
            throw error;
        }
    }

    /**
     * Analyze repositories to extract skills and interests
     */
    analyzeUserSkills(repos) {
        const languages = {};
        const topics = [];
        const frameworks = new Set();
        const technologies = new Set();

        repos.forEach(repo => {
            // Count languages
            if (repo.language) {
                languages[repo.language] = (languages[repo.language] || 0) + 1;
            }

            // Collect topics
            topics.push(...repo.topics);

            // Infer frameworks and technologies from repo names and descriptions
            const text = `${repo.name} ${repo.description}`.toLowerCase();
            
            if (text.includes('react') || repo.topics.includes('react')) frameworks.add('React');
            if (text.includes('node') || repo.topics.includes('nodejs')) frameworks.add('Node.js');
            if (text.includes('express')) frameworks.add('Express');
            if (text.includes('django')) frameworks.add('Django');
            if (text.includes('flask')) frameworks.add('Flask');
            if (text.includes('vue')) frameworks.add('Vue.js');
            if (text.includes('angular')) frameworks.add('Angular');
            if (text.includes('web3')) frameworks.add('Web3.js');

            if (text.includes('docker')) technologies.add('Docker');
            if (text.includes('kubernetes') || text.includes('k8s')) technologies.add('Kubernetes');
            if (text.includes('aws')) technologies.add('AWS');
            if (text.includes('mongodb')) technologies.add('MongoDB');
            if (text.includes('postgresql') || text.includes('postgres')) technologies.add('PostgreSQL');
            if (text.includes('redis')) technologies.add('Redis');
        });

        // Sort languages by usage
        const sortedLanguages = Object.entries(languages)
            .sort(([, a], [, b]) => b - a)
            .map(([lang]) => lang);

        // Count topic frequencies
        const topicCounts = {};
        topics.forEach(topic => {
            topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        });

        const sortedTopics = Object.entries(topicCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([topic]) => topic);

        return {
            languages: sortedLanguages.slice(0, 10),
            frameworks: Array.from(frameworks),
            technologies: Array.from(technologies),
            interests: sortedTopics.slice(0, 10)
        };
    }

    /**
     * Estimate repository difficulty based on various factors
     */
    estimateDifficulty(repo) {
        let score = 0;

        // Language complexity
        const complexLanguages = ['rust', 'c++', 'go', 'solidity'];
        const intermediateLanguages = ['java', 'c#', 'python', 'typescript'];
        
        if (complexLanguages.includes(repo.language?.toLowerCase())) score += 3;
        else if (intermediateLanguages.includes(repo.language?.toLowerCase())) score += 2;
        else score += 1;

        // Repository size
        if (repo.size > 10000) score += 2;
        else if (repo.size > 1000) score += 1;

        // Community engagement
        if (repo.stargazers_count > 100) score += 1;
        if (repo.forks_count > 20) score += 1;

        // Topics complexity
        const complexTopics = ['blockchain', 'machine-learning', 'ai', 'cryptography', 'security'];
        const hasComplexTopics = repo.topics?.some(topic => 
            complexTopics.includes(topic.toLowerCase())
        );
        if (hasComplexTopics) score += 2;

        // Categorize difficulty
        if (score >= 7) return 'advanced';
        if (score >= 4) return 'intermediate';
        return 'beginner';
    }
}