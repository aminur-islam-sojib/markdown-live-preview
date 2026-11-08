import { describe, it, expect } from 'vitest';
import { Marked } from 'marked';
import { inlineMathExtension, blockMathExtension } from '../src/parser/math-extension';
import { sanitizeHtml } from '../src/parser/sanitizer';

describe('LaTeX Math Rendering (KaTeX Integration)', () => {
  // Setup marked instance with math extensions
  const parser = new Marked({
    extensions: [blockMathExtension, inlineMathExtension]
  });

  describe('Inline Math ($...$)', () => {
    it('renders inline math expressions with KaTeX', () => {
      const markdown = 'The equation $E = mc^2$ is famous.';
      const html = parser.parse(markdown) as string;
      expect(html).toContain('katex');
      expect(html).toContain('katex-mathml');
      expect(html).toContain('E = mc^2');
    });

    it('renders fractions and Greek symbols inline', () => {
      const markdown = 'Values $\\alpha + \\beta = \\frac{1}{2}$';
      const html = parser.parse(markdown) as string;
      expect(html).toContain('katex');
      expect(html).toContain('frac');
    });

    it('does not treat single currency values as math ($100)', () => {
      const markdown = 'The price was $100 and now it is $200.';
      const html = parser.parse(markdown) as string;
      expect(html).not.toContain('katex');
      expect(html).toContain('$100');
      expect(html).toContain('$200');
    });

    it('does not treat decimal currency as math ($19.99)', () => {
      const markdown = 'It costs $19.99 today.';
      const html = parser.parse(markdown) as string;
      expect(html).not.toContain('katex');
      expect(html).toContain('$19.99');
    });

    it('does not treat whitespace-padded text as math ($ text $)', () => {
      const markdown = 'Here is $ not math $.';
      const html = parser.parse(markdown) as string;
      expect(html).not.toContain('katex');
    });
  });

  describe('Display Block Math ($$...$$)', () => {
    it('renders display block math within katex-display container', () => {
      const markdown = '$$\\int_{-\\infty}^\\infty e^{-x^2} dx = \\sqrt{\\pi}$$';
      const html = parser.parse(markdown) as string;
      expect(html).toContain('katex-display');
      expect(html).toContain('katex');
      expect(html).toContain('sqrt');
    });

    it('renders multiline math expressions correctly', () => {
      const markdown = `$$
\\begin{aligned}
a &= b + c \\\\
d &= e + f
\\end{aligned}
$$`;
      const html = parser.parse(markdown) as string;
      expect(html).toContain('katex-display');
      expect(html).toContain('aligned');
    });

    it('handles syntax errors without throwing exceptions', () => {
      const invalidMarkdown = '$$\\frac{invalid$$';
      expect(() => {
        const html = parser.parse(invalidMarkdown) as string;
        expect(typeof html).toBe('string');
      }).not.toThrow();
    });
  });

  describe('Sanitization & Security Preservation', () => {
    it('preserves KaTeX HTML and MathML elements through DOMPurify', () => {
      const rawHtml = parser.parse('$E = mc^2$ and $$\\sum_{i=1}^n x_i$$') as string;
      const cleanHtml = sanitizeHtml(rawHtml);
      expect(cleanHtml).toContain('katex');
      expect(cleanHtml).toContain('katex-display');
    });

    it('blocks malicious script tags embedded alongside math', () => {
      const malicious = '$E = mc^2$<script>alert("xss")</script>$$x = 1$$';
      const parsed = parser.parse(malicious) as string;
      const clean = sanitizeHtml(parsed);
      expect(clean).toContain('katex');
      expect(clean).not.toContain('<script>');
      expect(clean).not.toContain('alert');
    });
  });
});
