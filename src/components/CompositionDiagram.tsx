import React from "react";
import { CanvasImage, staticFile } from "remotion";
import type { VisualContext, SceneVisual } from "../design-schema";
import type { CompositionElement } from "../composition-schema";
import { diagramEdgePoints } from "../visual-composition";
import { cueProgress, cueStartFrame } from "../visual-timing";
import { tokens as t } from "../tokens";
import { MixedText } from "./MixedText";

/** Semantic nodes keep their real type sizes; only strokes and opacity evolve. */
export function CompositionDiagram({ element, scene, context, width, height, frame, start }: {
  element: Extract<CompositionElement, { kind: "diagram" }>;
  scene: SceneVisual; context: VisualContext; width: number; height: number; frame: number; start: number;
}) {
  return <div style={{ position: "relative", width, height }}>
    <svg width={width} height={height} style={{ position: "absolute", inset: 0, overflow: "visible" }} aria-label="근거에 연결된 설명 도식">
      {element.edges.map((edge) => {
        const from = element.nodes.find((node) => node.id === edge.from);
        const to = element.nodes.find((node) => node.id === edge.to);
        if (!from || !to) throw Error(`Unknown diagram edge endpoint ${edge.id}`);
        const edgeStart = cueStartFrame(scene.captions, edge.cueIndex);
        if (frame < edgeStart) return null;
        const progress = cueProgress(frame, edgeStart, t.motion.enter);
        const [a, b] = diagramEdgePoints(from, to, edge, width, height);
        const tip = { x: a.x + (b.x - a.x) * progress, y: a.y + (b.y - a.y) * progress };
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        const ux = (b.x - a.x) / Math.max(1, length), uy = (b.y - a.y) / Math.max(1, length);
        const arrow = [tip, { x: tip.x - ux * 10 - uy * 7, y: tip.y - uy * 10 + ux * 7 }, { x: tip.x - ux * 10 + uy * 7, y: tip.y - uy * 10 - ux * 7 }];
        return <g key={edge.id} data-diagram-edge={edge.id} data-relation={edge.relation}>
          <title>{edge.label ?? edge.relation}</title>
          <line x1={a.x} y1={a.y} x2={tip.x} y2={tip.y} stroke={t.color.accent} strokeWidth={3} strokeDasharray={edge.relation === "conditional" ? "7 7" : undefined} />
          {edge.relation !== "association" && progress > .85 && <polygon points={arrow.map((point) => `${point.x},${point.y}`).join(" ")} fill={t.color.accent} />}
        </g>;
      })}
    </svg>
    {element.nodes.map((node) => {
      const nodeStart = node.cueIndex === undefined ? start : cueStartFrame(scene.captions, node.cueIndex);
      if (frame < nodeStart) return null;
      const opacity = node.cueIndex === undefined ? 1 : .35 + .65 * cueProgress(frame, nodeStart, t.motion.enter);
      const emphasisStart = node.emphasisCueIndex === undefined ? undefined : cueStartFrame(scene.captions, node.emphasisCueIndex);
      const emphasis = emphasisStart === undefined || frame < emphasisStart ? 0 : Math.sin(Math.min(1, (frame - emphasisStart) / 24) * Math.PI);
      const asset = node.assetId ? context.visualAssets?.find((item) => item.id === node.assetId) : undefined;
      if (node.assetId && !asset) throw Error(`Unknown diagram asset ${node.assetId}`);
      const nodeHeight = node.box.height * height;
      return <div key={node.id} data-composition-element={`${element.id}:${node.id}`} data-qa={`composition-${element.id}:${node.id}`} style={{ position: "absolute", left: node.box.x * width, top: node.box.y * height, width: node.box.width * width, height: nodeHeight, boxSizing: "border-box", padding: 12, opacity, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, border: node.appearance === "card" ? `2px solid ${emphasis ? t.color.accent : t.color.line}` : undefined, borderRadius: node.appearance === "card" ? 18 : undefined, background: node.appearance === "card" ? t.color.paper : undefined }}>
        {asset && <CanvasImage src={/^(https?:|data:)/.test(asset.src) ? asset.src : staticFile(asset.src)} name={node.label} style={{ width: "100%", height: nodeHeight * (node.imageFraction ?? .4), flexShrink: 0, objectFit: "contain" }} />}
        <div style={{ fontSize: t.visualText.label, lineHeight: 1.25, textAlign: "center", whiteSpace: "pre-line", wordBreak: "keep-all", color: emphasis > 0 ? t.color.accent : t.color.ink }}><MixedText text={node.label} variant="body" /></div>
        {node.detail && <div style={{ fontSize: t.visualText.role, lineHeight: 1.3, textAlign: "center", whiteSpace: "pre-line", wordBreak: "keep-all", color: t.color.muted }}><MixedText text={node.detail} variant="body" /></div>}
        {asset?.origin === "generated" && <div style={{ fontSize: 25, color: t.color.muted }}><MixedText text="AI 생성 삽화" variant="chart" /></div>}
      </div>;
    })}
  </div>;
}
