import React, { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import mermaid from 'mermaid';
import { sanitizeHtml } from '../parser/sanitizer';
import { Theme } from '../types';

interface PreviewPaneProps {
  content: string;
  theme: Theme;
  previewRef: React.RefObject<HTMLDivElement | null>;
}

export const PreviewPane: React.FC<PreviewPaneProps> = ({ content, theme, previewRef }) => {
  const [renderedHtml, setRenderedHtml] = useState('');
  const outputRef = useRef<HTMLDivElement>(null);
  const renderVersionRef = useRef(0);

  // Configure marked with custom mermaid renderer
  useEffect(() => {
    const renderer = new marked.Renderer();
    const originalCode = renderer.code.bind(renderer);

    renderer.code = (token) => {
      const lang = (token.lang || '').match(/^\S*/)?.[0].toLowerCase();
      if (lang === 'mermaid') {
        const text = token.text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
        return `<pre class="mermaid">${text}</pre>\n`;
      }
      return originalCode(token);
    };

    marked.setOptions({
      renderer,
      gfm: true,
      breaks: true
    });
  }, []);

  // Configure mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: theme === 'dark' ? 'dark' : 'default',
      suppressErrorRendering: true
    });
  }, [theme]);

  // Convert markdown to sanitized HTML
  useEffect(() => {
    try {
      const rawHtml = marked.parse(content || '') as string;
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
      className="w-full h-full overflow-y-auto p-6 md:p-8 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
    >
      <div
        ref={outputRef}
        id="output"
        className="markdown-body max-w-4xl mx-auto prose dark:prose-invert prose-slate"
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />
    </div>
  );
};
