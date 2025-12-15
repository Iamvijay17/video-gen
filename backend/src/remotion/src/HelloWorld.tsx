import { spring } from "remotion";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  Audio,
} from "remotion";
import { Logo } from "./HelloWorld/Logo";
import { Subtitle } from "./HelloWorld/Subtitle";
import { Title } from "./HelloWorld/Title";
import { z } from "zod";
import { zColor } from "@remotion/zod-types";

export const myCompSchema = z.object({
  titleText: z.string(),
  titleColor: zColor(),
  logoColor1: zColor(),
  logoColor2: zColor(),
  audioUrl: z.string().optional(),
  durationInFrames: z.number().optional(),
});

export const HelloWorld: React.FC<z.infer<typeof myCompSchema>> = ({
  titleText: propOne,
  titleColor: propTwo,
  logoColor1,
  logoColor2,
  audioUrl,
  durationInFrames: customDuration,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationInFrames = customDuration || 150; // Use prop value or default

  // Debug logging
  if (frame === 0) {
    console.log('HelloWorld component initialized with duration:', durationInFrames, 'frames');
  }

  // For longer videos, simplify animations to avoid performance issues
  const isLongVideo = durationInFrames > 300; // More than 10 seconds

  let logoTranslation = 0;
  let opacity = 1;

  if (!isLongVideo) {
    // Use spring animation for short videos
    const logoTranslationProgress = spring({
      frame: frame - 25,
      fps,
      config: {
        damping: 100,
      },
    });

    logoTranslation = interpolate(
      logoTranslationProgress,
      [0, 1],
      [0, -150],
    );

    // Fade out the animation at the end
    opacity = interpolate(
      frame,
      [durationInFrames - 25, durationInFrames - 15],
      [1, 0],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      },
    );
  } else {
    // For long videos, use simpler animations
    // Logo appears after 25 frames and stays
    if (frame > 25) {
      logoTranslation = -150;
    }

    // Simple fade out at the end
    if (frame > durationInFrames - 30) {
      opacity = interpolate(
        frame,
        [durationInFrames - 30, durationInFrames],
        [1, 0],
        {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        },
      );
    }
  }

  // A <AbsoluteFill> is just a absolutely positioned <div>!
  return (
    <AbsoluteFill style={{ backgroundColor: "white" }}>
      {audioUrl && <Audio src={audioUrl} />}
      <AbsoluteFill style={{ opacity }}>
        <AbsoluteFill style={{ transform: `translateY(${logoTranslation}px)` }}>
          <Logo logoColor1={logoColor1} logoColor2={logoColor2} />
        </AbsoluteFill>
        {/* Sequences can shift the time for its children! */}
        <Sequence from={35}>
          <Title titleText={propOne} titleColor={propTwo} />
        </Sequence>
        {/* The subtitle will only enter on the 75th frame. */}
        <Sequence from={75}>
          <Subtitle />
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
