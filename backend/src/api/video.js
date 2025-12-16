const express = require('express');
const { renderMedia, selectComposition } = require('@remotion/renderer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const axios = require('axios');
const ora = require('ora');
const cliProgress = require('cli-progress');
// ANSI escape codes for colors
const red = (text) => `\x1b[31m${text}\x1b[0m`;
const green = (text) => `\x1b[32m${text}\x1b[0m`;
const yellow = (text) => `\x1b[33m${text}\x1b[0m`;
const blue = (text) => `\x1b[34m${text}\x1b[0m`;
const magenta = (text) => `\x1b[35m${text}\x1b[0m`;
const cyan = (text) => `\x1b[36m${text}\x1b[0m`;
const gray = (text) => `\x1b[37m${text}\x1b[0m`;
const bold = (text) => `\x1b[1m${text}\x1b[0m`;
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
    const finalOutputPath = outputPath || path.join(__dirname, '../../../storage/videos', `${compositionId}-${Date.now()}.mp4`);
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

// POST /api/video/generate-with-audio
router.post('/generate-with-audio', async (req, res) => {
  try {
    console.log('Received audio-video generation request');
    const {
      text,
      lang = 'en',
      compositionId = 'HelloWorld',
      inputProps = {
        titleText: 'Welcome Vijay',
        titleColor: '#000000',
        logoColor1: '#91EAE4',
        logoColor2: '#86A8E7',
      },
      outputPath
    } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required for audio generation' });
    }

    // Determine output path
    const finalOutputPath = outputPath || path.join(__dirname, '../../../storage/videos', `audio-video-${Date.now()}.mp4`);
    console.log('Final output path:', finalOutputPath);

    // Create video job record
    const videoJob = new VideoJob({
      compositionId,
      inputProps: { ...inputProps, text, lang }, // Store text and lang for reference
      outputPath: finalOutputPath,
      status: 'pending',
    });

    await videoJob.save();

    // Start combined generation asynchronously
    generateAudioVideoAsync(videoJob._id, text, lang, compositionId, inputProps, finalOutputPath);

    res.json({
      success: true,
      jobId: videoJob._id,
      outputPath: finalOutputPath,
      url: finalOutputPath.replace('/app/storage', '/storage'),
      message: 'Audio-video generation started',
      status: 'pending'
    });

  } catch (error) {
    console.error('Error starting audio-video generation:', error);
    res.status(500).json({
      error: 'Failed to start audio-video generation',
      details: error.message
    });
  }
});

