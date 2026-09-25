import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  CanvasImage,
  staticFile,
  delayRender,
  continueRender,
  cancelRender,
} from "remotion";
import { fontReady } from "../fonts";
import { tokens as t } from "../tokens";
import { MixedText } from "./MixedText";
import { LayoutQA } from "./LayoutQA";

/** Shared design regions. Content and timing are supplied by the caller. */
export const DesignFrame: React.FC<{
  headline?: string;
  date?: string;
  caption?: string;
  source?: string;
  note?: string;
  eyebrow?: string;
  children?: React.ReactNode;
  overlay?: React.ReactNode;
  qa?: boolean;
}> = ({
  headline = "",
  date = "",
  caption = "",
  source = "",
  note,
  eyebrow,
  children,
  overlay,
  qa = false,
}) => {
  const [handle] = useState(() => delayRender("Load Macrogics local fonts"));
  useEffect(() => {
    fontReady.then(() => continueRender(handle)).catch(cancelRender);
  }, [handle]);
  return (
    <AbsoluteFill
      data-design-root="true"
      data-central-required="false"
      style={{
        backgroundColor: t.color.paper,
        color: t.color.ink,
        fontFamily: t.font.body,
      }}
    >
      {qa && <LayoutQA />}
      <div
        data-qa="masthead"
        style={{
          position: "absolute",
          top: t.safe.top,
          left: t.layout.mastheadInset,
          right: t.layout.mastheadInset,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: `1px solid ${t.color.line}`,
          paddingBottom: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: t.brandmark.gap,
          }}
        >
          <CanvasImage
            src={staticFile(t.brandmark.src)}
            name="Macrogics symbol"
            style={{
              width: t.brandmark.size,
              height: t.brandmark.size,
              objectFit: "contain",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: t.font.wordmark,
              fontSize: 47,
              letterSpacing: t.tracking.wordmark,
            }}
          >
            Macrogics
          </span>
        </div>
        <span
          style={{
            fontFamily: t.font.date,
            fontSize: t.size.date,
            letterSpacing: t.tracking.date,
          }}
        >
          {date}
        </span>
      </div>
      {eyebrow && (
        <div
          data-qa="eyebrow"
          style={{
            position: "absolute",
            top: t.layout.eyebrowTop,
            left: t.safe.left,
            right: t.safe.right,
            fontSize: t.size.eyebrow,
            lineHeight: 1,
            whiteSpace: "nowrap",
            fontFamily: /[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(eyebrow)
              ? t.font.eyebrowKo
              : t.font.eyebrowEn,
            letterSpacing: "normal",
            color: t.color.accent,
          }}
        >
          <MixedText text={eyebrow} />
        </div>
      )}
      <div
        data-qa="headline"
        style={{
          position: "absolute",
          top: t.layout.headlineTop,
          left: t.safe.left,
          right: t.safe.right,
          fontFamily: t.font.headline,
          fontWeight: t.weight.headline,
          fontSize: t.size.headline,
          lineHeight: 1.28,
          letterSpacing: t.tracking.headline,
          wordBreak: "keep-all",
          whiteSpace: "pre-line",
        }}
      >
        <MixedText text={headline} />
      </div>
      <div
        data-central-visual="design"
        style={{
          position: "absolute",
          top: t.layout.contentTop,
          left: t.safe.left,
          right: t.safe.right,
          height: t.layout.centralHeight,
        }}
      >
        {children}
      </div>
      <div
        style={{
          position: "absolute",
          left: t.layout.captionInset,
          right: t.layout.captionInset,
          top: t.layout.captionTop,
          height: t.layout.captionHeight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          data-qa="caption"
          style={{
            maxWidth: "100%",
            boxSizing: "border-box",
            backgroundColor: caption ? "#FFFFFF" : "transparent",
            padding: caption ? "12px 24px" : 0,
            fontFamily: t.font.caption,
            fontWeight: t.weight.caption,
            letterSpacing: t.tracking.caption,
            textAlign: "center",
            whiteSpace: "pre-line",
            textWrap: "balance",
            fontSize: t.size.caption,
            lineHeight: 1.35,
            wordBreak: "keep-all",
          }}
        >
          <MixedText text={caption} variant="caption" />
        </div>
      </div>
      {overlay}
      <div
        data-qa="source"
        style={{
          position: "absolute",
          left: t.layout.sourceLeft,
          right: t.layout.sourceRight,
          top: t.layout.sourceTop,
          maxHeight: t.layout.sourceHeight,
          textAlign: "right",
          wordBreak: "keep-all",
          fontSize: t.size.source,
          lineHeight: t.layout.sourceLineHeight,
          color: t.color.muted,
        }}
      >
        {note && (
          <>
            <MixedText text={note} variant="chart" />
            <br />
          </>
        )}
        <MixedText text={source} />
      </div>
    </AbsoluteFill>
  );
};
