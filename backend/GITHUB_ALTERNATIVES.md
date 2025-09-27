# GitHub Alternative Services Dependencies

## Required Dependencies

To use the GitHub alternative services, you need to install these additional packages:

```bash
# Navigate to backend directory
cd backend

# Install required dependencies
npm install cheerio axios jsdom
```

## Dependency Breakdown

1. **cheerio** - For web scraping GitHub pages
   - Used in: `githubScrapingService.js`
   - Purpose: Parse HTML and extract repository data

2. **axios** - For HTTP requests (likely already installed)
   - Used in: All services
   - Purpose: Make API calls and fetch web content

3. **jsdom** - For DOM manipulation in Node.js
   - Used in: `githubScrapingService.js`
   - Purpose: Create virtual DOM for HTML processing

## Update package.json

Add these to your backend/package.json dependencies:

```json
{
  "dependencies": {
    "cheerio": "^1.0.0-rc.12",
    "axios": "^1.6.0",
    "jsdom": "^23.0.0"
  }
}
```

## Service Files Created

1. **githubScrapingService.js** - Web scraping service
2. **githubRawService.js** - Raw content access service
3. **alternativeGitHubService.js** - Third-party API service
4. **unifiedGitHubService.js** - Combined service using all methods
5. **examples/githubServiceExamples.js** - Usage examples

## Integration Guide

### Option 1: Replace existing GitHub service
Replace your current `githubService.js` with `unifiedGitHubService.js`

### Option 2: Use as fallback
Keep existing service and use alternatives when GitHub API fails

### Option 3: Selective usage
Use specific services based on your needs:
- Scraping for public repo metadata
- Raw service for file content
- Alternative APIs for additional data

## Usage Example

```javascript
import UnifiedGitHubService from './services/unifiedGitHubService.js';

const githubService = new UnifiedGitHubService();

// Get repository metadata
const repoData = await githubService.getRepositoryMetadata('owner', 'repo');

// Get user repositories
const userRepos = await githubService.getUserRepositories('username');

// Get repository issues
const issues = await githubService.getRepositoryIssues('owner', 'repo');
```

## Rate Limiting Considerations

- **Web Scraping**: No rate limits, but respect robots.txt
- **Raw Content**: No authentication required, minimal limits
- **Third-party APIs**: Depends on service (Libraries.io has limits)

## Error Handling

All services return standardized responses:
```javascript
{
  success: boolean,
  data: object | null,
  error: string | null
}
```

## Production Considerations

1. **Caching**: Implement Redis or memory caching for frequently accessed data
2. **Proxy**: Use rotating proxies for scraping to avoid IP blocks
3. **Monitoring**: Track success rates of different methods
4. **Fallbacks**: Chain methods in order of reliability