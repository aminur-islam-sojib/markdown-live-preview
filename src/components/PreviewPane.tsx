import React, { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import mermaid from 'mermaid';
import katex from 'katex';
import { sanitizeHtml } from '../parser/sanitizer';
import { inlineMathExtension, blockMathExtension } from '../parser/math-extension';
import { Theme } from '../types';

// Register KaTeX LaTeX math extensions with Marked
marked.use({ extensions: [blockMathExtension, inlineMathExtension] });

interface PreviewPaneProps {
  content: string;
  theme: Theme;
  previewRef: React.RefObject<HTMLDivElement | null>;
  onScroll?: (scrollTop: number, scrollHeight: number, clientHeight: number) => void;
}

export const PreviewPane: React.FC<PreviewPaneProps> = ({
  content,
  theme,
  previewRef,
  onScroll
}) => {
  const [renderedHtml, setRenderedHtml] = useState('');
  const outputRef = useRef<HTMLDivElement>(null);
  const renderVersionRef = useRef(0);

  // Configure mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: theme === 'dark' ? 'dark' : 'default',
      suppressErrorRendering: true
    });
  }, [theme]);

  // Convert markdown to sanitized HTML with data-line anchors for accurate sync scrolling
  useEffect(() => {
    try {
      const tokens = marked.lexer(content || '');
      let currentLine = 1;

      // Calculate line numbers for each block token
      for (const token of tokens) {
        (token as any).line = currentLine;
        const lineBreaks = (token.raw.match(/\n/g) || []).length;
        currentLine += lineBreaks;
      }

      const renderer = new marked.Renderer();

      const origHeading = renderer.heading.bind(renderer);
      renderer.heading = function (token) {
        const html = origHeading(token);
        const line = (token as any).line;
        return line ? html.replace(/^<h([1-6])/, `<h$1 data-line="${line}"`) : html;
      };

      const origParagraph = renderer.paragraph.bind(renderer);
      renderer.paragraph = function (token) {
        const html = origParagraph(token);
        const line = (token as any).line;
        return line ? html.replace(/^<p/, `<p data-line="${line}"`) : html;
      };

      const origCode = renderer.code.bind(renderer);
      renderer.code = function (token) {
        const lang = (token.lang || '').match(/^\S*/)?.[0].toLowerCase();
        const line = (token as any).line || 1;
        if (lang === 'mermaid') {
          const text = token.text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
          return `<pre class="mermaid" data-line="${line}">${text}</pre>\n`;
        }
        if (lang === 'math' || lang === 'latex') {
          try {
            const html = katex.renderToString(token.text, {
              displayMode: true,
              throwOnError: false
            });
            return `<div class="katex-display" data-line="${line}">${html}</div>\n`;
          } catch {
            return `<pre class="katex-error" data-line="${line}"><code>${token.text}</code></pre>\n`;
          }
        }
        const html = origCode(token);
        return line ? html.replace(/^<pre/, `<pre data-line="${line}"`) : html;
      };

      const origBlockquote = renderer.blockquote.bind(renderer);
      renderer.blockquote = function (token) {
        const html = origBlockquote(token);
        const line = (token as any).line;
        return line ? html.replace(/^<blockquote/, `<blockquote data-line="${line}"`) : html;
      };

      const origList = renderer.list.bind(renderer);
      renderer.list = function (token) {
        const html = origList(token);
        const line = (token as any).line;
        return line ? html.replace(/^<(ul|ol)/, `<$1 data-line="${line}"`) : html;
      };

      const origTable = renderer.table.bind(renderer);
      renderer.table = function (token) {
        const html = origTable(token);
        const line = (token as any).line;
        return line ? html.replace(/^<table/, `<table data-line="${line}"`) : html;
      };

      const rawHtml = marked.parser(tokens, { renderer, gfm: true, breaks: true });
      const cleanHtml = sanitizeHtml(rawHtml);
      setRenderedHtml(cleanHtml);
    } catch (err) {
      console.error('Failed to parse Markdown:', err);
    }
  }, [content]);

  // Render Mermaid diagrams after HTML is inserted into DOM
  useEffect(() => {
    if (!outputRef.current) return;
    const currentVersion = ++renderVersionRef.current;

    const mermaidPreNodes = Array.from(outputRef.current.querySelectorAll<HTMLPreElement>('pre.mermaid'));
    if (mermaidPreNodes.length === 0) return;

    mermaidPreNodes.forEach(async (el, idx) => {
      const graphDefinition = el.textContent || '';
      if (!graphDefinition.trim()) return;

      const id = `mermaid-svg-${Date.now()}-${idx}`;
      try {
        const { svg } = await mermaid.render(id, graphDefinition);
        if (renderVersionRef.current === currentVersion && el.parentNode) {
          const wrapper = document.createElement('div');
          wrapper.className = 'mermaid-rendered flex justify-center my-4 overflow-x-auto';
          const lineAttr = el.getAttribute('data-line');
          if (lineAttr) {
            wrapper.setAttribute('data-line', lineAttr);
          }
          wrapper.innerHTML = svg;
          el.parentNode.replaceChild(wrapper, el);
        }
      } catch (e) {
        // Suppress syntax errors during active typing
      }
    });
  }, [renderedHtml, theme]);

  return (
    <div
      ref={previewRef}
      onScroll={(e) => {
        const target = e.currentTarget;
        onScroll?.(target.scrollTop, target.scrollHeight, target.clientHeight);
      }}
      className="w-full h-full overflow-y-auto p-6 md:p-8 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
    >
      <div
        ref={outputRef}
        id="output"
        className="markdown-body max-w-3xl mx-auto py-2"
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />
    </div>
  );
};
