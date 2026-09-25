import test from "node:test";
import assert from "node:assert/strict";
import { fetchSeries } from "../integrations/data";
import type { DataRequest } from "../integrations/schema";

const request: DataRequest = {
  id: "meta_close", provider: "twelve", symbol: "META", title: "Meta",
  start: "2026-09-23", end: "2026-09-24",
  semantics: { kind: "close", unit: "USD/share", currency: "USD", adjustment: "none", fxDirection: null, frequency: "daily", vintage: null, revision: "not_applicable", seasonalAdjustment: "not_applicable", maxAgeDays: 5 },
};

test("Twelve requests include the authored end day, preserve nulls and reject out-of-window bars", async (t) => {
  const originalKey = process.env.TWELVE_DATA_API_KEY;
  process.env.TWELVE_DATA_API_KEY = "offline-test-only";
  t.after(() => { if (originalKey === undefined) delete process.env.TWELVE_DATA_API_KEY; else process.env.TWELVE_DATA_API_KEY = originalKey; });
  let dates = ["2026-09-23", "2026-09-24"];
  t.mock.method(globalThis, "fetch", async (input: URL | RequestInfo) => {
    const url = new URL(String(input));
    assert.equal(url.searchParams.get("start_date"), request.start);
    assert.equal(url.searchParams.get("end_date"), "2026-09-24T23:59:59");
    assert.equal(url.searchParams.get("interval"), "1day");
    assert.equal(url.searchParams.get("adjust"), "none");
    return new Response(JSON.stringify({
      meta: { exchange: "NASDAQ", mic_code: "XNGS", type: "Common Stock", currency: "USD" },
      values: dates.map((datetime, i) => ({ datetime, close: i ? "101" : null, open: null, high: "", low: undefined })),
    }));
  });
  const s = await fetchSeries(request, "2026-09-24T23:00:00Z");
  assert.equal(s.points[0].value, null);
  assert.equal(s.points[1].value, 101);
  assert.equal(s.points[0].open, undefined);
  assert.equal(s.points[0].high, undefined);
  assert.equal(s.points[0].low, undefined);
  assert.equal(s.marketCalendar, "us-equities");
  assert.equal(s.published_at, null);
  for (const invalid of [["2026-09-22", "2026-09-24"], ["2026-09-23", "2026-09-25"], ["2026-09-23", "2026-02-30"]]) {
    dates = invalid;
    await assert.rejects(fetchSeries(request, "2026-09-24T23:00:00Z"), /outside the authored date window/);
  }
});
