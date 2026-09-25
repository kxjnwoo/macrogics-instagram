import test from "node:test";
import assert from "node:assert/strict";
import {
  inspectPlatformLayout,
  inspectContentRegions,
  INSTAGRAM_PLATFORM_PROFILES,
  intersectRects,
  platformTransform,
  sourceRectToScreen,
  type PlatformProfile,
} from "../src/platform-layout";

const observation = (): PlatformProfile => ({
  id: "test-observed-mobile-cover",
  label: "Observed cover geometry",
  basis: "observed",
  calibration:
    "Geometry fixture from the supplied 1206×2622 screen, 1206×2370 video viewport.",
  source: { width: 1080, height: 1920 },
  screen: { width: 1206, height: 2622 },
  viewport: { x: 0, y: 0, width: 1206, height: 2370 },
  masks: [],
});

test("mobile cover projects source coordinates with the measured horizontal crop", () => {
  const p = observation();
  const t = platformTransform(p);
  assert.equal(t.scale, 1.234375);
  assert.equal(t.x, -63.5625);
  assert.equal(t.y, 0);
  assert(Math.abs(t.visibleSourceRect.x - 51.49367088607595) < 1e-10);
  assert.equal(t.visibleSourceRect.height, 1920);
  assert.deepEqual(
    sourceRectToScreen({ x: 540, y: 960, width: 100, height: 40 }, p),
    {
      x: 603,
      y: 1185,
      width: 123.4375,
      height: 49.375,
    },
  );
});

test("actual content clipping is rejected even if it is inside the source canvas", () => {
  const p = observation();
  const result = inspectPlatformLayout(
    [
      { name: "left-label", x: 30, y: 600, width: 50, height: 30 },
      { name: "right-label", x: 1000, y: 600, width: 60, height: 30 },
      { name: "central-label", x: 100, y: 600, width: 200, height: 30 },
    ],
    [p],
  );
  assert.deepEqual(
    result.profiles[0].issues.map((i) => [i.name, i.code]),
    [
      ["left-label", "cropped"],
      ["right-label", "cropped"],
    ],
  );
});

test("UI overlays reject covered text while a source note can use unoccupied lower space", () => {
  const p = observation();
  p.masks = [
    {
      id: "top-controls",
      label: "Top controls",
      rect: sourceRectToScreen({ x: 0, y: 0, width: 1080, height: 270 }, p),
    },
    {
      id: "actions",
      label: "Right action rail",
      rect: sourceRectToScreen({ x: 900, y: 1160, width: 180, height: 760 }, p),
    },
    {
      id: "account",
      label: "Bottom account/caption",
      rect: sourceRectToScreen({ x: 0, y: 1700, width: 850, height: 220 }, p),
    },
  ];
  const result = inspectPlatformLayout(
    [
      { name: "old-masthead", x: 88, y: 132, width: 870, height: 60 },
      { name: "chart-label", x: 920, y: 1300, width: 40, height: 30 },
      { name: "bottom-caption", x: 100, y: 1720, width: 700, height: 60 },
      { name: "source", x: 550, y: 1610, width: 300, height: 40 },
      { name: "new-masthead", x: 100, y: 320, width: 780, height: 60 },
    ],
    [p],
  );
  assert.deepEqual(
    result.profiles[0].issues.map((i) => [i.name, i.maskId]),
    [
      ["old-masthead", "top-controls"],
      ["chart-label", "actions"],
      ["bottom-caption", "account"],
    ],
  );
});

test("a conservative profile can catch a layout that only clears the observed UI", () => {
  const observed = observation();
  const stress = {
    ...observation(),
    id: "test-stress",
    basis: "stress" as const,
  };
  observed.masks = [
    {
      id: "actions",
      label: "Actions",
      rect: sourceRectToScreen(
        { x: 900, y: 1160, width: 180, height: 760 },
        observed,
      ),
    },
  ];
  stress.masks = [
    {
      id: "actions",
      label: "Actions plus margin",
      rect: sourceRectToScreen(
        { x: 880, y: 1120, width: 200, height: 800 },
        stress,
      ),
    },
  ];
  const result = inspectPlatformLayout(
    [{ name: "near-rail", x: 860, y: 1200, width: 30, height: 30 }],
    [observed, stress],
  );
  assert.equal(result.profiles[0].issues.length, 0);
  assert.equal(result.profiles[1].issues[0].maskId, "actions");
  assert.match(result.limitation, /not a guarantee/);
});

test("geometry respects viewport origin, vertical cover cropping and tiny rounding tolerance", () => {
  const p = observation();
  p.viewport = { x: 100, y: 200, width: 1000, height: 1000 };
  const t = platformTransform(p);
  assert.equal(t.x, 100);
  assert(t.y < p.viewport.y);
  assert(t.visibleSourceRect.y > 0);
  const actual = {
    name: "near-top",
    x: 100,
    y: t.visibleSourceRect.y - 0.5,
    width: 100,
    height: 20,
  };
  assert.equal(inspectPlatformLayout([actual], [p]).errors.length, 0);
  assert.equal(
    inspectPlatformLayout([actual], [p], 0).profiles[0].issues[0].code,
    "cropped",
  );
});

