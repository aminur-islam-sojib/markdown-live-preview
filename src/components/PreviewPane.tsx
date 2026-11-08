import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { parseMarkdown } from '../parser/markdown-parser';
import { Theme } from '../types';

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
  // Initialize with immediate parse so there is zero initial blank flash
  const [renderedHtml, setRenderedHtml] = useState(() => parseMarkdown(content || ''));
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

  // Convert markdown to sanitized HTML with debouncing for fast typing performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setRenderedHtml(parseMarkdown(content || ''));
    }, 40);

    return () => clearTimeout(timer);
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
