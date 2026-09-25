import type { SceneVisual } from "./design-schema";
import type { CompositionElement } from "./composition-schema";
import { tokens } from "./tokens";

/** Shared cue indices for visual components. */
export function elementCueIndices(element: CompositionElement): number[] {
  return [element.cueIndex, element.endCueIndex, element.emphasisCueIndex,
    ...(element.kind === "timeline" ? element.items.map((item) => item.cueIndex) : []),
    ...(element.kind === "relation" ? element.cueIndices ?? [] : []),
    ...(element.kind === "diagram" ? [
      ...element.nodes.flatMap((node) => [node.cueIndex, node.emphasisCueIndex]),
      ...element.edges.map((edge) => edge.cueIndex),
    ] : []),
  ].filter((value): value is number => value !== undefined);
}

/** Convert supplied cue timing to frames. */
export function cueStartFrame(
  captions: SceneVisual["captions"],
  cueIndex: number,
  fps = 30,
) {
  const cue = captions?.[cueIndex];
  if (
    !Number.isInteger(cueIndex) ||
    cueIndex < 0 ||
    !cue ||
    !Number.isFinite(cue.startMs) ||
    cue.startMs < 0
  )
    throw Error(
      `Caption cue ${cueIndex} is required for central visual timing`,
    );
  return Math.round((cue.startMs / 1000) * fps);
}

export function cueProgress(
  frame: number,
  startFrame: number,
  durationFrames = 12,
) {
  if (durationFrames <= 0)
    throw Error("Visual reveal duration must be positive");
  return Math.max(0, Math.min(1, (frame - startFrame) / durationFrames));
}

export function visualCueFrames(scene: SceneVisual, fps = 30) {
  const visual = scene.visual;
  const indices =
    visual?.kind === "relation"
      ? [
          ...visual.cueIndices,
          ...(visual.tiles ?? []).map((tile) => tile.cueIndex),
        ]
      : visual?.kind === "tiles"
        ? visual.items.map((tile) => tile.cueIndex)
        : [];
  const motionFrames = scene.composition?.elements.flatMap((element) => {
    const start = element.cueIndex === undefined ? 0 : cueStartFrame(scene.captions, element.cueIndex, fps);
    const end = element.endCueIndex === undefined ? scene.durationFrames : cueStartFrame(scene.captions, element.endCueIndex, fps);
    const frames = element.motion?.enter && element.motion.enter !== "none" ? [start + tokens.motion.enter / 2, start + tokens.motion.enter] : [];
    if (element.motion?.exit === "fade" && element.endCueIndex !== undefined) frames.push(end - tokens.motion.enter, end - tokens.motion.enter / 2);
    if (element.emphasisCueIndex !== undefined) frames.push(cueStartFrame(scene.captions, element.emphasisCueIndex, fps) + 12);
    if (element.kind === "diagram") {
      for (const node of element.nodes) if (node.emphasisCueIndex !== undefined) frames.push(cueStartFrame(scene.captions, node.emphasisCueIndex, fps) + 12);
      for (const index of [...element.nodes.flatMap((node) => node.cueIndex === undefined ? [] : [node.cueIndex]), ...element.edges.map((edge) => edge.cueIndex)]) {
        const at = cueStartFrame(scene.captions, index, fps);
        frames.push(at + tokens.motion.enter / 2, at + tokens.motion.enter);
      }
    }
    if (element.kind === "relation" && element.cueIndices) for (const index of element.cueIndices) frames.push(cueStartFrame(scene.captions, index, fps) + tokens.motion.enter);
    return frames.filter((value) => value >= start && value < end).map(Math.round);
  }) ?? [];
  return [
    ...new Set(
      [...motionFrames, ...[
        ...indices,
        ...(scene.composition?.elements.flatMap(elementCueIndices) ?? []),
        ...(scene.chart?.revealCueIndex === undefined
          ? []
          : [scene.chart.revealCueIndex]),
      ].map((index) => cueStartFrame(scene.captions, index, fps))],
    ),
  ].sort((a, b) => a - b);
}
