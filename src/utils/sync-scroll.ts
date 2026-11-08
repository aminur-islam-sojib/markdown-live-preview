export interface ScrollAnchor {
  line: number;
  offsetTop: number;
}

/**
 * Extracts line anchors from preview container DOM elements with [data-line].
 */
export function extractAnchorsFromContainer(container: HTMLElement | null): ScrollAnchor[] {
  if (!container) return [];
  const nodes = container.querySelectorAll<HTMLElement>('[data-line]');
  const anchors: ScrollAnchor[] = [];

  nodes.forEach((node) => {
    const rawLine = node.getAttribute('data-line');
    if (!rawLine) return;
    const line = parseInt(rawLine, 10);
    if (!isNaN(line) && line > 0) {
      anchors.push({
        line,
        offsetTop: node.offsetTop
      });
    }
  });

  // Sort by line ascending and deduplicate
  anchors.sort((a, b) => a.line - b.line);
  return anchors;
}

/**
 * Calculates target preview scrollTop based on editor position and anchors.
 */
export function calculatePreviewScroll(
  fractionalLine: number,
  editorScrollTop: number,
  maxEditorScroll: number,
  maxPreviewScroll: number,
  anchors: ScrollAnchor[]
): number {
  if (maxPreviewScroll <= 0) return 0;

  // Exact boundary conditions
  if (editorScrollTop <= 0 || fractionalLine <= 1) {
    return 0;
  }
  if (maxEditorScroll > 0 && editorScrollTop >= maxEditorScroll - 2) {
    return maxPreviewScroll;
  }

  // If no anchors, fallback to proportional
  if (anchors.length === 0) {
    if (maxEditorScroll <= 0) return 0;
    const ratio = editorScrollTop / maxEditorScroll;
    return Math.max(0, Math.min(maxPreviewScroll, ratio * maxPreviewScroll));
  }

  // If before first anchor
  const first = anchors[0];
  if (fractionalLine <= first.line) {
    const progress = Math.max(0, (fractionalLine - 1) / Math.max(1, first.line - 1));
    return Math.max(0, Math.min(maxPreviewScroll, progress * first.offsetTop));
  }

  // Find bracketing anchors
  let prev = first;
  for (let i = 1; i < anchors.length; i++) {
    const curr = anchors[i];
    if (fractionalLine <= curr.line) {
      const lineSpan = curr.line - prev.line;
      const progress = lineSpan > 0 ? (fractionalLine - prev.line) / lineSpan : 0;
      const target = prev.offsetTop + (curr.offsetTop - prev.offsetTop) * progress;
      return Math.max(0, Math.min(maxPreviewScroll, target));
    }
    prev = curr;
  }

  // Past the last anchor: interpolate between last anchor and maxPreviewScroll
  const last = anchors[anchors.length - 1];
  const remainingScroll = maxPreviewScroll - last.offsetTop;
  if (remainingScroll <= 0) return maxPreviewScroll;

  // Use proportional editor scroll for remaining distance
  if (maxEditorScroll <= 0) return maxPreviewScroll;
  const ratio = editorScrollTop / maxEditorScroll;
  return Math.max(0, Math.min(maxPreviewScroll, ratio * maxPreviewScroll));
}

/**
 * Calculates target editor line and scroll based on preview scrollTop and anchors.
 */
export function calculateEditorScroll(
  previewScrollTop: number,
  maxPreviewScroll: number,
  maxEditorScroll: number,
  anchors: ScrollAnchor[],
  totalLines: number
): { targetLine: number; ratio: number } {
  if (maxEditorScroll <= 0 || totalLines <= 1) {
    return { targetLine: 1, ratio: 0 };
  }

  if (previewScrollTop <= 0) {
    return { targetLine: 1, ratio: 0 };
  }
  if (maxPreviewScroll > 0 && previewScrollTop >= maxPreviewScroll - 2) {
    return { targetLine: totalLines, ratio: 1 };
  }

  const fallbackRatio = maxPreviewScroll > 0 ? previewScrollTop / maxPreviewScroll : 0;
  const clampedFallbackRatio = Math.max(0, Math.min(1, fallbackRatio));

  if (anchors.length === 0) {
    const line = 1 + (totalLines - 1) * clampedFallbackRatio;
    return { targetLine: line, ratio: clampedFallbackRatio };
  }

  const first = anchors[0];
  if (previewScrollTop <= first.offsetTop) {
    const progress = first.offsetTop > 0 ? previewScrollTop / first.offsetTop : 0;
    const line = 1 + (first.line - 1) * progress;
    return { targetLine: Math.max(1, line), ratio: clampedFallbackRatio };
  }

  let prev = first;
  for (let i = 1; i < anchors.length; i++) {
    const curr = anchors[i];
    if (previewScrollTop <= curr.offsetTop) {
      const offsetSpan = curr.offsetTop - prev.offsetTop;
      const progress = offsetSpan > 0 ? (previewScrollTop - prev.offsetTop) / offsetSpan : 0;
      const line = prev.line + (curr.line - prev.line) * progress;
      return { targetLine: Math.max(1, Math.min(totalLines, line)), ratio: clampedFallbackRatio };
    }
    prev = curr;
  }

  const last = anchors[anchors.length - 1];
  const progress = maxPreviewScroll > last.offsetTop ? (previewScrollTop - last.offsetTop) / (maxPreviewScroll - last.offsetTop) : 1;
  const line = last.line + (totalLines - last.line) * progress;
  return { targetLine: Math.max(1, Math.min(totalLines, line)), ratio: clampedFallbackRatio };
}
