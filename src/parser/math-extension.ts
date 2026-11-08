import katex from 'katex';
import type { TokenizerAndRendererExtension } from 'marked';

/**
 * Marked extension for inline LaTeX math ($...$).
 * Safeguarded against accidental currency matching ($100).
 */
export const inlineMathExtension: TokenizerAndRendererExtension = {
  name: 'inlineMath',
  level: 'inline',
  start(src: string) {
    return src.indexOf('$');
  },
  tokenizer(src: string) {
    const match = src.match(/^\$((?:[^\$\n\\]|\\.)+?)\$/);
    if (match) {
      const text = match[1];
      // Exclude pure currency numbers (e.g. $100 or $19.99) or whitespace-padded text ($ x $)
      if (text.startsWith(' ') || text.endsWith(' ') || /^\d+([.,]\d+)?$/.test(text.trim())) {
        return;
      }
      return {
        type: 'inlineMath',
        raw: match[0],
        text: text.trim()
      };
    }
  },
  renderer(token) {
    try {
      return katex.renderToString(token.text, {
        displayMode: false,
        throwOnError: false
      });
    } catch {
      return token.raw;
    }
  }
};

/**
 * Marked extension for display block LaTeX math ($$...$$).
 */
export const blockMathExtension: TokenizerAndRendererExtension = {
  name: 'blockMath',
  level: 'block',
  start(src: string) {
    return src.indexOf('$$');
  },
  tokenizer(src: string) {
    const match = src.match(/^\$\$([\s\S]+?)\$\$/);
    if (match) {
      return {
        type: 'blockMath',
        raw: match[0],
        text: match[1].trim()
      };
    }
  },
  renderer(token) {
    try {
      const lineAttr = (token as any).line ? ` data-line="${(token as any).line}"` : '';
      const html = katex.renderToString(token.text, {
        displayMode: true,
        throwOnError: false
      });
      return `<div class="katex-display"${lineAttr}>${html}</div>\n`;
    } catch {
      return `<pre class="katex-error"><code>${token.raw}</code></pre>\n`;
    }
  }
};
