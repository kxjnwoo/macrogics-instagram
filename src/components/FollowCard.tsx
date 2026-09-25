import React from "react";
import { Sequence, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { tokens } from "../tokens";
import {
  FollowPrompt,
  FOLLOW_PROMPT_FRAMES,
  FOLLOW_CLICK_FRAME,
  FOLLOW_CLICK_AUDIO_PREROLL_FRAMES,
  FOLLOW_CLICK_AUDIO,
} from "./FollowPrompt";

/** Self-contained final follow card, including its original one-shot click. */
export const FollowCard: React.FC<{ startFrame?: number; sound?: boolean }> = ({
  startFrame = 0,
  sound = true,
}) => {
  const frame = useCurrentFrame();
  if (frame < startFrame || frame >= startFrame + FOLLOW_PROMPT_FRAMES)
    return null;
  return (
    <>
      <FollowPrompt
        startFrame={startFrame}
        durationFrames={startFrame + FOLLOW_PROMPT_FRAMES}
      />
      {sound && (
        <Sequence
          from={
            startFrame + FOLLOW_CLICK_FRAME - FOLLOW_CLICK_AUDIO_PREROLL_FRAMES
          }
          layout="none"
        >
          <Audio
            src={staticFile(FOLLOW_CLICK_AUDIO)}
            volume={tokens.audio.sfxVolume}
          />
        </Sequence>
      )}
    </>
  );
};
