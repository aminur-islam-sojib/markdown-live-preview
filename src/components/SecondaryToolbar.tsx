import React, { useState } from 'react';
import {
  Columns2,
  Edit3,
  Eye,
  Bold,
  Italic,
  Link2,
  Quote,
  Code,
  Copy,
  RotateCcw,
  Check
} from 'lucide-react';
import { ViewMode } from '../types';

interface SecondaryToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onFormat: (type: 'bold' | 'italic' | 'link' | 'quote' | 'code') => void;
  syncScroll: boolean;
  onToggleSyncScroll: () => void;
  onCopy: () => void;
  onReset: () => void;
}

export const SecondaryToolbar: React.FC<SecondaryToolbarProps> = ({
  viewMode,
  onViewModeChange,
  onFormat,
  syncScroll,
  onToggleSyncScroll,
  onCopy,
  onReset
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyClick = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="h-11 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 px-3 md:px-4 flex items-center justify-between select-none shrink-0 transition-colors">
      {/* Left side: View switcher + Markdown tools */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Segmented view switcher */}
        <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-300/60 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => onViewModeChange('split')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition ${
              viewMode === 'split'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title="Split view"
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Split</span>
          </button>

          <button
            type="button"
            onClick={() => onViewModeChange('editor')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition ${
              viewMode === 'editor'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title="Editor only"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Editor</span>
          </button>

          <button
            type="button"
            onClick={() => onViewModeChange('preview')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition ${
              viewMode === 'preview'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title="Preview only"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Preview</span>
          </button>
        </div>

        {/* Formatting tools */}
        <div className="hidden md:flex items-center gap-0.5 border-l border-slate-200 dark:border-slate-800 pl-2">
          <button
            type="button"
            onClick={() => onFormat('bold')}
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition font-bold"
            title="Bold (**text**)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onFormat('italic')}
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition italic"
            title="Italic (*text*)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onFormat('link')}
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition"
            title="Add Link"
          >
            <Link2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onFormat('quote')}
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition"
            title="Blockquote"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onFormat('code')}
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition"
            title="Inline or Block Code"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right side: Sync scroll & Utility actions */}
      <div className="flex items-center gap-3">
        {/* Sync scroll toggle */}
        <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 select-none">
          <span className="hidden sm:inline">Sync scroll</span>
          <button
            type="button"
            role="switch"
            aria-checked={syncScroll}
            onClick={onToggleSyncScroll}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
              syncScroll ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                syncScroll ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </label>

        {/* Copy & Reset actions */}
        <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-2">
          <button
            type="button"
            onClick={handleCopyClick}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition"
            title="Copy Raw Markdown"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition"
            title="Reset to default guide"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
};
