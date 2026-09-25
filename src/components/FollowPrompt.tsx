import React from "react";
import {
  CanvasImage,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { tokens as t } from "../tokens";

export const FOLLOW_PROMPT_FRAMES = 96;
export const FOLLOW_CLICK_FRAME = 86;
export const FOLLOW_CLICK_AUDIO_PREROLL_FRAMES = 1;
export const FOLLOW_CLICK_AUDIO = "audio/follow-click.wav";

export const FollowPrompt: React.FC<{
  startFrame: number;
  durationFrames: number;
}> = ({ startFrame, durationFrames }) => {
  const elapsed = useCurrentFrame() - startFrame;
  const frame =
    (elapsed * FOLLOW_PROMPT_FRAMES) / (durationFrames - startFrame);
  const cardEnter = interpolate(frame, [0, 11], [0.12, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const messageIn = interpolate(frame, [5, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const messageOut = interpolate(frame, [35, 45], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const profileIn = interpolate(frame, [47, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cursorIn = interpolate(frame, [65, 71], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cursorOut = interpolate(frame, [89, 95], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const clickScale = interpolate(frame, [82, FOLLOW_CLICK_FRAME, 92], [1, 0.91, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cursorX = interpolate(frame, [66, 81, 89, 95], [190, 78, 78, 120], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cursorY = interpolate(frame, [66, 81, 89, 95], [60, 24, 24, 48], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const clicked = frame >= 88;

  return (
    <div
      data-qa="follow"
      data-central-visual="follow"
      style={{
        position: "absolute",
        left: t.layout.captionInset,
        top: t.layout.captionTop + 12,
        width: t.layout.captionWidth,
        height: 146,
        boxSizing: "border-box",
        borderRadius: 73,
        border: "1.5px solid rgba(255, 255, 255, 0.9)",
        backgroundColor: "rgba(255, 255, 255, 0.70)",
        backgroundImage:
          "linear-gradient(110deg, rgba(255, 255, 255, 0.36), rgba(225, 236, 247, 0.16))",
        backdropFilter: "blur(20px) saturate(1.15)",
        boxShadow:
          "0 10px 25px rgba(36, 42, 39, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.95)",
        overflow: "hidden",
        opacity: cardEnter,
        scale: 0.97 + cardEnter * 0.03,
        fontFamily: t.font.body,
        color: t.color.ink,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          whiteSpace: "nowrap",
          fontSize: 42,
          fontWeight: 600,
          lineHeight: 1.38,
          letterSpacing: "-0.035em",
          opacity: messageIn * messageOut,
          translate: `0 ${(1 - messageIn) * 9}px`,
        }}
      >
        도움되는 투자 정보를 계속 받으려면?
      </div>
      <div
        style={{
          position: "absolute",
          inset: "17px 44px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 36,
          opacity: profileIn,
          translate: `0 ${(1 - profileIn) * 10}px`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <CanvasImage
            src={staticFile(t.brandmark.src)}
            name="Macrogics symbol"
            style={{ width: 82, height: 82, objectFit: "contain", flexShrink: 0 }}
          />
          <div>
            <div style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.15 }}>
              매크로직스
            </div>
            <div
              style={{
                marginTop: 3,
                fontSize: 25,
                fontWeight: 400,
                color: t.color.muted,
              }}
            >
              @macrogics
            </div>
          </div>
        </div>
        <div style={{ width: 166, height: 60, flexShrink: 0, position: "relative" }}>
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 30,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: clicked ? "#1D4ED8" : "#2563EB",
              color: "#FFFFFF",
              fontSize: 29,
              fontWeight: 600,
              scale: clickScale,
            }}
          >
            {clicked ? "팔로잉" : "팔로우"}
          </div>
          {frame >= 65 && (
            <svg
              width="36"
              height="47"
              viewBox="0 0 44 56"
              aria-label="팔로우 버튼을 클릭하는 커서"
              style={{
                position: "absolute",
                left: cursorX,
                top: cursorY,
                overflow: "visible",
                opacity: cursorIn * cursorOut,
                filter: "drop-shadow(1px 3px 2px rgba(36, 42, 39, 0.25))",
              }}
            >
              <path
                d="M5 3 L5 44 L15 34 L24 53 L32 49 L23 31 L39 31 Z"
                fill="#FFFFFF"
                stroke={t.color.ink}
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
            </svg>
          )}
          {frame >= 82 && frame < 94 && (
            <div
              style={{
                position: "absolute",
                left: 66,
                top: 13,
                width: 34,
                height: 34,
                borderRadius: "50%",
                border: "2px solid rgba(37, 99, 235, 0.7)",
                opacity: interpolate(frame, [82, 85, 94], [0, 0.65, 0]),
                scale: interpolate(frame, [82, 94], [0.5, 1.8]),
                pointerEvents: "none",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