// Async function to handle video rendering
async function renderVideoAsync(jobId, compositionId, inputProps, outputPath) {
  let tempAudioPath = null;
  let progressBar = null;

  try {
    console.log(blue(bold('🎬 Starting Video Rendering')));
    console.log(gray(`Job ID: ${jobId}`));
    console.log(gray(`Composition: ${compositionId}`));
    console.log(gray(`Output: ${path.basename(outputPath)}`));

    // Update job status to processing
    await VideoJob.findByIdAndUpdate(jobId, { status: 'processing' });

    let actualDuration = inputProps.durationInFrames || 150;

    // If audioUrl is provided, calculate duration based on audio
    if (inputProps.audioUrl) {
      const audioSpinner = ora({
        text: yellow('🔊 Analyzing audio duration...'),
        spinner: 'dots'
      }).start();

      try {
        // Download audio file temporarily to get duration
        tempAudioPath = path.join(os.tmpdir(), `audio-render-${jobId}.mp3`);

        const audioResponse = await axios.get(inputProps.audioUrl, { responseType: 'stream' });
        const audioWriter = fs.createWriteStream(tempAudioPath);
        audioResponse.data.pipe(audioWriter);

        await new Promise((resolve, reject) => {
          audioWriter.on('finish', resolve);
          audioWriter.on('error', reject);
        });

        // Get audio duration using FFprobe
        const ffprobeCommand = `ffprobe -v quiet -print_format json -show_format "${tempAudioPath}"`;
        const { stdout } = await execAsync(ffprobeCommand);
        const probeData = JSON.parse(stdout);
        const audioDuration = parseFloat(probeData.format.duration);

        // Calculate video duration to match audio duration
        const fps = 30; // Assuming 30fps
        actualDuration = Math.ceil(audioDuration * fps);

        audioSpinner.succeed(green(`Audio analyzed: ${audioDuration.toFixed(1)}s → ${actualDuration} frames`));

      } catch (audioError) {
        audioSpinner.fail(red('Audio analysis failed, using default duration'));
        console.error(red('Error:'), audioError.message);
        // Keep the default actualDuration
      }
    }

    // Bundle the Remotion project
    const bundleSpinner = ora({
      text: yellow('📦 Bundling Remotion project...'),
      spinner: 'dots'
    }).start();

    const remotionPath = path.join(__dirname, '../remotion');
    const bundleLocation = await require('@remotion/bundler').bundle({
      entryPoint: path.join(remotionPath, 'src/index.ts'),
      webpackOverride: (config) => config,
    });

    bundleSpinner.succeed(green('Remotion project bundled successfully'));

    // Update inputProps with calculated duration
    const updatedInputProps = {
      ...inputProps,
      durationInFrames: actualDuration
    };

    // Select the composition
    const selectSpinner = ora({
      text: yellow('🎭 Selecting composition...'),
      spinner: 'dots'
    }).start();

    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: compositionId,
      inputProps: updatedInputProps,
    });

    selectSpinner.succeed(green(`Composition selected: ${compositionId}`));

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Create progress bar for rendering
    progressBar = new cliProgress.SingleBar({
      format: cyan('🎬 Rendering Video') + ' |' + cyan('{bar}') + '| {percentage}% | {value}/{total} frames | ETA: {eta}s',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });

    progressBar.start(actualDuration, 0);

    // Render the video with progress tracking and GPU acceleration
    console.log(blue(bold(`\n🚀 Starting video render (${actualDuration} frames, ${Math.round(actualDuration/30)}s at 30fps)`)));

    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps: updatedInputProps,
      durationInFrames: actualDuration,
      browserExecutable: null,
      concurrency: 4,
      puppeteerLaunchOptions: {
        args: [
          '--enable-gpu',
          '--use-gl=desktop',
          '--enable-webgl',
          '--ignore-gpu-blacklist',
          '--disable-software-rasterizer',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu-sandbox'
        ]
      },
      onProgress: ({ progress }) => {
        const currentFrame = Math.round(progress * actualDuration);
        progressBar.update(currentFrame);
        // Update progress in database
        VideoJob.findByIdAndUpdate(jobId, { progress: Math.round(progress * 100) }).catch(err =>
          console.error(red('Error updating progress:'), err.message)
        );
      },
    });

    progressBar.stop();
    console.log(green(bold('\n✅ Video rendering completed!')));

    // Check if file was actually created
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

      console.log(green(`📁 File created: ${path.basename(outputPath)} (${fileSizeMB} MB)`));

      // Upload to MinIO
      const uploadSpinner = ora({
        text: yellow('☁️  Uploading to MinIO...'),
        spinner: 'dots'
      }).start();

      const fileName = path.basename(outputPath);
      const minioPath = `video-gen-videos/videos/${fileName}`;

      try {
        await minioClient.fPutObject(VIDEO_BUCKET, minioPath, outputPath);

        uploadSpinner.succeed(green('Video uploaded to MinIO successfully'));

        // Clean up local file
        fs.unlinkSync(outputPath);

        // Update job with MinIO URL
        const minioUrl = `http://localhost:9000/${VIDEO_BUCKET}/${minioPath}`;
        await VideoJob.findByIdAndUpdate(jobId, {
          status: 'completed',
          progress: 100,
          completedAt: new Date(),
          outputPath: minioUrl,
        });

        console.log(green(bold(`🎉 Job ${jobId} completed successfully!`)));
        console.log(gray(`URL: ${minioUrl}`));

      } catch (uploadError) {
        uploadSpinner.fail(red('MinIO upload failed'));
        console.error(red('Error:'), uploadError.message);

        await VideoJob.findByIdAndUpdate(jobId, {
          status: 'completed',
          progress: 100,
          completedAt: new Date(),
        });
      }

    } else {
      throw new Error('Video file was not created despite renderMedia completing');
    }

  } catch (error) {
    if (progressBar) progressBar.stop();

    console.error(red('\n❌ Video rendering failed'));
    console.error(red('Error:'), error.message);

    // Update job as failed
    await VideoJob.findByIdAndUpdate(jobId, {
      status: 'failed',
      error: error.message,
    }).catch(err => console.error(red('Error updating failed job:'), err.message));

  } finally {
    // Clean up temporary audio file
    try {
      if (tempAudioPath && fs.existsSync(tempAudioPath)) {
        fs.unlinkSync(tempAudioPath);
      }
    } catch (cleanupError) {
      console.error(red('Error cleaning up temporary audio file:'), cleanupError.message);
    }
  }
}

