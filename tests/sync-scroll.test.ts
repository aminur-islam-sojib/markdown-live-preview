import { describe, it, expect } from 'vitest';
import {
  extractAnchorsFromContainer,
  calculatePreviewScroll,
  calculateEditorScroll,
  ScrollAnchor
} from '../src/utils/sync-scroll';

describe('Synchronized Scrolling Logic (F4 Sync Scroll)', () => {
  describe('extractAnchorsFromContainer', () => {
    it('returns empty array when container is null', () => {
      expect(extractAnchorsFromContainer(null)).toEqual([]);
    });

    it('extracts and sorts data-line anchors from container DOM', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <h1 data-line="5">Title</h1>
        <p data-line="12">Paragraph</p>
        <h2 data-line="2">Subtitle</h2>
      `;

      // Mock offsetTop in jsdom
      const elements = container.querySelectorAll<HTMLElement>('[data-line]');
      Object.defineProperty(elements[0], 'offsetTop', { value: 150 });
      Object.defineProperty(elements[1], 'offsetTop', { value: 400 });
      Object.defineProperty(elements[2], 'offsetTop', { value: 50 });

      const anchors = extractAnchorsFromContainer(container);
      expect(anchors).toEqual([
        { line: 2, offsetTop: 50 },
        { line: 5, offsetTop: 150 },
        { line: 12, offsetTop: 400 }
      ]);
    });

    it('ignores non-numeric or zero data-line attributes', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <h1 data-line="invalid">Bad</h1>
        <p data-line="0">Zero</p>
        <p data-line="8">Good</p>
      `;
      const p = container.querySelector<HTMLElement>('p[data-line="8"]');
      if (p) Object.defineProperty(p, 'offsetTop', { value: 100 });

      const anchors = extractAnchorsFromContainer(container);
      expect(anchors).toEqual([{ line: 8, offsetTop: 100 }]);
    });
  });

  describe('calculatePreviewScroll', () => {
    const anchors: ScrollAnchor[] = [
      { line: 10, offsetTop: 200 },
      { line: 20, offsetTop: 600 },
      { line: 40, offsetTop: 1200 }
    ];

    it('returns 0 when editor is at the very top', () => {
      expect(calculatePreviewScroll(1, 0, 1000, 2000, anchors)).toBe(0);
      expect(calculatePreviewScroll(0.5, 0, 1000, 2000, anchors)).toBe(0);
    });

    it('returns maxPreviewScroll when editor is at the bottom', () => {
      expect(calculatePreviewScroll(50, 1000, 1000, 2000, anchors)).toBe(2000);
      expect(calculatePreviewScroll(49, 999, 1000, 2000, anchors)).toBe(2000);
    });

    it('interpolates accurately between two bracketing anchors', () => {
      // Line 15 is exactly halfway between line 10 (200px) and line 20 (600px)
      // Expected offset: 200 + (600 - 200) * 0.5 = 400px
      const target = calculatePreviewScroll(15, 300, 1000, 2000, anchors);
      expect(target).toBe(400);
    });

    it('interpolates before the first anchor', () => {
      // Line 5.5 is halfway between line 1 (0px) and line 10 (200px)
      const target = calculatePreviewScroll(5.5, 100, 1000, 2000, anchors);
      expect(target).toBe(100);
    });

    it('falls back to proportional ratio when anchors list is empty', () => {
      // 50% editor scroll -> 50% preview scroll (1000px)
      const target = calculatePreviewScroll(25, 500, 1000, 2000, []);
      expect(target).toBe(1000);
    });

    it('handles zero maxPreviewScroll gracefully', () => {
      expect(calculatePreviewScroll(10, 200, 500, 0, anchors)).toBe(0);
    });
  });

  describe('calculateEditorScroll', () => {
    const anchors: ScrollAnchor[] = [
      { line: 10, offsetTop: 200 },
      { line: 20, offsetTop: 600 },
      { line: 40, offsetTop: 1200 }
    ];

    it('returns line 1 when preview is at top', () => {
      const res = calculateEditorScroll(0, 2000, 1000, anchors, 50);
      expect(res.targetLine).toBe(1);
      expect(res.ratio).toBe(0);
    });

    it('returns totalLines and ratio 1 when preview is at bottom', () => {
      const res = calculateEditorScroll(2000, 2000, 1000, anchors, 50);
      expect(res.targetLine).toBe(50);
      expect(res.ratio).toBe(1);
    });

    it('interpolates target line between bracketing anchors', () => {
      // Preview at 400px is halfway between 200px (line 10) and 600px (line 20)
      const res = calculateEditorScroll(400, 2000, 1000, anchors, 50);
      expect(res.targetLine).toBe(15);
    });

    it('falls back to proportional ratio when anchors list is empty', () => {
      // 50% preview scroll in 50-line doc -> line 1 + (49 * 0.5) = 25.5
      const res = calculateEditorScroll(1000, 2000, 1000, [], 50);
      expect(res.targetLine).toBe(25.5);
      expect(res.ratio).toBe(0.5);
    });
  });
});
