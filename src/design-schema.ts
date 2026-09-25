import { z } from "zod";
import { compositionSchema, composedChartSchema } from "./composition-schema";
export type { Series } from "../integrations/schema";
const identifier = z.string().regex(/^[a-zA-Z0-9_-]+$/);
const cue = z.number().int().nonnegative();
export const visualAssetSchema = z.object({
  id: identifier,
  src: z.string().min(1),
  credit: z.string(),
  kind: z.enum([
    "portrait",
    "icon",
    "company-logo",
    "product",
    "screenshot",
    "illustration",
  ]),
  origin: z.enum(["original", "generated"]).optional(),
});
const tileSchema = z.object({
  label: z.string().min(1).max(16),
  assetId: identifier,
  cueIndex: cue,
});
export const centralVisualSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("portrait"),
    assetId: identifier,
    name: z.string().min(1),
    role: z.string().min(1),
    quote: z.string().min(1).max(65).optional(),
  }),
  z.object({
    kind: z.literal("relation"),
    left: z.string().min(1).max(25),
    right: z.string().min(1).max(25),
    operator: z.enum(["not-equal", "equal", "arrow"]),
    cueIndices: z.tuple([cue, cue, cue]),
    tiles: z.array(tileSchema).max(3).optional(),
  }),
  z.object({
    kind: z.literal("tiles"),
    items: z.array(tileSchema).min(2).max(3),
  }),
  z.object({
    kind: z.literal("statistic"),
    statisticId: identifier,
    label: z.string().min(1).max(36),
  }),
  z.object({
    kind: z.literal("question"),
    text: z.string().min(5).max(60),
    emphasis: z.string().min(1).max(30),
  }),
  z.object({
    kind: z.literal("statement"),
    text: z.string().min(5).max(70),
    emphasis: z.string().min(1).max(35),
  }),
  z.object({
    kind: z.literal("sector-pair"),
    tickers: z.tuple([
      z.enum([
        "XLC",
        "XLY",
        "XLP",
        "XLE",
        "XLF",
        "XLV",
        "XLI",
        "XLK",
        "XLB",
        "XLRE",
        "XLU",
      ]),
      z.enum([
        "XLC",
        "XLY",
        "XLP",
        "XLE",
        "XLF",
        "XLV",
        "XLI",
        "XLK",
        "XLB",
        "XLRE",
        "XLU",
      ]),
    ]),
    label: z.string().min(5).max(48),
  }),
]);
export const sceneVisualSchema = z.object({
  durationFrames: z.number().int().positive(),
  visual: centralVisualSchema.optional(),
  composition: compositionSchema.optional(),
  chart: composedChartSchema
    .extend({ revealCueIndex: cue.optional() })
    .nullable()
    .optional(),
  captions: z
    .array(
      z.object({ text: z.string(), startMs: z.number(), endMs: z.number() }),
    )
    .optional(),
});
export type SceneVisual = z.infer<typeof sceneVisualSchema>;
export type VisualContext = {
  series: import("../integrations/schema").Series[];
  statistics: { id: string; value: number | null; unit: string | null }[];
  visualAssets?: z.infer<typeof visualAssetSchema>[];
  valuationSnapshot?: {
    asOfDate: string;
    rows: { ticker: string; sector: string; value: number }[];
  };
};