// Async function to handle combined audio-video generation
async function generateAudioVideoAsync(jobId, text, lang, compositionId, inputProps, outputPath) {
  let tempAudioPath = null;
  let tempVideoPath = null;
  let audioFilePath = null;
  let progressBar = null;

  try {
    console.log(magenta(bold('🎵🎬 Starting Audio-Video Generation')));
    console.log(gray(`Job ID: ${jobId}`));
    console.log(gray(`Text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`));
    console.log(gray(`Language: ${lang}`));

    // Update job status to processing
    await VideoJob.findByIdAndUpdate(jobId, { status: 'processing', progress: 5 });

    // Step 1: Generate TTS audio
    const ttsSpinner = ora({
      text: yellow('🎤 Generating TTS audio...'),
      spinner: 'dots'
    }).start();

    const TTS_SERVICE_URL = process.env.TTS_SERVICE_URL || 'http://localhost:5051';
    const ttsResponse = await axios.post(`${TTS_SERVICE_URL}/generate`, {
      text,
      lang,
    });

    const { url: audioMinioUrl, duration: audioDuration } = ttsResponse.data;
    ttsSpinner.succeed(green(`TTS generated: ${audioDuration.toFixed(1)}s audio`));

    // Update progress
    await VideoJob.findByIdAndUpdate(jobId, { progress: 25 });

    // Step 2: Download audio file locally for FFmpeg
    const downloadSpinner = ora({
      text: yellow('📥 Downloading audio for processing...'),
      spinner: 'dots'
    }).start();

    tempAudioPath = path.join(os.tmpdir(), `audio-${jobId}.mp3`);
    const audioResponse = await axios.get(audioMinioUrl, { responseType: 'stream' });
    const audioWriter = fs.createWriteStream(tempAudioPath);
    audioResponse.data.pipe(audioWriter);

    await new Promise((resolve, reject) => {
      audioWriter.on('finish', resolve);
      audioWriter.on('error', reject);
    });

    const audioFilePath = tempAudioPath;
    downloadSpinner.succeed(green('Audio downloaded for FFmpeg processing'));

    // Update progress
    await VideoJob.findByIdAndUpdate(jobId, { progress: 35 });

    // Step 3: Generate video with audio URL
    console.log(blue(bold('\n🎬 Generating Video Component')));

    // Calculate video duration to match audio duration
    const fps = 30;
    const videoDurationInFrames = Math.ceil(audioDuration * fps);
    console.log(gray(`Video duration: ${videoDurationInFrames} frames (${Math.round(videoDurationInFrames/fps)}s at ${fps}fps)`));

    const videoInputProps = {
      ...inputProps,
      audioUrl: audioMinioUrl,
      durationInFrames: videoDurationInFrames
    };

    // Bundle the Remotion project
    const bundleSpinner = ora({
      text: yellow('📦 Bundling Remotion project...'),
      spinner: 'dots'
    }).start();

    const remotionPath = path.join(__dirname, '../remotion');
    const bundleLocation = await require('@remotion/bundler').bundle({
      entryPoint: path.join(remotionPath, 'src/index.ts'),
      webpackOverride: (config) => config,
    });

    bundleSpinner.succeed(green('Remotion project bundled'));

    // Select the composition
    const selectSpinner = ora({
      text: yellow('🎭 Selecting composition...'),
      spinner: 'dots'
    }).start();

    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: compositionId,
      inputProps: videoInputProps,
    });

    selectSpinner.succeed(green(`Composition selected: ${compositionId}`));

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate temporary video path
    tempVideoPath = path.join(os.tmpdir(), `video-${jobId}.mp4`);

    // Create progress bar for video rendering
    progressBar = new cliProgress.SingleBar({
      format: cyan('🎬 Rendering Video') + ' |' + cyan('{bar}') + '| {percentage}% | {value}/{total} frames | ETA: {eta}s',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });

    progressBar.start(videoDurationInFrames, 0);

    console.log(blue(bold(`🚀 Rendering video (${videoDurationInFrames} frames)...`)));

    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: tempVideoPath,
      inputProps: videoInputProps,
      durationInFrames: videoDurationInFrames,
      browserExecutable: null,
      concurrency: 4,
      puppeteerLaunchOptions: {
        args: [
          '--enable-gpu',
          '--use-gl=desktop',
          '--enable-webgl',
          '--ignore-gpu-blacklist',
          '--disable-software-rasterizer',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu-sandbox'
        ]
      },
      onProgress: ({ progress }) => {
        const currentFrame = Math.round(progress * videoDurationInFrames);
        progressBar.update(currentFrame);
        const videoProgress = 35 + Math.round(progress * 40); // 35-75%
        VideoJob.findByIdAndUpdate(jobId, { progress: videoProgress }).catch(err =>
          console.error(red('Error updating progress:'), err.message)
        );
      },
    });

    progressBar.stop();
    console.log(green(bold('\n✅ Video rendering completed!')));

    // Update progress
    await VideoJob.findByIdAndUpdate(jobId, { progress: 80 });

    // Step 4: Merge audio and video using FFmpeg
    const mergeSpinner = ora({
      text: yellow('🔄 Merging audio and video...'),
      spinner: 'dots'
    }).start();

    const mergedOutputPath = path.join(os.tmpdir(), `merged-${jobId}.mp4`);
    const ffmpegCommand = `ffmpeg -i "${tempVideoPath}" -i "${audioFilePath}" -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest "${mergedOutputPath}"`;

    await execAsync(ffmpegCommand);
    mergeSpinner.succeed(green('Audio and video merged successfully'));

    // Update progress
    await VideoJob.findByIdAndUpdate(jobId, { progress: 90 });

    // Step 5: Upload final video to MinIO
    const uploadSpinner = ora({
      text: yellow('☁️  Uploading final video to MinIO...'),
      spinner: 'dots'
    }).start();

    const fileName = path.basename(outputPath);
    const minioPath = `video-gen-videos/videos/${fileName}`;

    await minioClient.fPutObject(VIDEO_BUCKET, minioPath, mergedOutputPath);
    uploadSpinner.succeed(green('Video uploaded to MinIO successfully'));

    // Update job with MinIO URL
    const minioUrl = `http://localhost:9000/${VIDEO_BUCKET}/${minioPath}`;
    await VideoJob.findByIdAndUpdate(jobId, {
      status: 'completed',
      progress: 100,
      completedAt: new Date(),
      outputPath: minioUrl,
    });

    console.log(green(bold(`\n🎉 Audio-Video generation completed for job ${jobId}!`)));
    console.log(gray(`URL: ${minioUrl}`));

  } catch (error) {
    if (progressBar) progressBar.stop();

    console.error(red(bold('\n❌ Audio-Video generation failed')));
    console.error(red('Error:'), error.message);

    // Update job as failed
    await VideoJob.findByIdAndUpdate(jobId, {
      status: 'failed',
      error: error.message,
    }).catch(err => console.error(red('Error updating failed job:'), err.message));

  } finally {
    // Clean up temporary files
    try {
      if (tempAudioPath && tempAudioPath !== audioFilePath && fs.existsSync(tempAudioPath)) {
        fs.unlinkSync(tempAudioPath);
      }
      if (tempVideoPath && fs.existsSync(tempVideoPath)) {
        fs.unlinkSync(tempVideoPath);
      }
      const mergedPath = path.join(os.tmpdir(), `merged-${jobId}.mp4`);
      if (fs.existsSync(mergedPath)) {
        fs.unlinkSync(mergedPath);
      }
    } catch (cleanupError) {
      console.error(red('Error cleaning up temporary files:'), cleanupError.message);
    }
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
