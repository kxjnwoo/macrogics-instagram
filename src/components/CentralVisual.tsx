import React from "react";
import { CanvasImage, staticFile, useCurrentFrame } from "remotion";
import type { VisualContext, SceneVisual } from "../design-schema";
import { tokens as t } from "../tokens";
import { cueProgress, cueStartFrame } from "../visual-timing";
import { MixedText } from "./MixedText";
import { formatStatisticValue } from "../visual-composition";

type Visual = NonNullable<SceneVisual["visual"]>;
type Tile = Extract<Visual, { kind: "tiles" }>["items"][number];
const source = (src: string) =>
  /^(https?:|data:)/.test(src) ? src : staticFile(src);
function visualAsset(context: VisualContext, id: string, kind: "portrait" | "icon") {
  const asset = context.visualAssets?.find((asset) => asset.id === id);
  if (!asset || asset.kind !== kind)
    throw Error(`Verified ${kind} asset ${id} is required`);
  return asset;
}

const Tiles: React.FC<{
  items: Tile[];
  scene: SceneVisual;
  context: VisualContext;
  frame: number;
}> = ({ items, scene, context, frame }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
      gap: 30,
      width: "100%",
    }}
  >
    {items.map((item) => {
      const asset = visualAsset(context, item.assetId, "icon");
      const progress = cueProgress(
        frame,
        cueStartFrame(scene.captions, item.cueIndex),
      );
      return (
        <div
          key={item.assetId}
          data-central-visual="tile"
          style={{
            textAlign: "center",
            opacity: progress,
            translate: `0 ${(1 - progress) * 12}px`,
          }}
        >
          <CanvasImage
            src={source(asset.src)}
            name={item.label}
            style={{ width: 180, height: 180, objectFit: "contain" }}
          />
          <div
            style={{
              marginTop: 18,
              fontSize: t.visualText.label,
              lineHeight: 1.3,
              whiteSpace: "pre-line",
              wordBreak: "keep-all",
            }}
          >
            <MixedText text={item.label} variant="body" />
          </div>
        </div>
      );
    })}
  </div>
);

const RelationMark: React.FC<{
  operator: "equal" | "not-equal" | "arrow";
  progress: number;
}> = ({ operator, progress }) => {
  const paths =
    operator === "arrow"
      ? ["M24 66 H122", "M94 37 L123 66 L94 95"]
      : operator === "not-equal"
        ? ["M25 48 H120", "M25 84 H120", "M92 21 L52 111"]
        : ["M25 48 H120", "M25 84 H120"];
  return (
    <svg
      data-central-visual="relation-operator"
      width={144}
      height={132}
      viewBox="0 0 144 132"
      aria-label={operator}
      style={{ flexShrink: 0, opacity: progress > 0 ? 1 : 0 }}
    >
      {paths.map((path, index) => (
        <path
          key={path}
          d={path}
          pathLength={1}
          stroke={t.color.accent}
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray={1}
          strokeDashoffset={
            1 - Math.max(0, Math.min(1, progress * paths.length - index))
          }
        />
      ))}
    </svg>
  );
};

