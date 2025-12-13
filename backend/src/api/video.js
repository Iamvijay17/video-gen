const express = require('express');
const { renderMedia, selectComposition } = require('@remotion/renderer');
const path = require('path');
const fs = require('fs');
const VideoJob = require('../models/VideoJob');

const router = express.Router();

// POST /api/video/render
router.post('/render', async (req, res) => {
  try {
    const { compositionId = 'HelloWorld', inputProps = {
      titleText: 'Welcome Vijay',
      titleColor: '#000000',
      logoColor1: '#91EAE4',
      logoColor2: '#86A8E7',
    }, outputPath } = req.body;

    // Determine output path
    const finalOutputPath = outputPath || path.join(__dirname, '../../../storage/videos', `${compositionId}-${Date.now()}.mp4`);

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
    // Update job status to processing
    await VideoJob.findByIdAndUpdate(jobId, { status: 'processing' });

    // Path to the Remotion project
    const remotionPath = path.join(__dirname, '../remotion');

    // Bundle the Remotion project
    const bundleLocation = await require('@remotion/bundler').bundle({
      entryPoint: path.join(remotionPath, 'src/index.ts'),
      webpackOverride: (config) => config,
    });

    // Select the composition
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: compositionId,
      inputProps,
    });

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Render the video with progress tracking
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps,
      onProgress: ({ progress }) => {
        // Update progress in database
        VideoJob.findByIdAndUpdate(jobId, { progress: Math.round(progress * 100) }).catch(err =>
          console.error('Error updating progress:', err)
        );
      },
    });

    // Update job as completed
    await VideoJob.findByIdAndUpdate(jobId, {
      status: 'completed',
      progress: 100,
      completedAt: new Date(),
    });

    console.log(`Video rendering completed for job ${jobId}`);

  } catch (error) {
    console.error('Error rendering video:', error);

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

    res.json({
      success: true,
      data: videoJobs,
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

    res.json({
      success: true,
      data: videoJob,
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

    // Try to delete the video file if it exists
    try {
      if (fs.existsSync(videoJob.outputPath)) {
        fs.unlinkSync(videoJob.outputPath);
      }
    } catch (fileError) {
      console.warn('Failed to delete video file:', fileError.message);
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
