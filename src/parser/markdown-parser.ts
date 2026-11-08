import { Marked } from 'marked';
import katex from 'katex';
import { inlineMathExtension, blockMathExtension } from './math-extension';
import { sanitizeHtml } from './sanitizer';

/**
 * Escapes unsafe HTML characters in strings for safe code and pre block rendering.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Creates and configures a Marked instance with GFM, line-number anchors for sync scrolling,
 * and support for KaTeX math and Mermaid diagram blocks.
 */
function createMarkdownParser(): Marked {
  const instance = new Marked();

  // Register KaTeX LaTeX math extensions and standard options
  instance.use({
    gfm: true,
    breaks: true,
    extensions: [blockMathExtension, inlineMathExtension]
  });

  // Register custom renderer to attach data-line attributes for bidirectional sync scrolling
  instance.use({
    renderer: {
      heading(token) {
        const text = this.parser.parseInline(token.tokens);
        const line = (token as any).line;
        return `<h${token.depth}${line ? ` data-line="${line}"` : ''}>${text}</h${token.depth}>\n`;
      },
      paragraph(token) {
        const text = this.parser.parseInline(token.tokens);
        const line = (token as any).line;
        return `<p${line ? ` data-line="${line}"` : ''}>${text}</p>\n`;
      },
      blockquote(token) {
        const body = this.parser.parse(token.tokens);
        const line = (token as any).line;
        return `<blockquote${line ? ` data-line="${line}"` : ''}>\n${body}</blockquote>\n`;
      },
      list(token) {
        let body = '';
        for (let i = 0; i < token.items.length; i++) {
          body += this.listitem(token.items[i]);
        }
        const type = token.ordered ? 'ol' : 'ul';
        const line = (token as any).line;
        return `<${type}${line ? ` data-line="${line}"` : ''}>\n${body}</${type}>\n`;
      },
      table(token) {
        let header = '';
        let cell = '';
        for (let j = 0; j < token.header.length; j++) {
          cell += this.tablecell(token.header[j]);
        }
        header += this.tablerow({ text: cell });

        let body = '';
        for (let j = 0; j < token.rows.length; j++) {
          const row = token.rows[j];
          cell = '';
          for (let k = 0; k < row.length; k++) {
            cell += this.tablecell(row[k]);
          }
          body += this.tablerow({ text: cell });
        }
        if (body) body = `<tbody>${body}</tbody>`;

        const line = (token as any).line;
        return `<table${line ? ` data-line="${line}"` : ''}>\n<thead>\n${header}</thead>\n${body}</table>\n`;
      },
      code(token) {
        const lang = (token.lang || '').match(/^\S*/)?.[0].toLowerCase();
        const line = (token as any).line || 1;

        if (lang === 'mermaid') {
          const escaped = escapeHtml(token.text);
          return `<pre class="mermaid" data-line="${line}">${escaped}</pre>\n`;
        }

        if (lang === 'math' || lang === 'latex') {
          try {
            const html = katex.renderToString(token.text, {
              displayMode: true,
              throwOnError: false
            });
            return `<div class="katex-display" data-line="${line}">${html}</div>\n`;
          } catch {
            return `<pre class="katex-error" data-line="${line}"><code>${escapeHtml(token.text)}</code></pre>\n`;
          }
        }

        const escaped = escapeHtml(token.text);
        const codeClass = lang ? ` class="language-${lang}"` : '';
        return `<pre data-line="${line}"><code${codeClass}>${escaped}</code></pre>\n`;
      }
    }
  });

  return instance;
}

const parserInstance = createMarkdownParser();

/**
 * Parses markdown into sanitized HTML with line-number anchors for sync scrolling.
 *
 * @param markdown - The input markdown text.
 * @param withLineNumbers - Whether to compute and inject data-line attributes (default true).
 * @returns Sanitized HTML string safe for innerHTML injection.
 */
export function parseMarkdown(markdown: string, withLineNumbers: boolean = true): string {
  if (!markdown) {
    return '';
  }

  try {
    if (!withLineNumbers) {
      const rawHtml = parserInstance.parse(markdown) as string;
      return sanitizeHtml(rawHtml);
    }

    const tokens = parserInstance.lexer(markdown);
    let currentLine = 1;
    for (const token of tokens) {
      (token as any).line = currentLine;
      const lineBreaks = (token.raw.match(/\n/g) || []).length;
      currentLine += lineBreaks;
    }

    const rawHtml = parserInstance.parser(tokens);
    return sanitizeHtml(rawHtml);
  } catch (err) {
    console.error('Failed to parse Markdown:', err);
    // Graceful fallback to avoid completely blank preview pane
    return `<div class="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-slate-800 dark:text-slate-200">
      <p class="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2">Live preview parsing fallback</p>
      <pre class="whitespace-pre-wrap font-mono text-sm">${escapeHtml(markdown)}</pre>
    </div>`;
  }
}
