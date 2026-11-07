import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  X,
  Plus,
  CheckCircle2,
  FolderOpen,
  Eye,
  Download,
  ChevronDown,
  Bookmark,
  Sun,
  Moon,
  Maximize2,
  Minimize2,
  User,
  LogOut,
  Cloud,
  Check,
  Edit2,
  Menu
} from 'lucide-react';
import { SaveStatus, Theme } from '../types';

interface HeaderProps {
  docTitle: string;
  onNewDoc: () => void;
  onResetDoc: () => void;
  saveStatus: SaveStatus;
  activeCloudDocId: string | null;
  onOpenFile: (file: File) => void;
  onOpenMyNotes: () => void;
  onExport: (format: 'md' | 'html' | 'pdf') => void;
  onSaveClick: () => void;
  saveButtonRef: React.RefObject<HTMLButtonElement | null>;
  theme: Theme;
  onToggleTheme: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  currentUser: any;
  onOpenAuth: () => void;
  onSignOut: () => void;
  justSaved?: boolean;
  onEditNoteDetails?: () => void;
  isDirty?: boolean;
  onDownloadMd?: () => void;
  onCopyContent?: () => void;
  onToggleNotesDrawer?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  docTitle,
  onNewDoc,
  onResetDoc,
  saveStatus,
  activeCloudDocId,
  onOpenFile,
  onOpenMyNotes,
  onExport,
  onSaveClick,
  saveButtonRef,
  theme,
  onToggleTheme,
  isFullscreen,
  onToggleFullscreen,
  currentUser,
  onOpenAuth,
  onSignOut,
  justSaved = false,
  onEditNoteDetails,
  isDirty = false,
  onDownloadMd,
  onCopyContent,
  onToggleNotesDrawer
}) => {
  const [exportOpen, setExportOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const quickMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (exportRef.current && !exportRef.current.contains(target)) {
        setExportOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
      if (quickMenuRef.current && !quickMenuRef.current.contains(target)) {
        setQuickMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onOpenFile(file);
      e.target.value = '';
    }
  };

  const displayName = currentUser
    ? currentUser.user_metadata?.full_name ||
      currentUser.user_metadata?.name ||
      currentUser.email?.split('@')[0] ||
      'Account'
    : '';

  const avatarInitial = displayName ? displayName.charAt(0).toUpperCase() : 'A';

  return (
    <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 md:px-4 flex items-center justify-between select-none shrink-0 transition-colors">
      {/* Left section: Hamburger Drawer Toggle, Logo & Document Tabs */}
      <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
        {/* Notes Library Hamburger Button */}
        <button
          type="button"
          onClick={onToggleNotesDrawer}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition -ml-1 shrink-0"
          title="Open Notes Library (Ctrl+O)"
          aria-label="Open Notes Library"
        >
          <Menu className="w-4 h-4 stroke-[2.2]" />
        </button>

        {/* App Logo */}
        <a
          href="/"
          className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100 hover:opacity-90 shrink-0"
          title="Markdown Live Preview"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
            <FileText className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="text-[15px] tracking-tight font-bold hidden sm:inline">Markview</span>
        </a>

        {/* Tab strip */}
        <div className="flex items-center gap-1.5 overflow-hidden pl-1 border-l border-slate-200 dark:border-slate-800">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 max-w-[200px] truncate ${
              activeCloudDocId ? 'hover:border-blue-400 dark:hover:border-blue-500' : ''
            }`}
            title={activeCloudDocId ? `${docTitle} (Click to edit details)` : docTitle}
          >
            <span
              onClick={activeCloudDocId ? onEditNoteDetails : undefined}
              className={`truncate ${activeCloudDocId ? 'cursor-pointer hover:underline' : ''}`}
            >
              {docTitle.endsWith('.md') ? docTitle : `${docTitle}.md`}
            </span>
            <button
              type="button"
              onClick={onResetDoc}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded transition shrink-0"
              aria-label="Clear document"
              title="Reset document"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          <button
            type="button"
            onClick={onNewDoc}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition"
            aria-label="New Note"
            title="Create new note"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right section: Status, Actions, Profile */}
      <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
        {/* Save Status Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 mr-1">
          <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.2]" />
          <span>{saveStatus.text}</span>
        </div>

        {/* Cloud Active Badge */}
        {activeCloudDocId && (
          <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40 mr-1">
            <Cloud className="w-3.5 h-3.5" />
            <span className="truncate max-w-[100px]">{docTitle}</span>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.markdown,text/markdown"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Open Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition shadow-xs"
          title="Open Markdown file (.md)"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Open</span>
        </button>

        {/* My Notes Button */}
        {currentUser && (
          <button
            type="button"
            onClick={onOpenMyNotes}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition shadow-xs"
            title="My Cloud Notes"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Notes</span>
          </button>
        )}

        {/* Export Dropdown */}
        <div ref={exportRef} className="relative">
          <button
            type="button"
            onClick={() => setExportOpen((prev) => !prev)}
            aria-expanded={exportOpen}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {exportOpen && (
            <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl py-1 z-50 text-xs text-slate-700 dark:text-slate-200">
              <button
                type="button"
                onClick={() => {
                  onExport('md');
                  setExportOpen(false);
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between"
              >
                <span>Export Markdown (.md)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onExport('html');
                  setExportOpen(false);
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between"
              >
                <span>Export HTML (.html)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onExport('pdf');
                  setExportOpen(false);
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between"
              >
                <span>Export PDF</span>
              </button>
            </div>
          )}
        </div>

        {/* State-aware Save Button */}
        {(!isDirty && (activeCloudDocId || justSaved)) ? (
          /* ================= Up to Date / Saved State ================= */
          <div ref={quickMenuRef} className="relative inline-flex items-center rounded-lg shadow-xs border border-emerald-200/90 dark:border-emerald-800/80 bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
            <button
              ref={saveButtonRef}
              type="button"
              onClick={onSaveClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 rounded-l-lg transition active:scale-[0.98]"
              title="All changes saved. Press Ctrl+S to verify or click to view status."
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{justSaved ? 'Saved!' : 'Saved'}</span>
            </button>

            <button
              type="button"
              onClick={() => setQuickMenuOpen((prev) => !prev)}
              className="px-1.5 py-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 rounded-r-lg border-l border-emerald-200/80 dark:border-emerald-800/60 transition"
              title="Note quick actions & details"
              aria-label="Note quick actions"
            >
              <ChevronDown className="w-3 h-3" />
            </button>

            {/* Quick Action Popover */}
            {quickMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-56 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 shadow-[0_15px_35px_-10px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_45px_-10px_rgba(0,0,0,0.8)] ring-1 ring-black/5 dark:ring-white/10 py-1.5 z-50 text-xs text-slate-700 dark:text-slate-200 popover-spring popover-spring-entered">
                <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800/80">
                  <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{docTitle}</p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                    <Cloud className="w-3 h-3" />
                    <span>{activeCloudDocId ? 'Synced with Supabase Cloud' : 'Saved in Browser storage'}</span>
                  </p>
                </div>

                <div className="py-1">
                  {onEditNoteDetails && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuickMenuOpen(false);
                        onEditNoteDetails();
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/70 flex items-center gap-2"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Note Details & Tags</span>
                    </button>
                  )}

                  {onDownloadMd && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuickMenuOpen(false);
                        onDownloadMd();
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/70 flex items-center gap-2"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-400" />
                      <span>Download .md</span>
                    </button>
                  )}

                  {onCopyContent && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuickMenuOpen(false);
                        onCopyContent();
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/70 flex items-center gap-2"
                    >
                      <Bookmark className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy Markdown</span>
                    </button>
                  )}
                </div>

                <div className="pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      setQuickMenuOpen(false);
                      onNewDoc();
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/70 flex items-center gap-2 text-slate-600 dark:text-slate-300"
                  >
                    <Plus className="w-3.5 h-3.5 text-slate-400" />
                    <span>Create New Note</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ================= Unsaved Changes / Active Save Button ================= */
          <button
            ref={saveButtonRef}
            type="button"
            onClick={onSaveClick}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition shadow-xs ${
              justSaved
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] shadow-blue-500/20'
            }`}
            title={
              activeCloudDocId
                ? 'Save changes to cloud (Ctrl+S)'
                : 'Save note (Ctrl+S)'
            }
          >
            {justSaved ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Bookmark className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Save</span>
                {isDirty && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" title="Unsaved changes" />
                )}
              </>
            )}
          </button>
        )}

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label="Toggle theme"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
        </button>

        {/* Fullscreen Toggle */}
        <button
          type="button"
          onClick={onToggleFullscreen}
          aria-label="Toggle fullscreen"
          className="hidden sm:flex w-8 h-8 items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          title="Toggle fullscreen"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* User Account / Sign In */}
        {currentUser ? (
          <div ref={userMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen((prev) => !prev)}
              aria-expanded={userMenuOpen}
              className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 flex items-center justify-center font-bold text-xs"
              title={`Signed in as ${displayName}`}
            >
              {avatarInitial}
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-52 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl py-1 z-50 text-xs text-slate-700 dark:text-slate-200">
                <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-700">
                  <p className="font-semibold truncate">{displayName}</p>
                  <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    onOpenMyNotes();
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>My Notes</span>
                </button>
                {activeCloudDocId && (
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      onEditNoteDetails?.();
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Note Details & Tags</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    onSignOut();
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-rose-600 dark:text-rose-400 border-t border-slate-100 dark:border-slate-700"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenAuth}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <User className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
