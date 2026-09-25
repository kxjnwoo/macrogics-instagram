import { z } from "zod";
const identifier = z.string().regex(/^[a-zA-Z0-9_-]+$/);
const stamp = z.string().datetime({ offset: true });
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const semanticsSchema = z.object({
  kind: z.enum([
    "close",
    "adjusted_close",
    "total_return_index",
    "yield",
    "fx",
    "spot",
    "futures",
    "economic",
    "fixture",
  ]),
  unit: z.string().min(1),
  currency: z.string().nullable(),
  adjustment: z.enum(["none", "splits", "all", "not_applicable"]),
  fxDirection: z.string().nullable(),
  frequency: z.enum(["daily", "weekly", "monthly", "quarterly"]),
  vintage: day.nullable(),
  revision: z.enum(["initial", "revised", "latest_vintage", "not_applicable"]),
  seasonalAdjustment: z.string(),
  maxAgeDays: z.number().int().positive(),
});
export const seriesSchema = z.object({
  id: identifier,
  provider: z.enum(["fred", "twelve", "farside", "fixture"]),
  symbol: z.string(),
  title: z.string(),
  source_url: z.string().url(),
  publisher: z.string(),
  retrieved_at: stamp,
  published_at: stamp.nullable(),
  provisionalLastBar: z
    .object({ date: day, capturedAt: stamp, timezone: z.literal("UTC") })
    .optional(),
  historicalExtension: z
    .object({
      start: day,
      end: day,
      retrieved_at: stamp,
      source_url: z.string().url(),
    })
    .optional(),
  marketCalendar: z
    .enum(["us-equities", "fx-weekdays", "crypto-24x7", "unknown"])
    .optional(),
  marketMetadata: z
    .object({
      exchange: z.string().nullable(),
      micCode: z.string().nullable(),
      instrumentType: z.string(),
    })
    .optional(),
  semantics: semanticsSchema,
  points: z
    .array(
      z.object({
        date: day,
        value: z.number().finite().nullable(),
        open: z.number().optional(),
        high: z.number().optional(),
        low: z.number().optional(),
      }),
    )
    .min(2),
});
export const dataRequestSchema = z.object({
  provider: z.enum(["fred", "twelve", "farside"]),
  id: identifier,
  symbol: z.string(),
  title: z.string(),
  start: day,
  end: day,
  semantics: semanticsSchema,
});
export type DataRequest = z.infer<typeof dataRequestSchema>;
export type Series = z.infer<typeof seriesSchema>;
