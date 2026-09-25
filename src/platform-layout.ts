/** Geometry only. All content rectangles use composition pixels; masks use screen pixels. */
export type LayoutRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};
export type ContentRect = LayoutRect & { name: string };
export type PlatformMask = { id: string; label: string; rect: LayoutRect };
export type PlatformProfile = {
  id: string;
  label: string;
  basis: "observed" | "stress";
  calibration: string;
  source: { width: number; height: number };
  screen: { width: number; height: number };
  /** The rectangle Instagram covers with the source video, before UI is overlaid. */
  viewport: LayoutRect;
  /** Measured affine cover calibration may differ slightly from ideal centered cover. */
  measuredTransform?: { scale: number; x: number; y: number };
  masks: PlatformMask[];
};
export type PlatformIssue = {
  name: string;
  code: "invalid-rect" | "cropped" | "ui-overlap";
  maskId?: string;
  sourceRect: LayoutRect;
  screenRect?: LayoutRect;
  intersection?: LayoutRect;
};

const validRect = (r: LayoutRect) =>
  [r.x, r.y, r.width, r.height].every(Number.isFinite) &&
  r.width > 0 &&
  r.height > 0;

export function intersectRects(
  a: LayoutRect,
  b: LayoutRect,
): LayoutRect | null {
  const x = Math.max(a.x, b.x),
    y = Math.max(a.y, b.y);
  const width = Math.min(a.x + a.width, b.x + b.width) - x;
  const height = Math.min(a.y + a.height, b.y + b.height) - y;
  return width > 0 && height > 0 ? { x, y, width, height } : null;
}

export function platformTransform(profile: PlatformProfile) {
  const { source, screen, viewport } = profile;
  if (
    !validRect({ x: 0, y: 0, ...source }) ||
    !validRect({ x: 0, y: 0, ...screen }) ||
    !validRect(viewport) ||
    viewport.x < 0 ||
    viewport.y < 0 ||
    viewport.x + viewport.width > screen.width ||
    viewport.y + viewport.height > screen.height ||
    profile.masks.some((m) => !validRect(m.rect))
  )
    throw Error(`Invalid platform calibration: ${profile.id}`);
  const idealScale = Math.max(
    viewport.width / source.width,
    viewport.height / source.height,
  );
  const { scale, x, y } = profile.measuredTransform ?? {
    scale: idealScale,
    x: viewport.x + (viewport.width - source.width * idealScale) / 2,
    y: viewport.y + (viewport.height - source.height * idealScale) / 2,
  };
  if (
    ![scale, x, y].every(Number.isFinite) ||
    scale <= 0 ||
    x > viewport.x + 1 ||
    y > viewport.y + 1 ||
    x + source.width * scale < viewport.x + viewport.width - 1 ||
    y + source.height * scale < viewport.y + viewport.height - 1
  )
    throw Error(
      `Measured video does not cover platform viewport: ${profile.id}`,
    );
  return {
    scale,
    x,
    y,
    visibleSourceRect: {
      x: (viewport.x - x) / scale,
      y: (viewport.y - y) / scale,
      width: viewport.width / scale,
      height: viewport.height / scale,
    },
  };
}

export function inspectContentRegions(
  content: ContentRect[],
  regions: Record<string, LayoutRect>,
  tolerance = 1,
) {
  return content.flatMap((item) => {
    const region = regions[item.name];
    if (!region) return [`${item.name}: missing content region`];
    if (!validRect(item) || !validRect(region))
      return [`${item.name}: invalid content region bounds`];
    return item.x < region.x - tolerance ||
      item.y < region.y - tolerance ||
      item.x + item.width > region.x + region.width + tolerance ||
      item.y + item.height > region.y + region.height + tolerance
      ? [`${item.name}: painted content exceeds its reserved region`]
      : [];
  });
}

