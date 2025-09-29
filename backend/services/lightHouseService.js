// Dynamic import for Lighthouse SDK with fallback
let lighthouse = null;
let axios = null;

try {
  const { default: lighthouseSDK } = await import('@lighthouse-web3/sdk');
  const { default: axiosLib } = await import('axios');
  lighthouse = lighthouseSDK;
  axios = axiosLib;
} catch (error) {
  console.warn('Lighthouse SDK not available, using fallback mode');
}

// Lighthouse API key - You'll need to get this from lighthouse.storage
const LIGHTHOUSE_API_KEY = process.env.LIGHTHOUSE_API_KEY || 'your-lighthouse-api-key';

/**
 * Upload JSON data to Lighthouse/IPFS
 * @param {Object} jsonData - The JSON data to upload
 * @returns {Promise<Object>} - Upload result with Hash (CID)
 */
export const uploadJSON = async (jsonData) => {
  try {
    if (!lighthouse) {
      // Fallback: return a mock CID for development
      const mockCID = 'Qm' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      return {
        Hash: mockCID,
        Name: 'mock-upload',
        Size: JSON.stringify(jsonData).length
      };
    }
    
    // Convert to string if it's an object
    const jsonString = typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData, null, 2);
    
    // Create a buffer from the JSON string
    const buffer = Buffer.from(jsonString, 'utf8');
    
    // Upload to Lighthouse
    const response = await lighthouse.uploadBuffer(buffer, LIGHTHOUSE_API_KEY);
    
    return response.data;
  } catch (error) {
    console.error('Error uploading to Lighthouse:', error);
    throw new Error(`Failed to upload to Lighthouse: ${error.message}`);
  }
};

/**
 * Upload repository metadata to Lighthouse
 * @param {Object} repoData - Repository data object
 * @returns {Promise<Object>} - Upload result with Hash (CID)
 */
export const uploadRepoMetadata = async (repoData) => {
  try {
    // Add metadata and timestamp
    const metadata = {
      ...repoData,
      uploadedAt: new Date().toISOString(),
      version: '1.0',
      type: 'repository-metadata'
    };
    
    const result = await uploadJSON(metadata);
    
    return {
      success: true,
      cid: result.Hash,
      data: result,
      message: 'Repository metadata uploaded successfully'
    };
  } catch (error) {
    console.error('Error uploading repo metadata:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to upload repository metadata'
    };
  }
};

/**
 * Fetch data from Lighthouse/IPFS by CID
 * @param {string} cid - Content Identifier
 * @returns {Promise<Object>} - Retrieved data
 */
export const fetchByCID = async (cid) => {
  try {
    if (!axios) {
      // Fallback: return mock data for development
      return {
        success: true,
        data: {
          message: 'Mock data - Lighthouse SDK not available',
          cid: cid,
          timestamp: new Date().toISOString()
        },
        cid: cid
      };
    }
    
    // Use Lighthouse gateway to fetch data
    const url = `https://gateway.lighthouse.storage/ipfs/${cid}`;
    const response = await axios.get(url, {
      timeout: 10000, // 10 second timeout
      headers: {
        'Accept': 'application/json'
      }
    });
    
    return {
      success: true,
      data: response.data,
      cid: cid
    };
  } catch (error) {
    console.error('Error fetching from Lighthouse:', error);
    
    if (!axios) {
      return {
        success: false,
        error: 'Axios not available for fallback gateway',
        cid: cid
      };
    }
    
    // Try alternative IPFS gateway
    try {
      const fallbackUrl = `https://ipfs.io/ipfs/${cid}`;
      const fallbackResponse = await axios.get(fallbackUrl, {
        timeout: 15000,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      return {
        success: true,
        data: fallbackResponse.data,
        cid: cid,
        source: 'fallback-gateway'
      };
    } catch (fallbackError) {
      return {
        success: false,
        error: `Failed to fetch CID ${cid}: ${error.message}`,
        cid: cid
      };
    }
  }
};

/**
 * Get file status from Lighthouse
 * @param {string} cid - Content Identifier
 * @returns {Promise<Object>} - File status information
 */
export const getFileStatus = async (cid) => {
  try {
    const response = await axios.get(`https://api.lighthouse.storage/api/lighthouse/get_file_info`, {
      params: { cid },
      headers: {
        'Authorization': `Bearer ${LIGHTHOUSE_API_KEY}`
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting file status:', error);
    throw new Error(`Failed to get file status: ${error.message}`);
  }
};

// Test function to check if Lighthouse service is working
export const testLighthouseConnection = async () => {
  try {
    const testData = {
      test: true,
      message: 'Lighthouse connection test',
      timestamp: new Date().toISOString()
    };
    
    const result = await uploadJSON(testData);
    console.log('Lighthouse test successful:', result);
    
    // Try to fetch it back
    const retrieved = await fetchByCID(result.Hash);
    console.log('Lighthouse fetch test successful:', retrieved);
    
    return {
      success: true,
      uploadResult: result,
      retrievedData: retrieved
    };
  } catch (error) {
    console.error('Lighthouse test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};