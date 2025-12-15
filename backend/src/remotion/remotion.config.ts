// See all configuration options: https://remotion.dev/docs/config
// Each option also is available as a CLI flag: https://remotion.dev/docs/cli

// Note: When using the Node.JS APIs, the config file doesn't apply. Instead, pass options directly to the APIs

import { Config } from "@remotion/cli/config";
import { enableTailwind } from '@remotion/tailwind-v4';

// Performance optimizations
Config.setVideoImageFormat("png"); // PNG is faster than JPEG for rendering
Config.setOverwriteOutput(true);
Config.setBrowserExecutable(null);
Config.setPixelFormat("yuv420p"); // Better compatibility and performance
Config.setCodec("h264"); // Explicitly set codec
Config.overrideWebpackConfig(enableTailwind);
