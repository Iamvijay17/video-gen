const express = require('express');
const { renderMedia, selectComposition } = require('@remotion/renderer');
const path = require('path');
const fs = require('fs');
const VideoJob = require('../models/VideoJob');
const { minioClient, VIDEO_BUCKET } = require('../config/minio');

const router = express.Router();

// POST /api/video/render
router.post('/render', async (req, res) => {
  try {
    console.log('Received video render request');
    const { compositionId = 'HelloWorld', inputProps = {
      titleText: 'Welcome Vijay',
      titleColor: '#000000',
      logoColor1: '#91EAE4',
      logoColor2: '#86A8E7',
    }, outputPath } = req.body;

    // Determine output path
    const finalOutputPath = outputPath || path.join('/app/storage/videos', `${compositionId}-${Date.now()}.mp4`);
    console.log('Final output path:', finalOutputPath);

    // Create video job record
    const videoJob = new VideoJob({
      compositionId,
      inputProps,
      outputPath: finalOutputPath,
      status: 'pending',
    });

    await videoJob.save();

    // Start rendering asynchronously
    renderVideoAsync(videoJob._id, compositionId, inputProps, finalOutputPath);

    res.json({
      success: true,
      jobId: videoJob._id,
      outputPath: finalOutputPath,
      url: finalOutputPath.replace('/app/storage', '/storage'),
      message: 'Video rendering started',
      status: 'pending'
    });

  } catch (error) {
    console.error('Error starting video render:', error);
    res.status(500).json({
      error: 'Failed to start video rendering',
      details: error.message
    });
  }
});

// Async function to handle video rendering
async function renderVideoAsync(jobId, compositionId, inputProps, outputPath) {
  try {
    console.log('Starting video rendering for job:', jobId);
    console.log('Output path:', outputPath);
    console.log('__dirname:', __dirname);
    console.log('Remotion path:', path.join(__dirname, '../remotion'));
    console.log('Output directory:', path.dirname(outputPath));

    // Update job status to processing
    await VideoJob.findByIdAndUpdate(jobId, { status: 'processing' });

    // Path to the Remotion project
    const remotionPath = path.join(__dirname, '../remotion');

    // Bundle the Remotion project
    console.log('Starting bundling...');
    const bundleLocation = await require('@remotion/bundler').bundle({
      entryPoint: path.join(remotionPath, 'src/index.ts'),
      webpackOverride: (config) => config,
    });
    console.log('Bundling completed, bundle location:', bundleLocation);

    // Select the composition
    console.log('Selecting composition...');
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: compositionId,
      inputProps,
    });
    console.log('Composition selected:', composition);

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    console.log('Creating output directory:', outputDir);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log('Output directory created');
    } else {
      console.log('Output directory already exists');
    }

    // Render the video with progress tracking
    console.log('Starting renderMedia call...');
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps,
      onProgress: ({ progress }) => {
        console.log('Render progress:', progress);
        // Update progress in database
        VideoJob.findByIdAndUpdate(jobId, { progress: Math.round(progress * 100) }).catch(err =>
          console.error('Error updating progress:', err)
        );
      },
    });
    console.log('renderMedia call completed');

    // Check if file was actually created
    if (fs.existsSync(outputPath)) {
      console.log('Video file created successfully:', outputPath);
      const stats = fs.statSync(outputPath);
      console.log('File size:', stats.size, 'bytes');

      // Upload to MinIO
      const fileName = path.basename(outputPath);
      const minioPath = `videos/${fileName}`;

      try {
        await minioClient.fPutObject(VIDEO_BUCKET, minioPath, outputPath);
        console.log('Video uploaded to MinIO:', minioPath);

        // Clean up local file
        fs.unlinkSync(outputPath);
        console.log('Local video file cleaned up');

        // Update job with MinIO URL
        const minioUrl = `http://localhost:9000/${VIDEO_BUCKET}/${minioPath}`;
        await VideoJob.findByIdAndUpdate(jobId, {
          status: 'completed',
          progress: 100,
          completedAt: new Date(),
          outputPath: minioUrl, // Store MinIO URL instead of local path
        });

      } catch (uploadError) {
        console.error('Error uploading to MinIO:', uploadError);
        // Still mark as completed but keep local file
        await VideoJob.findByIdAndUpdate(jobId, {
          status: 'completed',
          progress: 100,
          completedAt: new Date(),
        });
      }

      console.log(`Video rendering completed for job ${jobId}`);
    } else {
      throw new Error('Video file was not created despite renderMedia completing');
    }

  } catch (error) {
    console.error('Error rendering video:', error);
    console.error('Error stack:', error.stack);

    // Update job as failed
    await VideoJob.findByIdAndUpdate(jobId, {
      status: 'failed',
      error: error.message,
    }).catch(err => console.error('Error updating failed job:', err));
  }
}

// GET /api/video/jobs
router.get('/jobs', async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    const query = status ? { status } : {};

    const videoJobs = await VideoJob.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await VideoJob.countDocuments(query);

    // Add url to each job
    const jobsWithUrl = videoJobs.map(job => ({
      ...job.toObject(),
      url: job.outputPath // Already contains MinIO URL
    }));

    res.json({
      success: true,
      data: jobsWithUrl,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Error fetching video jobs:', error);
    res.status(500).json({
      error: 'Failed to fetch video jobs',
      details: error.message,
    });
  }
});

// GET /api/video/jobs/:jobId
router.get('/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    const videoJob = await VideoJob.findById(jobId);

    if (!videoJob) {
      return res.status(404).json({ error: 'Video job not found' });
    }

    // Add url to the job
    const jobWithUrl = {
      ...videoJob.toObject(),
      url: videoJob.outputPath // Already contains MinIO URL
    };

    res.json({
      success: true,
      data: jobWithUrl,
    });

  } catch (error) {
    console.error('Error fetching video job:', error);
    res.status(500).json({
      error: 'Failed to fetch video job',
      details: error.message,
    });
  }
});

// DELETE /api/video/jobs/:jobId
router.delete('/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    const videoJob = await VideoJob.findByIdAndDelete(jobId);

    if (!videoJob) {
      return res.status(404).json({ error: 'Video job not found' });
    }

    // Delete from MinIO
    try {
      // Extract filename from MinIO URL
      const urlParts = videoJob.outputPath.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const minioPath = `videos/${fileName}`;

      await minioClient.removeObject(VIDEO_BUCKET, minioPath);
      console.log(`Deleted video file from MinIO: ${minioPath}`);
    } catch (minioError) {
      console.warn('Failed to delete from MinIO:', minioError.message);
    }

    res.json({
      success: true,
      message: 'Video job deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting video job:', error);
    res.status(500).json({
      error: 'Failed to delete video job',
      details: error.message,
    });
  }
});

module.exports = router;
