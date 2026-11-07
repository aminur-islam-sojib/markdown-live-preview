import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Globe,
  Link2,
  Lock,
  Download,
  Check,
  Bookmark,
  Hash
} from 'lucide-react';
import { Visibility } from '../types';

interface SaveNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  currentTitle: string;
  onSave: (metadata: { title: string; description: string; tags: string; visibility: Visibility }) => Promise<void>;
  onDownloadMd: (title: string) => void;
}

export const SaveNoteModal: React.FC<SaveNoteModalProps> = ({
  isOpen,
  onClose,
  anchorRef,
  currentTitle,
  onSave,
  onDownloadMd
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [isSaving, setIsSaving] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number; arrowLeft: number }>({
    top: 60,
    right: 20,
    arrowLeft: 380
  });

  const modalRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Position dialog anchored under the Save button
  useEffect(() => {
    if (!isOpen) return;

    const cleanTitle = (currentTitle || 'Untitled').replace(/\.md$/i, '');
    setTitle(cleanTitle);

    const updatePosition = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const modalWidth = Math.min(440, window.innerWidth - 24);
      const top = Math.round(rect.bottom + 10);

      let right = Math.round(window.innerWidth - rect.right);
      if (right < 12) right = 12;
      if (window.innerWidth - right - modalWidth < 12) {
        right = Math.max(12, window.innerWidth - modalWidth - 12);
      }

      const btnCenter = rect.left + rect.width / 2;
      const modalLeft = window.innerWidth - right - modalWidth;
      const arrowLeft = Math.max(20, Math.min(modalWidth - 20, btnCenter - modalLeft));

      setCoords({ top, right, arrowLeft });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);

    // Focus title input
    setTimeout(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }, 40);

    return () => window.removeEventListener('resize', updatePosition);
  }, [isOpen, currentTitle, anchorRef]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    setIsSaving(true);
    try {
      await onSave({
        title: cleanTitle,
        description: description.trim(),
        tags: tags.trim(),
        visibility
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = () => {
    const cleanTitle = title.trim() || currentTitle || 'Untitled';
    onDownloadMd(cleanTitle);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/20 dark:bg-slate-950/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Popover Card */}
      <div
        ref={modalRef}
        style={{
          top: `${coords.top}px`,
          right: `${coords.right}px`
        }}
        className="fixed w-[calc(100vw-24px)] max-w-[440px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 transition-colors"
      >
        {/* Caret pointing up to Save button */}
        <div
          style={{ left: `${coords.arrowLeft}px` }}
          className="absolute -top-[6px] -translate-x-1/2 w-3 h-3 bg-white dark:bg-slate-900 border-t border-l border-slate-200 dark:border-slate-800 rotate-45 pointer-events-none"
        />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Bookmark className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Save your note</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Title is required. Everything else is optional.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          {/* Title input with .md badge */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="note-title-input" className="font-semibold text-slate-700 dark:text-slate-200">
                Title
              </label>
              <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">required</span>
            </div>
            <div className="relative flex items-center">
              <input
                ref={titleInputRef}
                id="note-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Meeting Notes"
                required
                className="w-full px-3 py-2 pr-12 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition text-xs"
              />
              <span className="absolute right-2 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 pointer-events-none select-none">
                .md
              </span>
            </div>
          </div>

          {/* Description input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="note-desc-input" className="font-semibold text-slate-700 dark:text-slate-200">
                Description
              </label>
              <span className="text-[10px] text-slate-400">optional</span>
            </div>
            <textarea
              id="note-desc-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this note about?"
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition text-xs resize-none"
            />
          </div>

          {/* Tags input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="note-tags-input" className="font-semibold text-slate-700 dark:text-slate-200">
                Tags
              </label>
              <span className="text-[10px] text-slate-400">optional</span>
            </div>
            <div className="relative flex items-center">
              <Hash className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
              <input
                id="note-tags-input"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="react, tailwind, markdown..."
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition text-xs"
              />
            </div>
          </div>

          {/* Visibility Segmented Control */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Who can see this?
            </label>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
              <button
                type="button"
                onClick={() => setVisibility('public')}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  visibility === 'public'
                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Public</span>
              </button>

              <button
                type="button"
                onClick={() => setVisibility('unlisted')}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  visibility === 'unlisted'
                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Unlisted</span>
              </button>

              <button
                type="button"
                onClick={() => setVisibility('private')}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  visibility === 'private'
                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Private</span>
              </button>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition shadow-xs"
                title="Download as Markdown file"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .md</span>
              </button>

              <button
                type="submit"
                disabled={isSaving || !title.trim()}
                className="inline-flex items-center gap-1 px-4 py-1.5 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition shadow-xs shadow-blue-500/20"
              >
                {isSaving ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Save</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
