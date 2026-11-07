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
  Cloud
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
  onSignOut
}) => {
  const [exportOpen, setExportOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
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
      {/* Left section: Logo & Document Tabs */}
      <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 max-w-[200px] truncate"
            title={docTitle}
          >
            <span className="truncate">{docTitle.endsWith('.md') ? docTitle : `${docTitle}.md`}</span>
            <button
              type="button"
              onClick={onResetDoc}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded transition"
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

        {/* Primary Save Button (anchors the Save popup) */}
        <button
          ref={saveButtonRef}
          type="button"
          onClick={onSaveClick}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition shadow-xs shadow-blue-500/20"
          title="Save note (Ctrl+S)"
        >
          <Bookmark className="w-3.5 h-3.5 stroke-[2.2]" />
          <span>Save</span>
        </button>

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
