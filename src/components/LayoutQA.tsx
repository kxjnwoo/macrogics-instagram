import { useEffect, useState } from "react";
import { continueRender, delayRender, useCurrentFrame } from "remotion";
import { tokens } from "../tokens";
import { fontReady } from "../fonts";
import { displayCurrencyErrors } from "../currency-notation";
import { inspectBars } from "../bar-qa";
import {
  inspectTypography,
  textRoles,
  type TextRole,
  type TypographyMeasurement,
} from "../typography";
import {
  INSTAGRAM_PLATFORM_PROFILES,
  inspectContentRegions,
  inspectPlatformLayout,
  intersectRects,
  type ContentRect,
  type LayoutRect,
} from "../platform-layout";

export const LayoutQA = () => {
  const frame = useCurrentFrame();
  const [handle] = useState(() => delayRender("Layout QA"));
  useEffect(() => {
    fontReady
      .then(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => resolve()),
          ),
      )
      .then(() => {
        const nodes = Array.from(
          document.querySelectorAll<HTMLElement>("[data-qa]"),
        );
        const errors: string[] = [];
        const origin = document
          .querySelector("[data-design-root]")!
          .getBoundingClientRect();
        const scale = origin.width / 1080;
        const sceneRoot =
          document.querySelector<HTMLElement>("[data-design-root]");
        const sceneFrame = Number(sceneRoot?.dataset.sceneFrame ?? frame);
        const centralRequired = sceneRoot?.dataset.centralRequired !== "false";
        const visible = (element: Element) => {
          let opacity = 1;
          for (
            let node: Element | null = element;
            node;
            node = node.parentElement
          ) {
            const style = getComputedStyle(node);
            if (style.display === "none" || style.visibility !== "visible")
              return false;
            opacity *= Number(style.opacity);
            if (opacity <= 0.05) return false;
          }
          return true;
        };
        const nontransparent = (color: string) =>
          color !== "transparent" &&
          !/rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/.test(color);
        for (const chart of document.querySelectorAll<SVGSVGElement>(
          '[data-chart-kind="bar"]',
        )) {
          const baseline = chart.querySelector("[data-zero-baseline]");
          const zero = baseline ? Number(baseline.getAttribute("y1")) : NaN;
          const bars = Array.from(
            chart.querySelectorAll<SVGRectElement>("[data-bar-value]"),
          ).map((b) => ({
            value: Number(b.dataset.barValue),
            y: Number(b.getAttribute("y")),
            height: Number(b.getAttribute("height")),
          }));
          errors.push(
            ...inspectBars(
              zero,
              Number(chart.dataset.chartFrame),
              Number(chart.dataset.chartStart),
              Number(chart.dataset.observationCount),
              bars,
            ),
          );
        }
        for (const root of nodes)
          if (visible(root))
            errors.push(
              ...displayCurrencyErrors(root.textContent ?? "").map(
                (error) => `${root.dataset.qa}: ${error}`,
              ),
            );
        const typography: TypographyMeasurement[] = [];
        for (const node of document.querySelectorAll<HTMLElement>(
          "[data-typography]",
        )) {
          if (!visible(node) || !node.textContent?.trim()) continue;
          const role = node.dataset.typography as TextRole;
          if (!(role in textRoles)) {
            errors.push(`Unknown typography role ${role}`);
            continue;
          }
          const style = getComputedStyle(node);
          const measurement = {
            role,
            text: node.textContent,
            fontFamily: style.fontFamily,
            fontWeight: style.fontWeight,
            fontSize: parseFloat(style.fontSize),
            letterSpacing:
              style.letterSpacing === "normal"
                ? 0
                : parseFloat(style.letterSpacing),
            fontLoaded: document.fonts.check(
              `${style.fontWeight} ${style.fontSize} "${textRoles[role].fontFamily}"`,
              node.textContent,
            ),
          };
          typography.push(measurement);
          errors.push(...inspectTypography(measurement));
          if (
            (role === "body" || role === "body-latin") &&
            node.closest('[data-qa="body"]') &&
            sceneRoot?.dataset.sceneType === "chart" &&
            measurement.fontSize !== tokens.size.chartBody
          )
            errors.push(
              `TYPOGRAPHY chart body: expected ${tokens.size.chartBody}px, got ${measurement.fontSize}px`,
            );
        }
        const toSource = (
          rect: Pick<DOMRect, "left" | "top" | "width" | "height">,
          padding = 0,
        ): LayoutRect => ({
          x: (rect.left - origin.left - padding) / scale,
          y: (rect.top - origin.top - padding) / scale,
          width: (rect.width + padding * 2) / scale,
          height: (rect.height + padding * 2) / scale,
        });
        type PaintedRect = ContentRect & {
          kind: "text" | "image" | "shape" | "box";
          central: boolean;
        };
        const painted: PaintedRect[] = [];
        const add = (
          element: Element,
          rect: LayoutRect,
          kind: PaintedRect["kind"],
        ) => {
          if (rect.width <= 0 || rect.height <= 0) return;
          const owner = element.closest<HTMLElement>("[data-qa]");
          if (!owner) return;
          painted.push({
            name: element.closest<HTMLElement>("[data-composition-element]")
              ? `composition-${element.closest<HTMLElement>("[data-composition-element]")!.dataset.compositionElement}`
              : owner.dataset.qa!,
            ...rect,
            kind,
            central: Boolean(element.closest("[data-central-visual]")),
          });
        };
        // Measure text ranges and painted primitives. Transparent region wrappers
        // cannot prove visibility, and their empty space must not trigger UI-mask errors.
        const elements = new Set<Element>();
        const textNodes = new Set<Text>();
        for (const root of nodes) {
          elements.add(root);
          for (const element of root.querySelectorAll("*"))
            elements.add(element);
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
          while (walker.nextNode()) textNodes.add(walker.currentNode as Text);
        }
        for (const element of elements) {
          if (!visible(element)) continue;
          const rect = element.getBoundingClientRect();
          if (element instanceof HTMLImageElement) {
            if (element.complete && element.naturalWidth)
              add(element, toSource(rect), "image");
            continue;
          }
          if (element instanceof HTMLCanvasElement) {
            if (element.width && element.height)
              add(element, toSource(rect), "image");
            continue;
          }
          const style = getComputedStyle(element);
          if (element instanceof SVGElement) {
            if (
              !element.matches(
                "path,rect,circle,ellipse,polygon,polyline,line,image",
              )
            )
              continue;
            const fill =
              style.fill !== "none" &&
              nontransparent(style.fill) &&
              Number(style.fillOpacity) > 0;
            const stroke =
              style.stroke !== "none" &&
              nontransparent(style.stroke) &&
              Number(style.strokeOpacity) > 0;
            if (!fill && !stroke && element.tagName !== "image") continue;
            const matrix =
              element instanceof SVGGraphicsElement
                ? element.getScreenCTM()
                : null;
            const strokePadding = stroke
              ? (parseFloat(style.strokeWidth) *
                  (matrix ? Math.hypot(matrix.a, matrix.b) : scale)) /
                2
              : 0;
            add(element, toSource(rect, strokePadding), "shape");
            continue;
          }
          if (nontransparent(style.backgroundColor))
            add(element, toSource(rect), "box");
          const border = (side: "Top" | "Right" | "Bottom" | "Left") => {
            const width = parseFloat(style[`border${side}Width`]);
            if (!(width > 0) || !nontransparent(style[`border${side}Color`]))
              return;
            const box = toSource(rect);
            const thickness = width;
            const strip =
              side === "Top"
                ? { ...box, height: thickness }
                : side === "Bottom"
                  ? {
                      ...box,
                      y: box.y + box.height - thickness,
                      height: thickness,
                    }
                  : side === "Left"
                    ? { ...box, width: thickness }
                    : {
                        ...box,
                        x: box.x + box.width - thickness,
                        width: thickness,
                      };
            add(element, strip, "box");
          };
          border("Top");
          border("Right");
          border("Bottom");
          border("Left");
        }
        for (const node of textNodes) {
          const parent = node.parentElement;
          if (!node.textContent?.trim() || !parent || !visible(parent))
            continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const rect of range.getClientRects())
            add(parent, toSource(rect), "text");
        }
        const layout = tokens.layout;
        const centralRegion = {
          x: tokens.safe.left,
          y: layout.contentTop,
          width: layout.contentWidth,
          height: layout.centralHeight,
        };
        const regions: Record<string, LayoutRect> = {
          masthead: {
            x: layout.mastheadInset,
            y: tokens.safe.top,
            width: 1080 - 2 * layout.mastheadInset,
            height: layout.headlineTop - tokens.safe.top - 20,
          },
          eyebrow: {
            x: tokens.safe.left,
            y: tokens.safe.top,
            width: layout.contentWidth,
            height: layout.headlineTop - tokens.safe.top,
          },
          headline: {
            x: tokens.safe.left,
            // Preserve the text anchor; reserve measured font-metric overshoot.
            y: layout.headlineTop - 12,
            width: layout.contentWidth,
            height: layout.headlineHeight + 28,
          },
          "central-visual": centralRegion,
          follow: {
            x: layout.captionInset,
            y: layout.captionTop,
            width: layout.captionWidth,
            height: layout.captionHeight,
          },
          chart: centralRegion,
          "chart-label": centralRegion,
          body: {
            x: tokens.safe.left,
            y: layout.contentTop,
            width: layout.contentWidth,
            height: layout.captionTop - 8 - layout.contentTop,
          },
          quote: centralRegion,
          metric: centralRegion,
          "metric-label": centralRegion,
          caption: {
            x: layout.captionInset,
            y: layout.captionTop,
            width: layout.captionWidth,
            height: layout.captionHeight,
          },
          source: {
            x: layout.sourceLeft,
            y: layout.sourceTop,
            width: 1080 - layout.sourceLeft - layout.sourceRight,
            height: layout.sourceHeight,
          },
        };
        for (const node of document.querySelectorAll<HTMLElement>("[data-composition-element]")) {
          if (visible(node)) regions[`composition-${node.dataset.compositionElement}`] = toSource(node.getBoundingClientRect());
        }
        const contentRects = painted.map(({ name, x, y, width, height }) => ({
          name,
          x,
          y,
          width,
          height,
        }));
        const platform = inspectPlatformLayout(
          contentRects,
          INSTAGRAM_PLATFORM_PROFILES,
        );
        const regionErrors = inspectContentRegions(contentRects, regions);
        errors.push(...platform.errors, ...regionErrors);
        const centralPaint = painted.filter((item) => item.central);
        const areas = centralPaint.map((item) => {
          const intersection = intersectRects(item, centralRegion);
          return intersection ? intersection.width * intersection.height : 0;
        });
        const center = {
          sceneFrame,
          required: centralRequired,
          checked: centralRequired && sceneFrame >= tokens.motion.enter,
          region: centralRegion,
          visiblePrimitiveCount: centralPaint.filter(
            (item, i) => item.kind !== "text" && areas[i] >= 100,
          ).length,
          visibleTextCount: centralPaint.filter(
            (item, i) => item.kind === "text" && areas[i] >= 100,
          ).length,
          maximumIntersectionArea: Math.round(Math.max(0, ...areas)),
        };
        if (center.checked && center.maximumIntersectionArea < 800)
          errors.push(
            `central visual: no visible content in reserved center (${centralRegion.y}–${centralRegion.y + centralRegion.height})`,
          );
        for (const n of nodes)
          if (visible(n) && n.scrollWidth > n.clientWidth + 2 && n.tagName !== "svg")
            errors.push(`${n.dataset.qa}: horizontal overflow`);
        for (const svg of document.querySelectorAll<SVGSVGElement>(
          "svg[data-qa]",
        )) {
          const bounds = svg.getBoundingClientRect();
          const labels = Array.from(svg.querySelectorAll("text"))
            .filter(visible)
            .map((n) => n.getBoundingClientRect());
          for (const a of labels)
            if (
              a.left < bounds.left - 1 ||
              a.right > bounds.right + 1 ||
              a.top < bounds.top - 1 ||
              a.bottom > bounds.bottom + 1
            )
              errors.push("chart label: outside chart bounds");
          for (let i = 0; i < labels.length; i++)
            for (let j = i + 1; j < labels.length; j++)
              if (intersectRects(toSource(labels[i]), toSource(labels[j])))
                errors.push("chart labels: overlap");
        }
        const caption = document.querySelector<HTMLElement>(
          '[data-qa="caption"]',
        );
        if (
          caption &&
          caption.getBoundingClientRect().height >
            caption.parentElement!.getBoundingClientRect().height + 1
        )
          errors.push("caption: exceeds two-line zone");
        for (let i = 0; i < painted.length; i++)
          for (let j = i + 1; j < painted.length; j++) {
            const a = painted[i],
              b = painted[j];
            if (a.name === b.name) continue;
            const intersection = intersectRects(a, b);
            if (
              intersection &&
              intersection.width > 2 &&
              intersection.height > 2
            )
              errors.push(`${a.name}/${b.name}: painted content overlaps`);
          }
        console.log(
          "MACROGICS_QA:" +
            JSON.stringify({
              frame,
              errors: [...new Set(errors)],
              rects: painted,
              center,
              platform,
              regions,
              typography,
            }),
        );
        continueRender(handle);
      })
      .catch((error) => {
        console.log(
          "MACROGICS_QA:" +
            JSON.stringify({
              frame,
              errors: [
                `Font/layout measurement failed: ${error instanceof Error ? error.message : "unknown error"}`,
              ],
            }),
        );
        continueRender(handle);
      });
  }, [frame, handle]);
  return null;
};
