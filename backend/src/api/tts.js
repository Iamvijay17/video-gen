const express = require('express');
const axios = require('axios');
const TTSRequest = require('../models/TTSRequest');
const path = require('path');

const router = express.Router();

// TTS service URL
const TTS_SERVICE_URL = process.env.TTS_SERVICE_URL || 'http://localhost:5050';

// POST /api/tts/generate
router.post('/generate', async (req, res) => {
  try {
    const { text, lang = 'en' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Call TTS service
    const ttsResponse = await axios.post(`${TTS_SERVICE_URL}/generate`, {
      text,
      lang,
    });

    const { file_id, filename, url } = ttsResponse.data;

    // Store in database
    const ttsRequest = new TTSRequest({
      text,
      lang,
      fileId: file_id,
      filename,
      filePath: path.join(__dirname, '../../../storage/audio', filename),
      url,
    });

    await ttsRequest.save();

    res.json({
      success: true,
      data: ttsRequest,
    });

  } catch (error) {
    console.error('Error generating TTS:', error);

    // Store failed request in database
    try {
      const { text, lang = 'en' } = req.body;
      const failedRequest = new TTSRequest({
        text,
        lang,
        fileId: `failed-${Date.now()}`,
        filename: '',
        filePath: '',
        url: '',
        status: 'failed',
      });
      await failedRequest.save();
    } catch (dbError) {
      console.error('Error saving failed TTS request:', dbError);
    }

    res.status(500).json({
      error: 'Failed to generate TTS',
      details: error.message,
    });
  }
});

// GET /api/tts/history
router.get('/history', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const ttsRequests = await TTSRequest.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await TTSRequest.countDocuments();

    res.json({
      success: true,
      data: ttsRequests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Error fetching TTS history:', error);
    res.status(500).json({
      error: 'Failed to fetch TTS history',
      details: error.message,
    });
  }
});

// GET /api/tts/:fileId
router.get('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;

    const ttsRequest = await TTSRequest.findOne({ fileId });

    if (!ttsRequest) {
      return res.status(404).json({ error: 'TTS request not found' });
    }

    res.json({
      success: true,
      data: ttsRequest,
    });

  } catch (error) {
    console.error('Error fetching TTS request:', error);
    res.status(500).json({
      error: 'Failed to fetch TTS request',
      details: error.message,
    });
  }
});

// DELETE /api/tts/:fileId
router.delete('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;

    const ttsRequest = await TTSRequest.findOneAndDelete({ fileId });

    if (!ttsRequest) {
      return res.status(404).json({ error: 'TTS request not found' });
    }

    // Also delete from TTS service
    try {
      await axios.delete(`${TTS_SERVICE_URL}/audio/${ttsRequest.filename}`);
    } catch (serviceError) {
      console.warn('Failed to delete from TTS service:', serviceError.message);
    }

    res.json({
      success: true,
      message: 'TTS request deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting TTS request:', error);
    res.status(500).json({
      error: 'Failed to delete TTS request',
      details: error.message,
    });
  }
});

module.exports = router;
