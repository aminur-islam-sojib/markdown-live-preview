import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '../src/parser/sanitizer';

describe('HTML Sanitizer (F2 Security Requirements)', () => {
  describe('Malicious XSS payload neutralization', () => {
    it('removes <script> tags and their contents', () => {
      const payload = '<div>Hello</div><script>alert("xss")</script>';
      const result = sanitizeHtml(payload);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert("xss")');
      expect(result).toContain('<div>Hello</div>');
    });

    it('removes uppercase and malformed script tags', () => {
      const payload = '<SCRIPT SRC="https://evil.com/xss.js"></SCRIPT>';
      const result = sanitizeHtml(payload);
      expect(result).not.toContain('SCRIPT');
      expect(result).not.toContain('evil.com');
      expect(result).toBe('');
    });

    it('strips onerror and other inline event handlers', () => {
      const payload = '<img src="x" onerror="alert(1)">';
      const result = sanitizeHtml(payload);
      expect(result).not.toContain('onerror');
      expect(result).not.toContain('alert(1)');
      expect(result).toContain('<img src="x">');
    });

    it('strips onload, onclick, onmouseover event handlers', () => {
      const payload = `
        <div onclick="doEvil()">Click</div>
        <svg onload="doEvil()"><circle r="10"/></svg>
        <span onmouseover="doEvil()">Hover</span>
      `;
      const result = sanitizeHtml(payload);
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('onload');
      expect(result).not.toContain('onmouseover');
      expect(result).not.toContain('doEvil()');
    });

    it('neutralizes javascript: URIs in anchor links', () => {
      const payload = '<a href="javascript:alert(document.cookie)">Malicious link</a>';
      const result = sanitizeHtml(payload);
      expect(result).not.toContain('javascript:');
      expect(result).not.toContain('document.cookie');
      expect(result).toContain('Malicious link');
    });

    it('removes <iframe>, <object>, <embed>, and <form> tags', () => {
      const payload = `
        <iframe src="https://evil.com"></iframe>
        <object data="exploit.swf"></object>
        <embed src="exploit.swf">
        <form action="https://phishing.com"><input type="text"></form>
      `;
      const result = sanitizeHtml(payload);
      expect(result).not.toContain('<iframe');
      expect(result).not.toContain('<object');
      expect(result).not.toContain('<embed');
      expect(result).not.toContain('<form');
    });
  });

  describe('Safe HTML and Markdown output preservation', () => {
    it('preserves standard formatting elements', () => {
      const safeHtml = '<h1>Title</h1><p>Text with <strong>bold</strong> and <em>italic</em>.</p>';
      expect(sanitizeHtml(safeHtml)).toBe(safeHtml);
    });

    it('preserves code blocks and tables', () => {
      const safeHtml = '<pre><code class="language-js">const x = 1;</code></pre><table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Data</td></tr></tbody></table>';
      expect(sanitizeHtml(safeHtml)).toBe(safeHtml);
    });

    it('preserves safe SVG elements for Mermaid diagram compatibility', () => {
      const safeSvg = '<svg viewBox="0 0 100 100"><g><circle cx="50" cy="50" r="40"></circle></g></svg>';
      const result = sanitizeHtml(safeSvg);
      expect(result).toContain('<svg');
      expect(result).toContain('<circle');
    });

    it('preserves safe external links', () => {
      const safeLink = '<a href="https://example.com" target="_blank" rel="noopener">Safe link</a>';
      const result = sanitizeHtml(safeLink);
      expect(result).toContain('href="https://example.com"');
      expect(result).toContain('Safe link');
    });
  });

  describe('Edge cases', () => {
    it('handles empty strings and null/undefined gracefully', () => {
      expect(sanitizeHtml('')).toBe('');
      // @ts-expect-error Testing invalid runtime input
      expect(sanitizeHtml(null)).toBe('');
      // @ts-expect-error Testing invalid runtime input
      expect(sanitizeHtml(undefined)).toBe('');
    });
  });
});
