import express from 'express';
import { uploadJSON, fetchByCID, uploadRepoMetadata } from '../services/lighthouseService.js';

const router = express.Router();

// POST /api/repos/upload - Upload repository metadata to Lighthouse
router.post('/upload', async (req, res) => {
  try {
    const { repoData } = req.body;
    
    if (!repoData) {
      return res.status(400).json({
        success: false,
        message: 'Repository data is required'
      });
    }
    
    // Validate required fields
    if (!repoData.name || !repoData.description) {
      return res.status(400).json({
        success: false,
        message: 'Repository name and description are required'
      });
    }
    
    // Upload to Lighthouse
    const result = await uploadRepoMetadata(repoData);
    
    res.json({
      success: true,
      data: {
        cid: result.Hash,
        ipfsUrl: `https://gateway.lighthouse.storage/ipfs/${result.Hash}`,
        repoData,
        uploadedAt: new Date().toISOString()
      },
      message: 'Repository metadata uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading repository:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload repository metadata',
      error: error.message
    });
  }
});

// GET /api/repos/:cid - Get repository metadata by CID
router.get('/:cid', async (req, res) => {
  try {
    const { cid } = req.params;
    
    if (!cid) {
      return res.status(400).json({
        success: false,
        message: 'CID is required'
      });
    }
    
    // Fetch from Lighthouse
    const data = await fetchByCID(cid);
    
    res.json({
      success: true,
      data: {
        cid,
        content: data,
        ipfsUrl: `https://gateway.lighthouse.storage/ipfs/${cid}`,
        fetchedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching repository:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch repository metadata',
      error: error.message
    });
  }
});

// POST /api/repos/upload-file - Upload a file to Lighthouse (general purpose)
router.post('/upload-file', async (req, res) => {
  try {
    const { fileData, fileName } = req.body;
    
    if (!fileData) {
      return res.status(400).json({
        success: false,
        message: 'File data is required'
      });
    }
    
    // Create file object for upload
    const fileObj = {
      name: fileName || 'uploaded-file.json',
      content: typeof fileData === 'string' ? fileData : JSON.stringify(fileData)
    };
    
    const result = await uploadJSON(fileObj);
    
    res.json({
      success: true,
      data: {
        cid: result.Hash,
        ipfsUrl: `https://gateway.lighthouse.storage/ipfs/${result.Hash}`,
        fileName: fileObj.name,
        uploadedAt: new Date().toISOString()
      },
      message: 'File uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload file',
      error: error.message
    });
  }
});

// GET /api/repos/health - Health check for repos service
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'repos',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

export default router;