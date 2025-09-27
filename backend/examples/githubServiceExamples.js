import UnifiedGitHubService from '../services/unifiedGitHubService.js';

// Example usage of the Unified GitHub Service
const gitHubService = new UnifiedGitHubService();

// Example 1: Get repository metadata
async function exampleGetRepoMetadata() {
  try {
    const result = await gitHubService.getRepositoryMetadata('microsoft', 'vscode');
    
    if (result.success) {
      console.log('Repository Metadata:', result.data);
      console.log('Data Sources Used:', result.sources);
    } else {
      console.log('Failed to fetch metadata:', result.error);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Example 2: Get user repositories
async function exampleGetUserRepos() {
  try {
    const result = await gitHubService.getUserRepositories('torvalds');
    
    if (result.success) {
      console.log(`Found ${result.data.length} repositories:`);
      result.data.forEach(repo => {
        console.log(`- ${repo.name}: ${repo.description}`);
      });
    } else {
      console.log('Failed to fetch user repositories:', result.error);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Example 3: Get repository issues
async function exampleGetRepoIssues() {
  try {
    const result = await gitHubService.getRepositoryIssues('facebook', 'react');
    
    if (result.success) {
      console.log(`Found ${result.data.length} issues:`);
      result.data.slice(0, 5).forEach(issue => {
        console.log(`#${issue.number}: ${issue.title}`);
      });
    } else {
      console.log('Failed to fetch issues:', result.error);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Example 4: Batch process repositories
async function exampleBatchProcess() {
  const repositories = [
    { owner: 'facebook', repo: 'react' },
    { owner: 'microsoft', repo: 'typescript' },
    { owner: 'nodejs', repo: 'node' }
  ];

  try {
    const results = await gitHubService.batchGetRepositories(repositories);
    
    results.forEach(result => {
      if (result.success) {
        console.log(`${result.owner}/${result.repo}: ⭐ ${result.data.stars} stars`);
      } else {
        console.log(`${result.owner}/${result.repo}: Failed to fetch`);
      }
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

// Integration with your existing repos.js route
export function integrateWithExistingRoute() {
  // Add this to your backend/routes/repos.js file
  
  const routeExample = `
  import UnifiedGitHubService from '../services/unifiedGitHubService.js';
  
  const gitHubService = new UnifiedGitHubService();
  
  // New route to get GitHub data without official API
  router.get('/github/:owner/:repo', async (req, res) => {
    try {
      const { owner, repo } = req.params;
      
      const result = await gitHubService.getRepositoryMetadata(owner, repo);
      
      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          sources: result.sources
        });
      } else {
        res.status(404).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  
  // Route to get user repositories
  router.get('/github/user/:username', async (req, res) => {
    try {
      const { username } = req.params;
      
      const result = await gitHubService.getUserRepositories(username);
      
      if (result.success) {
        res.json({
          success: true,
          data: result.data
        });
      } else {
        res.status(404).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  `;
  
  return routeExample;
}

// Run examples (uncomment to test)
// exampleGetRepoMetadata();
// exampleGetUserRepos();
// exampleGetRepoIssues();
// exampleBatchProcess();

export {
  exampleGetRepoMetadata,
  exampleGetUserRepos,
  exampleGetRepoIssues,
  exampleBatchProcess
};