/** A single measured central region; each variant uses the same caption-safe bounds. */
export const CentralVisual: React.FC<{ scene: SceneVisual; context: VisualContext }> = ({
  scene,
  context,
}) => {
  const frame = useCurrentFrame();
  const visual = scene.visual;
  if (!visual) return null;
  let content: React.ReactNode;
  if (visual.kind === "portrait") {
    const asset = visualAsset(context, visual.assetId, "portrait");
    content = (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `${t.layout.portraitWidth}px minmax(0, 1fr)`,
          alignItems: "center",
          gap: t.layout.portraitGap,
          height: "100%",
        }}
      >
        <CanvasImage
          data-central-visual="portrait"
          src={source(asset.src)}
          name={visual.name}
          style={{
            width: t.layout.portraitWidth,
            height: t.layout.portraitHeight,
            objectFit: "cover",
            objectPosition: "center bottom",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              fontSize: t.visualText.label,
              lineHeight: 1.25,
            }}
          >
            <MixedText text={visual.name} variant="body" />
          </div>
          <div
            style={{
              fontSize: t.visualText.role,
              lineHeight: 1.35,
              color: t.color.muted,
              whiteSpace: "pre-line",
            }}
          >
            <MixedText text={visual.role} variant="body" />
          </div>
          {visual.quote && <div
            style={{
              marginTop: 20,
              borderLeft: `2px solid ${t.color.accent}`,
              paddingLeft: 24,
              fontFamily: t.font.quote,
              fontSize: t.visualText.quote,
              lineHeight: 1.35,
              letterSpacing: t.tracking.quote,
              whiteSpace: "pre-line",
              wordBreak: "keep-all",
            }}
          >
            {visual.quote.split(/(?<=·)/u).map((part, index, parts) => (
              <React.Fragment key={index}>
                <MixedText text={part} />
                {index < parts.length - 1 && <wbr />}
              </React.Fragment>
            ))}
          </div>}
        </div>
      </div>
    );
  } else if (visual.kind === "relation") {
    const [left, operator, right] = visual.cueIndices.map((index) =>
      cueStartFrame(scene.captions, index),
    );
    if (right < operator + 18)
      throw Error(
        "The right relation cue must follow the completed operator drawing",
      );
    const labelStyle: React.CSSProperties = {
      fontSize: t.visualText.body,
      lineHeight: 1.35,
      textAlign: "center",
      wordBreak: "keep-all",
      whiteSpace: "pre-line",
    };
    content = (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 38,
          height: "100%",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) 144px minmax(0,1fr)",
            gap: 14,
            alignItems: "center",
            minHeight: 240,
          }}
        >
          <div
            data-central-visual="relation-left"
            style={{ ...labelStyle, opacity: cueProgress(frame, left) }}
          >
            <MixedText text={visual.left} variant="body" />
          </div>
          <RelationMark
            operator={visual.operator}
            progress={cueProgress(frame, operator, 18)}
          />
          <div
            data-central-visual="relation-right"
            style={{ ...labelStyle, opacity: cueProgress(frame, right) }}
          >
            <MixedText text={visual.right} variant="body" />
          </div>
        </div>
        {visual.tiles?.length ? (
          <Tiles
            items={visual.tiles}
            scene={scene}
            context={context}
            frame={frame}
          />
        ) : null}
      </div>
    );
  } else if (visual.kind === "tiles") {
    content = (
      <div style={{ display: "flex", alignItems: "center", height: "100%" }}>
        <Tiles
          items={visual.items}
          scene={scene}
          context={context}
          frame={frame}
        />
      </div>
    );
  } else if (visual.kind === "statistic") {
    const statistic = context.statistics.find((statistic) => statistic.id === visual.statisticId);
    if (!statistic || statistic.value === null || !statistic.unit)
      throw Error(
        "Statistic visual requires a numeric value and explicit unit",
      );
    const value = formatStatisticValue(statistic.value);
    content = (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 32,
          height: "100%",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 184, lineHeight: 1.1, color: t.color.accent }}>
          <MixedText text={value} variant="body" />
        </div>
        <div
          style={{
            fontSize: t.visualText.unit,
            lineHeight: 1.2,
          }}
        >
          <MixedText text={statistic.unit} variant="body" />
        </div>
        <div
          style={{
            fontSize: t.visualText.body,
            lineHeight: 1.3,
          }}
        >
          <MixedText text={visual.label} variant="body" />
        </div>
      </div>
    );
  } else if (visual.kind === "sector-pair") {
    const rows = visual.tickers.map((ticker) => context.valuationSnapshot?.rows.find((row) => row.ticker === ticker));
    if (rows.some((row) => !row)) throw Error("Sector pair needs archived index values");
    content = (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: 36 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          {rows.map((row) => (
            <div key={row!.ticker} style={{ borderTop: `3px solid ${t.color.accent}`, paddingTop: 28, textAlign: "center" }}>
              <div style={{ fontSize: 43, fontFamily: t.font.body }}>{row!.sector}</div>
              <div style={{ fontSize: 29, fontFamily: t.font.latin, color: t.color.muted }}>{row!.ticker}</div>
              <div style={{ fontSize: 108, fontFamily: t.font.number, color: t.color.accent }}>{row!.value.toFixed(2)}</div>
              <div style={{ fontSize: 37, fontFamily: t.font.body }}>배</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", fontSize: 39, lineHeight: 1.3 }}><MixedText text={visual.label} variant="body" /></div>
        <div style={{ textAlign: "center", fontSize: 25, color: t.color.muted }}>
          지수 FY1 PER · {context.valuationSnapshot?.asOfDate.replaceAll("-", ".")} 기준
        </div>
      </div>
    );
  } else {
    content = (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 44,
          height: "100%",
          textAlign: "center",
          whiteSpace: "pre-line",
          wordBreak: "keep-all",
        }}
      >
        <div style={{ fontSize: t.size.body, lineHeight: 1.35 }}>
          <MixedText text={visual.text} variant="body" />
        </div>
        <div
          style={{
            width: 120,
            height: 2,
            backgroundColor: t.color.accent,
            alignSelf: "center",
          }}
        />
        <div
          style={{
            fontFamily: t.font.quote,
            fontSize: 72,
            lineHeight: 1.35,
            letterSpacing: t.tracking.quote,
            color: t.color.accent,
          }}
        >
          <MixedText text={visual.emphasis} />
        </div>
      </div>
    );
  }
  return (
    <div
      data-qa="central-visual"
      data-central-visual={visual.kind}
      style={{
        height: t.layout.centralHeight,
        padding: `0 ${t.layout.bodyInset}px`,
        boxSizing: "border-box",
        fontFamily: t.font.body,
        fontWeight: t.weight.body,
        letterSpacing: t.tracking.body,
      }}
    >
      {content}
    </div>
  );
};
