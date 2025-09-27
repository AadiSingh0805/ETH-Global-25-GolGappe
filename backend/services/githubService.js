import axios from 'axios';

class GitHubService {
  constructor() {
    this.baseURL = 'https://api.github.com';
  }

  async getUserRepositories(accessToken) {
    try {
      const response = await axios.get(`${this.baseURL}/user/repos`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'ETH-Global-GolGappe'
        },
        params: {
          sort: 'updated',
          per_page: 100,
          type: 'owner' // Only repositories owned by the user
        }
      });

      return {
        success: true,
        data: response.data.map(repo => ({
          id: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description || '',
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          language: repo.language,
          isPrivate: repo.private,
          htmlUrl: repo.html_url,
          cloneUrl: repo.clone_url,
          defaultBranch: repo.default_branch,
          openIssues: repo.open_issues_count,
          lastUpdated: repo.updated_at,
          createdAt: repo.created_at,
          topics: repo.topics || [],
          hasIssues: repo.has_issues,
          size: repo.size,
          owner: {
            login: repo.owner.login,
            id: repo.owner.id,
            avatar: repo.owner.avatar_url
          }
        }))
      };
    } catch (error) {
      console.error('GitHub API Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch repositories',
        status: error.response?.status
      };
    }
  }

  async getRepositoryIssues(owner, repo, accessToken) {
    try {
      const response = await axios.get(`${this.baseURL}/repos/${owner}/${repo}/issues`, {
        headers: {
          'Authorization': accessToken ? `Bearer ${accessToken}` : undefined,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'ETH-Global-GolGappe'
        },
        params: {
          state: 'open',
          per_page: 100,
          sort: 'updated',
          direction: 'desc'
        }
      });

      return {
        success: true,
        data: response.data.map(issue => ({
          id: issue.id,
          number: issue.number,
          title: issue.title,
          body: issue.body || '',
          state: issue.state,
          labels: issue.labels.map(label => ({
            id: label.id,
            name: label.name,
            color: label.color,
            description: label.description
          })),
          assignees: issue.assignees.map(assignee => ({
            id: assignee.id,
            login: assignee.login,
            avatar: assignee.avatar_url
          })),
          createdAt: issue.created_at,
          updatedAt: issue.updated_at,
          htmlUrl: issue.html_url,
          user: {
            id: issue.user.id,
            login: issue.user.login,
            avatar: issue.user.avatar_url
          },
          comments: issue.comments
        }))
      };
    } catch (error) {
      // Don't log 404s as errors since they're expected for private/missing repos
      if (error.response?.status !== 404) {
        console.error('GitHub Issues API Error:', error.response?.data || error.message);
      }
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch repository issues',
        status: error.response?.status
      };
    }
  }

  async getRepositoryMetadata(owner, repo, accessToken) {
    try {
      const response = await axios.get(`${this.baseURL}/repos/${owner}/${repo}`, {
        headers: {
          'Authorization': accessToken ? `Bearer ${accessToken}` : undefined,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'ETH-Global-GolGappe'
        }
      });

      return {
        success: true,
        data: {
          id: response.data.id,
          name: response.data.name,
          fullName: response.data.full_name,
          description: response.data.description || '',
          stars: response.data.stargazers_count,
          forks: response.data.forks_count,
          language: response.data.language,
          isPrivate: response.data.private,
          htmlUrl: response.data.html_url,
          cloneUrl: response.data.clone_url,
          defaultBranch: response.data.default_branch,
          openIssues: response.data.open_issues_count,
          lastUpdated: response.data.updated_at,
          createdAt: response.data.created_at,
          topics: response.data.topics || [],
          hasIssues: response.data.has_issues,
          size: response.data.size,
          owner: {
            login: response.data.owner.login,
            id: response.data.owner.id,
            avatar: response.data.owner.avatar_url
          }
        }
      };
    } catch (error) {
      // Don't log 404s as errors since they're expected for private/missing repos
      if (error.response?.status !== 404) {
        console.error('GitHub Repository API Error:', error.response?.data || error.message);
      }
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch repository information',
        status: error.response?.status
      };
    }
  }

  async getUserProfile(accessToken) {
    try {
      const response = await axios.get(`${this.baseURL}/user`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'ETH-Global-GolGappe'
        }
      });

      return {
        success: true,
        data: {
          id: response.data.id,
          login: response.data.login,
          name: response.data.name,
          email: response.data.email,
          avatar: response.data.avatar_url,
          bio: response.data.bio,
          publicRepos: response.data.public_repos,
          publicGists: response.data.public_gists,
          followers: response.data.followers,
          following: response.data.following,
          createdAt: response.data.created_at,
          updatedAt: response.data.updated_at,
          htmlUrl: response.data.html_url
        }
      };
    } catch (error) {
      console.error('GitHub User Profile API Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch user profile',
        status: error.response?.status
      };
    }
  }
}

export default new GitHubService();