test("invalid content and calibration fail closed; touching rectangle edges do not overlap", () => {
  assert.equal(
    intersectRects(
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 10, y: 0, width: 10, height: 10 },
    ),
    null,
  );
  const p = observation();
  const r = inspectPlatformLayout(
    [{ name: "broken", x: Number.NaN, y: 0, width: 20, height: 20 }],
    [p],
  );
  assert.equal(r.profiles[0].issues[0].code, "invalid-rect");
  assert.throws(() => inspectPlatformLayout([], []), /profile is required/);
  assert.throws(() => inspectPlatformLayout([], [p], -1), /nonnegative/);
  p.viewport.width = 0;
  assert.throws(() => platformTransform(p), /Invalid platform calibration/);
});

test("calibrated Instagram profiles preserve observed affine geometry and concrete UI masks", () => {
  const [observed, stress] = INSTAGRAM_PLATFORM_PROFILES;
  assert.equal(platformTransform(observed).scale, 1.2355);
  assert.equal(platformTransform(observed).x, -65);
  assert.equal(observed.viewport.height, 2372);
  assert.equal(observed.masks.length, 4);
  const check = inspectPlatformLayout(
    [
      { name: "masthead", x: 144, y: 280, width: 720, height: 75 },
      { name: "source", x: 350, y: 1610, width: 530, height: 80 },
      { name: "poll-blocked-note", x: 100, y: 1610, width: 170, height: 40 },
      { name: "bottom-edge-note", x: 400, y: 1695, width: 200, height: 10 },
    ],
    [observed, stress],
  );
  assert.deepEqual(
    check.profiles[0].issues.map((i) => [i.name, i.maskId]),
    [["poll-blocked-note", "left-poll"]],
  );
  assert.deepEqual(
    check.profiles[1].issues.map((i) => [i.name, i.maskId]),
    [
      ["poll-blocked-note", "left-poll"],
      ["bottom-edge-note", "bottom-account"],
    ],
  );
});

test("tighter rail clearance allows centered captions but still rejects actual button overlap", () => {
  const result = inspectPlatformLayout(
    [
      { name: "centered-caption", x: 176, y: 1396, width: 728, height: 172 },
      { name: "inside-buffer", x: 906, y: 1450, width: 10, height: 30 },
      { name: "on-button", x: 918, y: 1450, width: 10, height: 30 },
    ],
    INSTAGRAM_PLATFORM_PROFILES,
  );
  assert.deepEqual(
    result.profiles[0].issues.map((i) => [i.name, i.maskId]),
    [["on-button", "right-actions"]],
  );
  assert.deepEqual(
    result.profiles[1].issues.map((i) => [i.name, i.maskId]),
    [["inside-buffer", "right-actions"], ["on-button", "right-actions"]],
  );
});

test("reserved content regions allow the lower-right source slot without relaxing other roles", () => {
  const regions = {
    headline: { x: 144, y: 396, width: 720, height: 264 },
    body: { x: 144, y: 700, width: 720, height: 688 },
    source: { x: 350, y: 1610, width: 530, height: 80 },
  };
  assert.deepEqual(
    inspectContentRegions(
      [
        { name: "headline", x: 145, y: 401, width: 700, height: 244.1 },
        { name: "body", x: 160, y: 1204, width: 688, height: 177.3 },
        { name: "source", x: 400, y: 1620, width: 450, height: 60 },
      ],
      regions,
    ),
    [],
  );
  assert.match(
    inspectContentRegions(
      [{ name: "headline", x: 400, y: 1620, width: 450, height: 60 }],
      regions,
    )[0],
    /reserved region/,
  );
  assert.match(
    inspectContentRegions(
      [{ name: "unclassified", x: 400, y: 1620, width: 450, height: 60 }],
      regions,
    )[0],
    /missing content region/,
  );
});

test("measured two-line caption clears the poll only after moving its reserved slot", () => {
  const previous = {
    name: "caption",
    x: 144,
    y: 1420,
    width: 720,
    height: 172.4,
  };
  const corrected = { ...previous, y: 1396 };
  const oldReport = inspectPlatformLayout(
    [previous],
    INSTAGRAM_PLATFORM_PROFILES,
  );
  assert(
    oldReport.profiles.every((p) =>
      p.issues.some((i) => i.maskId === "left-poll"),
    ),
  );
  assert.deepEqual(
    inspectPlatformLayout([corrected], INSTAGRAM_PLATFORM_PROFILES).errors,
    [],
  );
  assert.deepEqual(
    inspectContentRegions([corrected], {
      caption: { x: 144, y: 1396, width: 720, height: 172 },
    }),
    [],
  );
});
