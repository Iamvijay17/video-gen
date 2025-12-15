const express = require('express');
const { AUDIO_BUCKET, VIDEO_BUCKET } = require('../config/minio');

const router = express.Router();

// GET /api/storage/url
router.get('/url', (req, res) => {
  // Return MinIO bucket URLs
  const minioBaseUrl = 'http://localhost:9000';

  res.json({
    success: true,
    storageUrl: minioBaseUrl,
    audioUrl: `${minioBaseUrl}/${AUDIO_BUCKET}`,
    videoUrl: `${minioBaseUrl}/${VIDEO_BUCKET}`,
    audioBucket: AUDIO_BUCKET,
    videoBucket: VIDEO_BUCKET,
  });
});

module.exports = router;
