import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Plus,
  Bookmark,
  Cloud,
  HardDrive,
  Star,
  Trash2,
  Calendar,
  FileText,
  Copy,
  Download,
  Check,
  Maximize2,
  FolderOpen
} from 'lucide-react';
import { useModalAnimation } from '../hooks/useModalAnimation';
import { ConfirmDialog } from './ConfirmDialog';
import {
  LocalNote,
  listLocalNotes,
  deleteLocalNote,
  toggleFavoriteLocalNote,
  extractSnippet,
  formatRelativeTime
} from '../storage/local-notes';
import { CloudDocument, listCloudDocuments, deleteCloudDocument } from '../supabase/documents';

export interface UnifiedNote {
  id: string;
  title: string;
  content: string;
  updated_at: string;
  created_at: string;
  source: 'cloud' | 'local';
  is_favorite?: boolean;
}

interface NotesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeDocId: string | null;
  onSelectNote: (note: UnifiedNote) => void;
  onNewNote: () => void;
  onOpenExplorerModal: () => void;
  currentUser: any;
}

export const NotesDrawer: React.FC<NotesDrawerProps> = ({
  isOpen,
  onClose,
  activeDocId,
  onSelectNote,
  onNewNote,
  onOpenExplorerModal,
  currentUser
}) => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'cloud' | 'local' | 'starred'>('all');
  const [sortBy, setSortBy] = useState<'updated' | 'title'>('updated');
  const [localNotes, setLocalNotes] = useState<LocalNote[]>([]);
  const [cloudNotes, setCloudNotes] = useState<CloudDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<UnifiedNote | null>(null);

  const { isMounted, phase } = useModalAnimation(isOpen, 220);

  // Load notes
  const reloadNotes = async () => {
    setLoading(true);
    setLocalNotes(listLocalNotes());
    if (currentUser) {
      try {
        const docs = await listCloudDocuments();
        setCloudNotes(docs);
      } catch (err) {
        console.warn('Failed to load cloud notes:', err);
      }
    } else {
      setCloudNotes([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      reloadNotes();
    }
  }, [isOpen, currentUser]);

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

  // Combine unified notes
  const unifiedNotes: UnifiedNote[] = useMemo(() => {
    const list: UnifiedNote[] = [];

    // Cloud notes
    cloudNotes.forEach((c) => {
      list.push({
        id: c.id,
        title: c.title || 'Untitled Cloud Note',
        content: c.content || '',
        updated_at: c.updated_at,
        created_at: c.created_at,
        source: 'cloud',
        is_favorite: false
      });
    });

    // Local notes
    localNotes.forEach((l) => {
      list.push({
        id: l.id,
        title: l.title || 'Untitled Local Note',
        content: l.content || '',
        updated_at: l.updated_at,
        created_at: l.created_at,
        source: 'local',
        is_favorite: Boolean(l.is_favorite)
      });
    });

    // Filter
    let filtered = list;
    if (activeTab === 'cloud') {
      filtered = filtered.filter((n) => n.source === 'cloud');
    } else if (activeTab === 'local') {
      filtered = filtered.filter((n) => n.source === 'local');
    } else if (activeTab === 'starred') {
      filtered = filtered.filter((n) => n.is_favorite);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortBy === 'updated') {
      filtered.sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    } else {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    }

    return filtered;
  }, [cloudNotes, localNotes, activeTab, search, sortBy]);

  if (!isMounted) return null;

  const handleDelete = (e: React.MouseEvent, note: UnifiedNote) => {
    e.stopPropagation();
    setNoteToDelete(note);
  };

  const handleConfirmDelete = async () => {
    if (!noteToDelete) return;

    if (noteToDelete.source === 'cloud') {
      await deleteCloudDocument(noteToDelete.id);
    } else {
      deleteLocalNote(noteToDelete.id);
    }
    setNoteToDelete(null);
    reloadNotes();
  };

  const handleToggleFavorite = (e: React.MouseEvent, note: UnifiedNote) => {
    e.stopPropagation();
    if (note.source === 'local') {
      toggleFavoriteLocalNote(note.id);
      setLocalNotes(listLocalNotes());
    }
  };

  const handleCopy = (e: React.MouseEvent, note: UnifiedNote) => {
    e.stopPropagation();
    navigator.clipboard.writeText(note.content);
    setCopiedId(note.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleDownload = (e: React.MouseEvent, note: UnifiedNote) => {
    e.stopPropagation();
    const blob = new Blob([note.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title.replace(/\.md$/i, '')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const wordCount = (text: string) => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-auto">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-900/35 dark:bg-black/60 modal-backdrop modal-backdrop-${phase}`}
        onClick={onClose}
      />

      {/* Slide-over Drawer Panel */}
      <aside
        className={`fixed inset-y-0 left-0 w-full max-w-sm sm:max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-r border-slate-200/90 dark:border-slate-800/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85)] z-50 flex flex-col drawer-spring drawer-spring-${phase} text-xs transition-colors`}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <img
              src="/image/markview.png"
              alt="Markview"
              className="w-8 h-8 rounded-lg object-contain shadow-xs"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Notes Library</h2>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
                  {unifiedNotes.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Search, manage and switch your notes</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                onNewNote();
                onClose();
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs active:scale-95 transition"
              title="Create new note"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>New</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition"
              aria-label="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800/80 shrink-0 space-y-2.5">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or content..."
              className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 text-xs transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                aria-label="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-2 py-0.5 rounded-md font-medium transition ${
                  activeTab === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('cloud')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition ${
                  activeTab === 'cloud'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Cloud className="w-3 h-3" />
                <span>Cloud</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('local')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition ${
                  activeTab === 'local'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <HardDrive className="w-3 h-3" />
                <span>Local</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('starred')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition ${
                  activeTab === 'starred'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Star className="w-3 h-3" />
                <span>Starred</span>
              </button>
            </div>

            {/* Sort Toggle */}
            <button
              type="button"
              onClick={() => setSortBy((s) => (s === 'updated' ? 'title' : 'updated'))}
              className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition shrink-0"
              title="Click to change sort order"
            >
              {sortBy === 'updated' ? 'Recent ↓' : 'A-Z ↓'}
            </button>
          </div>
        </div>

        {/* Note Cards List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="py-12 text-center text-slate-400">Loading notes...</div>
          ) : unifiedNotes.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <FolderOpen className="w-10 h-10 stroke-[1.2] mx-auto text-slate-300 dark:text-slate-600" />
              <p className="font-semibold text-slate-600 dark:text-slate-300">No notes found</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                {search
                  ? `No notes match "${search}". Try a different keyword.`
                  : 'Start writing or click "New Note" to create one!'}
              </p>
            </div>
          ) : (
            unifiedNotes.map((note) => {
              const isActive = activeDocId === note.id;
              const snippet = extractSnippet(note.content, 90);
              const relTime = formatRelativeTime(note.updated_at);
              const words = wordCount(note.content);

              return (
                <div
                  key={note.id}
                  onClick={() => {
                    onSelectNote(note);
                    onClose();
                  }}
                  className={`group relative p-3 rounded-xl border transition-all cursor-pointer select-none ${
                    isActive
                      ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800/80 shadow-xs ring-1 ring-blue-500/20'
                      : 'bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
                  }`}
                >
                  {/* Top Row: Title + Source Pill + Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {note.title.endsWith('.md') ? note.title : `${note.title}.md`}
                      </span>
                      {isActive && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 shrink-0">
                          Active
                        </span>
                      )}
                    </div>

                    {/* Source Pill */}
                    <div className="flex items-center gap-1 shrink-0">
                      {note.source === 'cloud' ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
                          <Cloud className="w-2.5 h-2.5" />
                          <span>Cloud</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
                          <HardDrive className="w-2.5 h-2.5" />
                          <span>Local</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Snippet preview */}
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                    {snippet || <span className="italic opacity-60">Empty note...</span>}
                  </p>

                  {/* Bottom Meta & Hover Quick Actions */}
                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100/80 dark:border-slate-800/60 text-[10px] text-slate-400">
                    <div className="flex items-center gap-2">
                      {relTime && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          <span>{relTime}</span>
                        </span>
                      )}
                      <span>•</span>
                      <span>{words} words</span>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition">
                      {note.source === 'local' && (
                        <button
                          type="button"
                          onClick={(e) => handleToggleFavorite(e, note)}
                          className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition ${
                            note.is_favorite ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'
                          }`}
                          title="Star note"
                          aria-label="Star note"
                        >
                          <Star className={`w-3 h-3 ${note.is_favorite ? 'fill-current' : ''}`} />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleCopy(e, note)}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                        title="Copy Markdown"
                        aria-label="Copy Markdown"
                      >
                        {copiedId === note.id ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDownload(e, note)}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                        title="Download .md"
                        aria-label="Download markdown"
                      >
                        <Download className="w-3 h-3" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, note)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition ml-0.5"
                        title="Delete note"
                        aria-label="Delete note"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Bottom Bar: Full Explorer Button */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenExplorerModal();
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Open Full Dual-Pane Explorer</span>
          </button>

          <span className="text-[10px] text-slate-400 font-mono">Esc to close</span>
        </div>
      </aside>

      <ConfirmDialog
        isOpen={!!noteToDelete}
        title="Delete Note"
        message={
          <span>
            Are you sure you want to delete <span className="font-semibold text-slate-800 dark:text-slate-200">"{noteToDelete?.title}"</span>? This cannot be undone.
          </span>
        }
        confirmLabel="Delete Note"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setNoteToDelete(null)}
      />
    </div>
  );
};
