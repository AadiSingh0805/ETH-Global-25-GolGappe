import fetch from 'node-fetch';

class GitHubService {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.baseURL = 'https://api.github.com';
    this.headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'GolGappe-Backend'
    };
  }

  async makeRequest(endpoint, options = {}) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: this.headers,
        ...options
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`GitHub API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Get user's repositories
  async getUserRepos(params = {}) {
    const queryParams = new URLSearchParams({
      type: 'all',
      sort: 'updated',
      per_page: 100,
      ...params
    });

    return await this.makeRequest(`/user/repos?${queryParams}`);
  }

  // Get specific repository
  async getRepo(owner, repo) {
    return await this.makeRequest(`/repos/${owner}/${repo}`);
  }

  // Get repository issues
  async getRepoIssues(owner, repo, params = {}) {
    const queryParams = new URLSearchParams({
      state: 'all',
      sort: 'updated',
      per_page: 100,
      ...params
    });

    return await this.makeRequest(`/repos/${owner}/${repo}/issues?${queryParams}`);
  }

  // Get specific issue
  async getIssue(owner, repo, issueNumber) {
    return await this.makeRequest(`/repos/${owner}/${repo}/issues/${issueNumber}`);
  }

  // Get issue comments
  async getIssueComments(owner, repo, issueNumber) {
    return await this.makeRequest(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`);
  }

  // Get repository contributors
  async getRepoContributors(owner, repo) {
    return await this.makeRequest(`/repos/${owner}/${repo}/contributors`);
  }

  // Get repository languages
  async getRepoLanguages(owner, repo) {
    return await this.makeRequest(`/repos/${owner}/${repo}/languages`);
  }

  // Get repository topics
  async getRepoTopics(owner, repo) {
    const headers = {
      ...this.headers,
      'Accept': 'application/vnd.github.mercy-preview+json'
    };

    return await this.makeRequest(`/repos/${owner}/${repo}/topics`, { headers });
  }

  // Get repository statistics
  async getRepoStats(owner, repo) {
    const [repo_data, contributors, languages, topics] = await Promise.all([
      this.getRepo(owner, repo),
      this.getRepoContributors(owner, repo).catch(() => []),
      this.getRepoLanguages(owner, repo).catch(() => {}),
      this.getRepoTopics(owner, repo).catch(() => ({ names: [] }))
    ]);

    return {
      ...repo_data,
      contributors_count: contributors.length,
      languages,
      topics: topics.names || []
    };
  }

  // Get user profile
  async getUser() {
    return await this.makeRequest('/user');
  }

  // Get user organizations
  async getUserOrgs() {
    return await this.makeRequest('/user/orgs');
  }

  // Search repositories
  async searchRepos(query, params = {}) {
    const queryParams = new URLSearchParams({
      q: query,
      sort: 'stars',
      order: 'desc',
      per_page: 30,
      ...params
    });

    return await this.makeRequest(`/search/repositories?${queryParams}`);
  }

  // Get repository pull requests
  async getRepoPullRequests(owner, repo, params = {}) {
    const queryParams = new URLSearchParams({
      state: 'all',
      sort: 'updated',
      per_page: 100,
      ...params
    });

    return await this.makeRequest(`/repos/${owner}/${repo}/pulls?${queryParams}`);
  }

  // Create issue (for automated issue creation)
  async createIssue(owner, repo, title, body, labels = [], assignees = []) {
    return await this.makeRequest(`/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      body: JSON.stringify({
        title,
        body,
        labels,
        assignees
      })
    });
  }

  // Update issue
  async updateIssue(owner, repo, issueNumber, updates) {
    return await this.makeRequest(`/repos/${owner}/${repo}/issues/${issueNumber}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  // Add comment to issue
  async addIssueComment(owner, repo, issueNumber, body) {
    return await this.makeRequest(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body })
    });
  }

  // Get repository README
  async getRepoReadme(owner, repo) {
    try {
      const response = await this.makeRequest(`/repos/${owner}/${repo}/readme`);
      // Decode base64 content
      const content = Buffer.from(response.content, 'base64').toString('utf-8');
      return {
        ...response,
        decoded_content: content
      };
    } catch (error) {
      return null;
    }
  }

  // Get repository file content
  async getFileContent(owner, repo, path) {
    try {
      const response = await this.makeRequest(`/repos/${owner}/${repo}/contents/${path}`);
      if (response.type === 'file') {
        response.decoded_content = Buffer.from(response.content, 'base64').toString('utf-8');
      }
      return response;
    } catch (error) {
      return null;
    }
  }

  // Get repository commits
  async getRepoCommits(owner, repo, params = {}) {
    const queryParams = new URLSearchParams({
      per_page: 100,
      ...params
    });

    return await this.makeRequest(`/repos/${owner}/${repo}/commits?${queryParams}`);
  }

  // Get detailed repository information for bounty platform
  async getRepoForBountyPlatform(owner, repo) {
    try {
      const [
        repoData,
        issues,
        contributors,
        languages,
        topics,
        readme,
        commits
      ] = await Promise.all([
        this.getRepo(owner, repo),
        this.getRepoIssues(owner, repo, { state: 'open' }),
        this.getRepoContributors(owner, repo).catch(() => []),
        this.getRepoLanguages(owner, repo).catch(() => {}),
        this.getRepoTopics(owner, repo).catch(() => ({ names: [] })),
        this.getRepoReadme(owner, repo),
        this.getRepoCommits(owner, repo, { per_page: 10 }).catch(() => [])
      ]);

      // Filter issues to exclude pull requests
      const actualIssues = issues.filter(issue => !issue.pull_request);

      return {
        repository: {
          id: repoData.id,
          name: repoData.name,
          full_name: repoData.full_name,
          owner: repoData.owner,
          description: repoData.description,
          url: repoData.html_url,
          clone_url: repoData.clone_url,
          ssh_url: repoData.ssh_url,
          default_branch: repoData.default_branch,
          created_at: repoData.created_at,
          updated_at: repoData.updated_at,
          stars: repoData.stargazers_count,
          forks: repoData.forks_count,
          watchers: repoData.watchers_count,
          size: repoData.size,
          language: repoData.language,
          languages,
          topics: topics.names || [],
          license: repoData.license,
          is_private: repoData.private,
          has_issues: repoData.has_issues,
          has_projects: repoData.has_projects,
          has_wiki: repoData.has_wiki
        },
        issues: actualIssues.map(issue => ({
          id: issue.id,
          number: issue.number,
          title: issue.title,
          body: issue.body,
          state: issue.state,
          labels: issue.labels,
          assignees: issue.assignees,
          creator: issue.user,
          created_at: issue.created_at,
          updated_at: issue.updated_at,
          url: issue.html_url,
          comments_count: issue.comments
        })),
        contributors: contributors.map(contributor => ({
          id: contributor.id,
          login: contributor.login,
          avatar_url: contributor.avatar_url,
          contributions: contributor.contributions,
          url: contributor.html_url
        })),
        readme: readme ? {
          content: readme.decoded_content,
          download_url: readme.download_url
        } : null,
        recent_commits: commits.slice(0, 5).map(commit => ({
          sha: commit.sha,
          message: commit.commit.message,
          author: commit.commit.author,
          date: commit.commit.author.date,
          url: commit.html_url
        }))
      };
    } catch (error) {
      console.error('Error fetching repository for bounty platform:', error);
      throw error;
    }
  }
}

export default GitHubService;