function screenshotProfile(basis: "observed" | "stress"): PlatformProfile {
  const stress = basis === "stress";
  const profile: PlatformProfile = {
    id: `instagram-capture-2026-09-23-${basis}`,
    label: stress
      ? "Supplied mobile preview + conservative UI margins"
      : "Supplied Instagram mobile preview",
    basis,
    calibration:
      "User-supplied 1206×2622 screenshots with account/story and reel-sharing controls; visible video viewport ≈1206×2372. Measured screen≈source×1.2355+(-65,0), with ≈2–4 screen-pixel measurement uncertainty. This is an observed preview, not a universal Reels-feed specification." +
      (stress
        ? " Stress expands top to270, rail left912/start1140 (8px extra horizontal clearance), poll by10 and account panel up20 composition pixels."
        : " Masks follow the observed account, action rail, poll and bottom account regions."),
    source: { width: 1080, height: 1920 },
    screen: { width: 1206, height: 2622 },
    viewport: { x: 0, y: 0, width: 1206, height: 2372 },
    measuredTransform: { scale: 1.2355, x: -65, y: 0 },
    masks: [],
  };
  const sourceMasks: PlatformMask[] = [
    {
      id: "top-account",
      label: "Top account controls",
      rect: { x: 0, y: 0, width: 1080, height: stress ? 270 : 255 },
    },
    {
      id: "right-actions",
      label: "Like/comment/repost/share rail",
      rect: {
        x: stress ? 912 : 920,
        y: stress ? 1140 : 1180,
        width: stress ? 168 : 160,
        height: stress ? 780 : 740,
      },
    },
    {
      id: "left-poll",
      label: "Left poll/share response control",
      rect: stress
        ? { x: 79, y: 1573, width: 226, height: 105 }
        : { x: 89, y: 1583, width: 206, height: 85 },
    },
    {
      id: "bottom-account",
      label: "Bottom account/caption panel",
      rect: {
        x: 0,
        y: stress ? 1692 : 1712,
        width: 1080,
        height: stress ? 228 : 208,
      },
    },
  ];
  profile.masks = sourceMasks.map((mask) => ({
    ...mask,
    rect: intersectRects(
      sourceRectToScreen(mask.rect, profile),
      profile.viewport,
    )!,
  }));
  return profile;
}

export const INSTAGRAM_PLATFORM_PROFILES = [
  screenshotProfile("observed"),
  screenshotProfile("stress"),
];

export function sourceRectToScreen(
  rect: LayoutRect,
  profile: PlatformProfile,
): LayoutRect {
  const { scale, x, y } = platformTransform(profile);
  return {
    x: x + rect.x * scale,
    y: y + rect.y * scale,
    width: rect.width * scale,
    height: rect.height * scale,
  };
}

/** Use actual painted/text bounds, not a large transparent layout wrapper. */
export function inspectPlatformLayout(
  content: ContentRect[],
  profiles: PlatformProfile[],
  toleranceSourcePixels = 1,
) {
  if (!profiles.length)
    throw Error("At least one calibrated platform profile is required");
  if (!Number.isFinite(toleranceSourcePixels) || toleranceSourcePixels < 0)
    throw Error("Platform geometry tolerance must be nonnegative");
  const results = profiles.map((profile) => {
    const transform = platformTransform(profile);
    const tolerance = toleranceSourcePixels * transform.scale;
    const issues: PlatformIssue[] = [];
    for (const item of content) {
      const { name, ...sourceRect } = item;
      if (!validRect(sourceRect)) {
        issues.push({ name, code: "invalid-rect", sourceRect });
        continue;
      }
      const screenRect = sourceRectToScreen(sourceRect, profile);
      const v = profile.viewport;
      if (
        screenRect.x < v.x - tolerance ||
        screenRect.y < v.y - tolerance ||
        screenRect.x + screenRect.width > v.x + v.width + tolerance ||
        screenRect.y + screenRect.height > v.y + v.height + tolerance
      )
        issues.push({ name, code: "cropped", sourceRect, screenRect });
      for (const mask of profile.masks) {
        const overlap = intersectRects(screenRect, mask.rect);
        if (overlap && overlap.width > tolerance && overlap.height > tolerance)
          issues.push({
            name,
            code: "ui-overlap",
            maskId: mask.id,
            sourceRect,
            screenRect,
            intersection: overlap,
          });
      }
    }
    return {
      id: profile.id,
      label: profile.label,
      basis: profile.basis,
      calibration: profile.calibration,
      viewport: profile.viewport,
      masks: profile.masks,
      scale: transform.scale,
      visibleSourceRect: transform.visibleSourceRect,
      checkedRects: content.length,
      issues,
    };
  });
  return {
    profiles: results,
    errors: results.flatMap((p) =>
      p.issues.map(
        (i) =>
          `${i.name}: ${p.id} ${i.code}${i.maskId ? ` (${i.maskId})` : ""}`,
      ),
    ),
    limitation:
      "Calibrated screenshot and conservative stress profiles; not a guarantee for every Instagram device, placement or UI state.",
  };
}
