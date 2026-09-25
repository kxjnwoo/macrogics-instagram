import React from "react";
import { CanvasImage, staticFile } from "remotion";
import type { Series } from "../design-schema";
import { chartLegend, chartSummary } from "../chart-summary";
import { tokens as t } from "../tokens";
import { MixedText } from "./MixedText";

export type ChartIdentity = { src: string; name: string };

/** Large readable observations for SceneVisual's body region, never a second tiny chart rail. */
export const ChartTakeaway: React.FC<{
  series: Series[];
  kind: string;
  identities?: Readonly<Record<string, ChartIdentity>>;
}> = ({ series, kind, identities = {} }) => {
  if (!["line", "area", "index"].includes(kind))
    throw Error("Chart takeaway requires a line, area or index chart");
  if (series.length > 2)
    throw Error("Chart takeaway supports at most two series");
  const summaries = series.map((s) => chartSummary(s, kind === "index"));
  if (summaries.some((summary) => !summary))
    throw Error("Chart takeaway requires actual boundary observations");
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        fontSize: t.size.chartBody,
        fontFamily: t.font.body,
        fontWeight: t.weight.body,
        letterSpacing: t.tracking.body,
        lineHeight: 1.25,
        width: "100%",
        minWidth: 0,
      }}
    >
      {series.map((s, i) => {
        const summary = summaries[i]!;
        const color = i ? t.color.negative : t.color.accent;
        const identity = identities[s.id];
        return (
          <div
            key={s.id}
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              columnGap: 20,
              rowGap: 0,
            }}
            aria-label={`${s.title}: ${summary.from} ${summary.start} to ${summary.to} ${summary.end}; change ${summary.change}`}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                maxWidth: "100%",
                whiteSpace: "nowrap",
              }}
            >
              {identity ? (
                <span
                  style={{
                    display: "inline-flex",
                    width: 46,
                    height: 46,
                    flexShrink: 0,
                    borderRadius: "50%",
                    overflow: "hidden",
                    backgroundColor: "#FFFFFF",
                    border: `2px solid ${color}`,
                  }}
                >
                  <CanvasImage
                    src={
                      /^(https?:|data:)/.test(identity.src)
                        ? identity.src
                        : staticFile(identity.src)
                    }
                    name={identity.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      padding: 6,
                      boxSizing: "border-box",
                      objectFit: "contain",
                    }}
                  />
                </span>
              ) : (
                <span
                  aria-hidden="true"
                  style={{
                    display: "inline-block",
                    width: series.length > 1 ? 3 : 12,
                    height: series.length > 1 ? 44 : 12,
                    borderRadius: series.length > 1 ? 0 : "50%",
                    backgroundColor: color,
                    flexShrink: 0,
                  }}
                />
              )}
              <span>
                <MixedText
                  text={`${series.length > 1 ? `${chartLegend(s)} ` : ""}${summary.start} → ${summary.end}`}
                  variant="body"
                />
              </span>
            </span>
            <span
              style={{
                whiteSpace: "nowrap",
                marginLeft: "auto",
                color,
              }}
            >
              <MixedText text={summary.change} variant="body" />
            </span>
          </div>
        );
      })}
    </div>
  );
};
