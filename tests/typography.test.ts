import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
import React from "react";
import { createRequire } from "node:module";
import { openBrowser } from "@remotion/renderer";
import { MixedText } from "../src/components/MixedText";
import { ChartText } from "../src/components/ChartText";
const { renderToStaticMarkup } = createRequire(import.meta.url)(
  "react-dom/server",
) as { renderToStaticMarkup(node: React.ReactNode): string };
import {
  inspectTypography,
  type TypographyMeasurement,
} from "../src/typography";

test("actual Korean body tracking follows its text size, including nested concept labels", async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), "macrogics-typography-test-"));
  const url = pathToFileURL(
    path.resolve("public/fonts/Pretendard/static/Pretendard-Regular.otf"),
  ).href;
  const labels = [30, 52, 60, 64]
    .map(
      (size) =>
        `<div style="font-size:${size}px">${renderToStaticMarkup(React.createElement(MixedText, { text: "기관의 장기 매수", variant: "body" }))}</div>`,
    )
    .join("");
  const latinUrl = pathToFileURL(
    path.resolve("public/fonts/Instrument_Serif/InstrumentSerif-Regular.ttf"),
  ).href;
  const chart = renderToStaticMarkup(
    React.createElement(
      "svg",
      { style: { fontSize: 16, letterSpacing: ".01em" } },
      React.createElement(ChartText, { fontSize: 26 }, "$100,000"),
      React.createElement(ChartText, { fontSize: 28 }, "집계 전"),
    ),
  );
  await fs.writeFile(
    folder + "/index.html",
    `<style>@font-face{font-family:Pretendard;src:url('${url}');font-weight:400}@font-face{font-family:'Instrument Serif';src:url('${latinUrl}')}svg text{font-family:inherit;letter-spacing:inherit}</style><div style="font-family:Pretendard;font-size:16px;letter-spacing:-.02em">${labels}</div>${chart}`,
  );
  const browser = await openBrowser("chrome", { logLevel: "error" });
  try {
    const page = await browser.newPage({
      context: () => null,
      logLevel: "error",
      indent: false,
      pageIndex: 0,
      onBrowserLog: null,
      onLog: () => {},
    });
    await page.goto({
      url: pathToFileURL(folder + "/index.html").href,
      timeout: 30000,
    });
    const measurements = await page.evaluate(async () => {
      await document.fonts.ready;
      return Array.from(
        document.querySelectorAll<HTMLElement>('[data-typography="body"]'),
      ).map((node) => {
        const s = getComputedStyle(node);
        return {
          role: "body" as const,
          text: node.textContent!,
          fontFamily: s.fontFamily,
          fontWeight: s.fontWeight,
          fontSize: parseFloat(s.fontSize),
          letterSpacing: parseFloat(s.letterSpacing),
          fontLoaded: document.fonts.check(
            `400 ${s.fontSize} Pretendard`,
            node.textContent!,
          ),
        };
      });
    });
    assert.equal(measurements.length, 12);
    for (const m of measurements) assert.deepEqual(inspectTypography(m), []);
    const body64 = measurements.find((m) => m.fontSize === 64)!;
    assert.equal(body64.letterSpacing, -1.28);
    assert.match(
      inspectTypography({ ...body64, letterSpacing: -0.32 }).join(),
      /tracking/,
    );
    assert.match(
      inspectTypography({ ...body64, fontFamily: "serif" }).join(),
      /expected loaded/,
    );
    assert.match(
      inspectTypography({ ...body64, fontWeight: "600" }).join(),
      /weight/,
    );
    const chartStyles = await page.evaluate(() =>
      Array.from(document.querySelectorAll("svg text")).map((node) => {
        const s = getComputedStyle(node);
        return {
          family: s.fontFamily,
          size: parseFloat(s.fontSize),
          spacing: parseFloat(s.letterSpacing),
        };
      }),
    );
    assert.equal(chartStyles[0].spacing, 0.26);
    assert.equal(chartStyles[1].spacing, -0.56);
    assert.equal(chartStyles[1].family, "Pretendard");
  } finally {
    await browser.close({ silent: true });
    await fs.rm(folder, { recursive: true, force: true });
  }
});

test("Latin captions retain their distinct font and tracking policy", () => {
  const m: TypographyMeasurement = {
    role: "caption-latin",
    text: "ETF",
    fontFamily: "Editorial",
    fontWeight: "400",
    fontSize: 54,
    letterSpacing: -0.81,
    fontLoaded: true,
  };
  assert.deepEqual(inspectTypography(m), []);
  assert.match(
    inspectTypography({ ...m, letterSpacing: -1.08 }).join(),
    /tracking/,
  );
});
