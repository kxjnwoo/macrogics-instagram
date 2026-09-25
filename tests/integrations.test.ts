import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { fetchSeries, companyProfile } from "../integrations/data";
import { collectFeeds } from "../integrations/news";
import { parseSectorPage } from "../integrations/sector-valuation";
import { chatCompletion } from "../integrations/model";
import type { DataRequest } from "../integrations/schema";

function mockKey(t: TestContext, name: string) {
  const previous = process.env[name];
  process.env[name] = "offline-test-only";
  t.after(() => {
    if (previous === undefined) delete process.env[name];
    else process.env[name] = previous;
  });
}

const request: DataRequest = {
  provider: "fred",
  id: "rate",
  symbol: "DGS10",
  title: "10Y",
  start: "2026-09-01",
  end: "2026-09-02",
  semantics: {
    kind: "yield",
    unit: "%",
    currency: null,
    adjustment: "not_applicable",
    fxDirection: null,
    frequency: "daily",
    vintage: "2026-09-03",
    revision: "latest_vintage",
    seasonalAdjustment: "Not Seasonally Adjusted",
    maxAgeDays: 7,
  },
};

test("FRED transport retains requested vintage and raw missing values", async (t) => {
  mockKey(t, "FRED_API_KEY");
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/observations")) {
      assert.equal(url.searchParams.get("realtime_start"), "2026-09-03");
      assert.equal(url.searchParams.get("realtime_end"), "2026-09-03");
      return Response.json({
        observations: [
          { date: "2026-09-01", value: "." },
          { date: "2026-09-02", value: "4.2" },
        ],
      });
    }
    return Response.json({
      seriess: [
        {
          title: "10Y",
          units: "Percent",
          frequency: "Daily",
          seasonal_adjustment: "Not Seasonally Adjusted",
        },
      ],
    });
  });
  const result = await fetchSeries(request, "2026-09-03T12:00:00Z");
  assert.deepEqual(
    result.points.map((p) => p.value),
    [null, 4.2],
  );
  assert.equal(result.published_at, null);
  await assert.rejects(
    fetchSeries(request, "2026-09-02T12:00:00Z"),
    /vintage after cutoff/,
  );
});

test("Finnhub profile preserves missing logos without substituting an asset", async (t) => {
  mockKey(t, "FINNHUB_API_KEY");
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({
      name: "Example",
      ticker: "EX",
      country: "US",
      finnhubIndustry: "Technology",
      logo: "",
    }),
  );
  const result = await companyProfile("EX");
  assert.equal(result.name, "Example");
  assert.equal(result.logo, null);
});

test("RSS connector uses explicit time bounds and exposes feed failures", async (t) => {
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) =>
    String(input).includes("failed")
      ? new Response("", { status: 503 })
      : new Response(
          "<rss><channel><item><title>Within window</title><link>https://example.com/a</link><pubDate>2026-09-02T00:00:00Z</pubDate></item><item><title>Outside window</title><link>https://example.com/b</link><pubDate>2026-09-04T00:00:00Z</pubDate></item></channel></rss>",
        ),
  );
  const result = await collectFeeds(
    "2026-09-01T00:00:00Z",
    "2026-09-03T00:00:00Z",
    [
      { publisher: "Example", url: "https://example.com/feed" },
      { publisher: "Failed", url: "https://example.com/failed" },
    ],
  );
  assert.equal(result.articles.length, 1);
  assert.equal(result.articles[0].url, "https://example.com/a");
  assert.deepEqual(result.errors, ["Failed: feed unavailable"]);
});

test("State Street parser keeps index FY1 separate from fund characteristics", () => {
  const html =
    '<span class="fund-header__ticker">XLK</span><section><h2>Fund Characteristics<span class="date">as of Sep 2 2026</span></h2><tr><th>Price/Earnings Ratio FY1</th><td class="data">99</td></tr></section><section><h2>Index Characteristics<span class="date">as of Sep 2 2026</span></h2><tr><th>Price/Earnings Ratio FY1</th><td class="data">25.5</td></tr></section>';
  assert.deepEqual(parseSectorPage(html, "XLK"), {
    asOfDate: "2026-09-02",
    value: 25.5,
  });
  assert.throws(() => parseSectorPage(html, "XLE"), /wrong fund page/);
});

test("model connector sends only caller messages without an authored system prompt", async (t) => {
  mockKey(t, "EDITOR_API_KEY");
  const messages = [{ role: "user" as const, content: "Connection test" }];
  t.mock.method(
    globalThis,
    "fetch",
    async (_input: RequestInfo | URL, init?: RequestInit) => {
      assert.deepEqual(JSON.parse(String(init?.body)).messages, messages);
      return Response.json({ choices: [] });
    },
  );
  assert.deepEqual(await chatCompletion(messages), { choices: [] });
});
