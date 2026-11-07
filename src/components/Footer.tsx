import React from 'react';
import { CursorPosition } from '../types';

interface FooterProps {
  cursorPosition: CursorPosition;
  content: string;
}

export const Footer: React.FC<FooterProps> = ({ cursorPosition, content }) => {
  const words = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0;
  const readTime = Math.max(1, Math.ceil(words / 200));

  return (
    <footer className="h-7 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 md:px-4 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 select-none shrink-0 transition-colors">
      {/* Left side: Format, encoding, cursor position */}
      <div className="flex items-center gap-3">
        <span className="font-medium text-slate-600 dark:text-slate-300">Markdown</span>
        <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
        <span className="hidden sm:inline">UTF-8</span>
        <span className="text-slate-300 dark:text-slate-700">•</span>
        <span className="font-mono">
          Ln {cursorPosition.lineNumber}, Col {cursorPosition.column}
        </span>
      </div>

      {/* Right side: Word count, reading time, attribution */}
      <div className="flex items-center gap-3">
        <span>
          {words} {words === 1 ? 'word' : 'words'}
        </span>
        <span className="text-slate-300 dark:text-slate-700">•</span>
        <span>{readTime} min read</span>
        <span className="text-slate-300 dark:text-slate-700">•</span>
        <a
          href="https://github.com/aminur-islam-sojib/markdown-live-preview"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-slate-700 dark:hover:text-slate-200 transition"
          title="Markview GitHub Repository"
        >
          GitHub
        </a>
      </div>
    </footer>
  );
};
