import { z } from "zod";

const identifier = z.string().regex(/^[a-zA-Z0-9_-]+$/);
const cue = z.number().int().nonnegative();
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const ticker = z.enum(["XLC", "XLY", "XLP", "XLE", "XLF", "XLV", "XLI", "XLK", "XLB", "XLRE", "XLU"]);

/** Boxes describe real layout, never a CSS scale that makes type illegible. */
export const compositionBoxSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().positive().max(1),
  height: z.number().positive().max(1),
}).refine((box) => box.x + box.width <= 1.000001 && box.y + box.height <= 1.000001, "Composition box must stay in the central content region");

export const composedChartSchema = z.object({
  kind: z.enum(["line", "area", "bar", "performance", "yield", "candlestick", "index", "indicator", "sector-valuation"]),
  startDate: day.optional(),
  endDate: day.optional(),
  pendingDate: day.optional(),
  seriesIds: z.array(z.string()),
  sectorTickers: z.array(ticker).optional(),
  label: z.string().max(90),
  title: z.string().max(60).optional(),
  identityAssets: z.record(z.string(), identifier).optional(),
});

const element = {
  id: identifier,
  box: compositionBoxSchema,
  cueIndex: cue.optional(),
  endCueIndex: cue.optional(),
  emphasisCueIndex: cue.optional(),
  /** Optional direction; absent fields preserve the default rendering. */
  motion: z.object({
    enter: z.enum(["none", "fade", "rise"]).optional(),
    exit: z.enum(["none", "fade"]).optional(),
    emphasis: z.enum(["none", "outline", "underline"]).optional(),
  }).optional(),
};

const diagramNodeSchema = z.object({
  id: identifier,
  box: compositionBoxSchema,
  label: z.string().min(1),
  detail: z.string().min(1).optional(),
  cueIndex: cue.optional(),
  emphasisCueIndex: cue.optional(),
  assetId: identifier.optional(),
  /** Image share of this node; type remains at shared readable sizes. */
  imageFraction: z.number().min(.1).max(.7).optional(),
  appearance: z.enum(["plain", "card"]).optional(),
});
const side = z.enum(["top", "right", "bottom", "left"]);
const diagramEdgeSchema = z.object({
  id: identifier,
  from: identifier,
  to: identifier,
  cueIndex: cue,
  relation: z.enum(["sequence", "association", "conditional"]),
  label: z.string().optional(),
  fromSide: side.optional(),
  toSide: side.optional(),
});
export const compositionElementSchema = z.discriminatedUnion("kind", [
  z.object({ ...element, kind: z.literal("chart"), chart: composedChartSchema }),
  z.object({ ...element, kind: z.literal("statistic"), statisticId: identifier, label: z.string().min(1) }),
  z.object({ ...element, kind: z.literal("image"), assetId: identifier, alt: z.string().min(1), label: z.string().min(1).optional(), fit: z.enum(["contain", "cover"]).optional(), focus: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).optional() }),
  z.object({ ...element, kind: z.literal("portrait"), assetId: identifier, name: z.string().min(1), role: z.string().min(1), quote: z.string().min(1).optional() }),
  z.object({ ...element, kind: z.literal("text"), text: z.string().min(1), style: z.enum(["body", "emphasis", "label"]).optional(), align: z.enum(["left", "center", "right"]).optional() }),
  z.object({ ...element, kind: z.literal("relation"), left: z.string().min(1), right: z.string().min(1), operator: z.enum(["equal", "not-equal", "arrow"]), direction: z.enum(["horizontal", "vertical"]).optional(), cueIndices: z.tuple([cue, cue, cue]).optional() }),
  z.object({ ...element, kind: z.literal("timeline"), items: z.array(z.object({ label: z.string().min(1), cueIndex: cue })).min(1) }),
  z.object({ ...element, kind: z.literal("diagram"), nodes: z.array(diagramNodeSchema).min(1), edges: z.array(diagramEdgeSchema) }),
]);

export const compositionSchema = z.object({
  elements: z.array(compositionElementSchema).min(1),
});

export type Composition = z.infer<typeof compositionSchema>;
export type CompositionElement = z.infer<typeof compositionElementSchema>;
export type DiagramNode = z.infer<typeof diagramNodeSchema>;
export type DiagramEdge = z.infer<typeof diagramEdgeSchema>;
