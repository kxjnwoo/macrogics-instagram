import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import type { VisualContext } from "../design-schema";
import { tokens as t } from "../tokens";

export const SectorValuationChart: React.FC<{
  rows: NonNullable<VisualContext["valuationSnapshot"]>["rows"];
  scaleMax: number;
  width?: number;
  height?: number;
  startFrame?: number;
}> = ({ rows, scaleMax, width = t.layout.contentWidth, height = t.layout.chartHeight, startFrame = 0 }) => {
  const frame = useCurrentFrame();
  return (
    <div data-qa="chart" style={{ width, height, display: "flex", flexDirection: "column", justifyContent: "space-around" }}>
      {rows.map((row, index) => {
        const progress = interpolate(frame - startFrame, [index * 5, index * 5 + 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <div key={row.ticker} style={{ display: "grid", gridTemplateColumns: "180px 1fr 112px", alignItems: "center", gap: 14, minHeight: 57 }}>
            <div style={{ fontSize: 24, fontFamily: t.font.body, lineHeight: 1.08, display: "flex", flexDirection: "column" }}>
              <span>{row.sector}</span>
              <span style={{ color: t.color.accent, fontFamily: t.font.latin, fontSize: 19 }}>{row.ticker}</span>
            </div>
            <div style={{ height: 20, background: t.color.line, overflow: "hidden" }}>
              <div style={{ width: `${(row.value / scaleMax) * 100 * progress}%`, height: "100%", background: t.color.accent }} />
            </div>
            <span style={{ fontFamily: t.font.number, fontSize: 36, textAlign: "right" }}>{row.value.toFixed(2)}배</span>
          </div>
        );
      })}
    </div>
  );
};
