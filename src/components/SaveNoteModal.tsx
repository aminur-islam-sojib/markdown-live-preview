import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Globe,
  Link2,
  Lock,
  Download,
  Check,
  Bookmark,
  Hash,
  Cloud,
  Mail,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { Visibility } from '../types';
import { signInWithPassword, signUpWithPassword, signInWithOAuth } from '../supabase/auth';
import { isSupabaseConfigured } from '../supabase/client';
import { useModalAnimation } from '../hooks/useModalAnimation';

interface SaveNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  currentTitle: string;
  onSave: (metadata: { title: string; description: string; tags: string; visibility: Visibility }) => Promise<void>;
  onDownloadMd: (title: string) => void;
  currentUser: any;
  isExistingNote?: boolean;
}

export const SaveNoteModal: React.FC<SaveNoteModalProps> = ({
  isOpen,
  onClose,
  anchorRef,
  currentTitle,
  onSave,
  onDownloadMd,
  currentUser,
  isExistingNote = false
}) => {
  // Save form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [isSaving, setIsSaving] = useState(false);

  // Auth fields (for unauthenticated users)
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

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
    setAuthError(null);

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

    if (currentUser) {
      setTimeout(() => {
        titleInputRef.current?.focus();
        titleInputRef.current?.select();
      }, 50);
    }

    return () => window.removeEventListener('resize', updatePosition);
  }, [isOpen, currentTitle, anchorRef, currentUser]);

  const { isMounted, phase } = useModalAnimation(isOpen, 200);

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

  if (!isMounted) return null;

  const isConfigured = isSupabaseConfigured();

  // Handle Save Note submission (when authenticated)
  const handleSubmitSave = async (e: React.FormEvent) => {
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

  // Handle Auth submission (when unauthenticated)
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) return;
    setAuthLoading(true);
    setAuthError(null);

    if (authTab === 'signin') {
      const { error } = await signInWithPassword(authEmail.trim(), authPassword);
      setAuthLoading(false);
      if (error) {
        setAuthError(error.message);
      }
    } else {
      const { error, requiresEmailConfirmation } = await signUpWithPassword(authEmail.trim(), authPassword);
      setAuthLoading(false);
      if (error) {
        setAuthError(error.message);
      } else if (requiresEmailConfirmation) {
        setAuthError('Account created! Please check your email inbox to verify your account, then sign in.');
      }
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    setAuthError(null);
    const { error } = await signInWithOAuth(provider);
    if (error) {
      setAuthError(error.message);
    }
  };

  const handleDownload = () => {
    const cleanTitle = title.trim() || currentTitle || 'Untitled';
    onDownloadMd(cleanTitle);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-auto">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-900/30 dark:bg-black/60 modal-backdrop modal-backdrop-${phase}`}
        onClick={onClose}
      />

      {/* Popover Card */}
      <div
        ref={modalRef}
        style={{
          top: `${coords.top}px`,
          right: `${coords.right}px`
        }}
        className={`fixed w-[calc(100vw-24px)] max-w-110 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.22),0_0_1px_1px_rgba(0,0,0,0.05)] dark:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.75),0_0_1px_1px_rgba(255,255,255,0.08)] ring-1 ring-black/5 dark:ring-white/10 z-50 popover-spring popover-spring-${phase} transition-colors`}
      >
        {/* Caret pointing up to Save button */}
        <div
          style={{ left: `${coords.arrowLeft}px` }}
          className="absolute -top-1.5 -translate-x-1/2 w-3 h-3 bg-white/95 dark:bg-slate-900/95 border-t border-l border-slate-200/90 dark:border-slate-800/90 rotate-45 pointer-events-none"
        />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            {currentUser ? (
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Bookmark className="w-4 h-4" />
              </div>
            ) : (
              <img
                src="/image/markview.png"
                alt="Markview"
                className="w-8 h-8 rounded-lg object-contain shadow-xs shrink-0"
              />
            )}
            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {currentUser
                  ? isExistingNote
                    ? 'Note details & settings'
                    : 'Save your note'
                  : 'Sign in to save note'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {currentUser
                  ? isExistingNote
                    ? 'Update title, description or visibility'
                    : 'Title is required. Everything else is optional.'
                  : 'Sign in to securely sync your notes to the cloud.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        {currentUser ? (
          /* ================= Authenticated Save Form ================= */
          <form onSubmit={handleSubmitSave} className="p-4 space-y-3.5 text-xs">
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
                  placeholder="meeting, ideas, markdown..."
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
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 hover:border-slate-300 dark:hover:border-slate-600 shadow-xs active:scale-[0.98] transition focus:outline-hidden focus:ring-2 focus:ring-slate-400/20"
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
                      <span>{isExistingNote ? 'Update Note' : 'Save'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* ================= Unauthenticated Login UI ================= */
          <div className="p-4 space-y-3.5 text-xs">
            {!isConfigured && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-amber-800 dark:text-amber-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  Supabase not configured in <code className="font-mono">.env.local</code>. You can download notes directly as <code className="font-mono">.md</code>.
                </p>
              </div>
            )}

            {/* Quick OAuth Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleOAuthLogin('google')}
                className="py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium transition flex items-center justify-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Google</span>
              </button>

              <button
                type="button"
                onClick={() => handleOAuthLogin('github')}
                className="py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium transition flex items-center justify-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                <span>GitHub</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-2.5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              </div>
              <span className="relative z-10 bg-white dark:bg-slate-900 px-2.5 text-[10px] text-slate-400 uppercase tracking-wider font-semibold whitespace-nowrap">
                or with email
              </span>
            </div>

            {/* Tab switch */}
            <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => {
                  setAuthTab('signin');
                  setAuthError(null);
                }}
                className={`py-1 rounded-md font-medium text-xs transition ${
                  authTab === 'signin'
                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTab('signup');
                  setAuthError(null);
                }}
                className={`py-1 rounded-md font-medium text-xs transition ${
                  authTab === 'signup'
                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error Message */}
            {authError && (
              <div className="flex items-start gap-2 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            {/* Email / Password Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-2.5">
              <div>
                <div className="relative flex items-center">
                  <Mail className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="Email address"
                    required
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <div className="relative flex items-center">
                  <Lock className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Password"
                    required
                    minLength={6}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 transition shadow-xs flex items-center justify-center gap-1.5"
              >
                <span>
                  {authLoading
                    ? 'Processing...'
                    : authTab === 'signin'
                    ? 'Sign In & Save'
                    : 'Create Account & Save'}
                </span>
                {!authLoading && <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </form>

            {/* Guest fallback section */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-slate-500 dark:text-slate-400">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 hover:border-slate-300 dark:hover:border-slate-600 shadow-xs active:scale-[0.98] transition focus:outline-hidden focus:ring-2 focus:ring-slate-400/20"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .md without sign in</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
