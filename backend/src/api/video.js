const express = require('express');
const { renderMedia, selectComposition } = require('@remotion/renderer');
const path = require('path');
const fs = require('fs');

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

    // Determine output path
    const finalOutputPath = outputPath || path.join(__dirname, '../../../storage/videos', `${compositionId}-${Date.now()}.mp4`);

    // Ensure output directory exists
    const outputDir = path.dirname(finalOutputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Render the video
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: finalOutputPath,
      inputProps,
    });

    res.json({
      success: true,
      outputPath: finalOutputPath,
      message: 'Video rendered successfully'
    });

  } catch (error) {
    console.error('Error rendering video:', error);
    res.status(500).json({
      error: 'Failed to render video',
      details: error.message
    });
  }
});

module.exports = router;
