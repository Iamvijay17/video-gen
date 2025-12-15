const { Client } = require('minio');

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT) || 9000,
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'admin',
  secretKey: process.env.MINIO_SECRET_KEY || 'password123',
});

const AUDIO_BUCKET = process.env.AUDIO_BUCKET || 'video-gen-audio';
const VIDEO_BUCKET = process.env.VIDEO_BUCKET || 'video-gen-videos';

// Initialize buckets
async function initializeBuckets() {
  try {
    // Create audio bucket if it doesn't exist
    const audioExists = await minioClient.bucketExists(AUDIO_BUCKET);
    if (!audioExists) {
      await minioClient.makeBucket(AUDIO_BUCKET);
      console.log(`Created bucket: ${AUDIO_BUCKET}`);
    }

    // Create video bucket if it doesn't exist
    const videoExists = await minioClient.bucketExists(VIDEO_BUCKET);
    if (!videoExists) {
      await minioClient.makeBucket(VIDEO_BUCKET);
      console.log(`Created bucket: ${VIDEO_BUCKET}`);
    }

    // Set public read policy for both buckets using MinIO-compatible format
    const publicPolicy = JSON.stringify({
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Principal": {"AWS": "*"},
          "Action": ["s3:GetObject"],
          "Resource": [`arn:aws:s3:::${AUDIO_BUCKET}/*`]
        }
      ]
    });

    const videoPolicy = JSON.stringify({
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Principal": {"AWS": "*"},
          "Action": ["s3:GetObject"],
          "Resource": [`arn:aws:s3:::${VIDEO_BUCKET}/*`]
        }
      ]
    });

    try {
      await minioClient.setBucketPolicy(AUDIO_BUCKET, publicPolicy);
      console.log(`Public policy set for bucket: ${AUDIO_BUCKET}`);

      await minioClient.setBucketPolicy(VIDEO_BUCKET, videoPolicy);
      console.log(`Public policy set for bucket: ${VIDEO_BUCKET}`);
    } catch (policyError) {
      console.warn('Failed to set bucket policies:', policyError.message);
      console.warn('Policy error details:', policyError);
    }

    console.log('MinIO buckets initialized successfully');
  } catch (error) {
    console.error('Error initializing MinIO buckets:', error);
  }
}

module.exports = {
  minioClient,
  AUDIO_BUCKET,
  VIDEO_BUCKET,
  initializeBuckets,
};
