import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  FolderOpen,
  Loader2,
  Bookmark,
  Calendar,
  Cloud,
  HardDrive,
  Star,
  Search,
  ExternalLink,
  Download,
  Copy,
  Check,
  FileText
} from 'lucide-react';
import { marked } from 'marked';
import { sanitizeHtml } from '../parser/sanitizer';
import { listCloudDocuments, deleteCloudDocument, CloudDocument } from '../supabase/documents';
import {
  LocalNote,
  listLocalNotes,
  deleteLocalNote,
  toggleFavoriteLocalNote,
  extractSnippet,
  formatRelativeTime
} from '../storage/local-notes';
import { useModalAnimation } from '../hooks/useModalAnimation';

export interface UnifiedDocument {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  source: 'cloud' | 'local';
  is_favorite?: boolean;
}

interface MyNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDocId: string | null;
  onSelectDoc: (doc: UnifiedDocument) => void;
  onNewNote: () => void;
  currentUser: any;
}

export const MyNotesModal: React.FC<MyNotesModalProps> = ({
  isOpen,
  onClose,
  activeDocId,
  onSelectDoc,
  onNewNote,
  currentUser
}) => {
  const [cloudDocs, setCloudDocs] = useState<CloudDocument[]>([]);
  const [localDocs, setLocalDocs] = useState<LocalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [tab, setTab] = useState<'all' | 'cloud' | 'local' | 'starred'>('all');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const { isMounted, phase } = useModalAnimation(isOpen, 200);

  const loadAllDocuments = async () => {
    setLoading(true);
    setLocalDocs(listLocalNotes());
    if (currentUser) {
      try {
        const data = await listCloudDocuments();
        setCloudDocs(data);
      } catch (err) {
        console.warn('Failed to load cloud docs:', err);
      }
    } else {
      setCloudDocs([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadAllDocuments();
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

  // Merge into unified documents
  const allDocs: UnifiedDocument[] = useMemo(() => {
    const list: UnifiedDocument[] = [];
    cloudDocs.forEach((d) => {
      list.push({
        id: d.id,
        title: d.title || 'Untitled Cloud Note',
        content: d.content || '',
        created_at: d.created_at,
        updated_at: d.updated_at,
        source: 'cloud',
        is_favorite: false
      });
    });
    localDocs.forEach((l) => {
      list.push({
        id: l.id,
        title: l.title || 'Untitled Local Note',
        content: l.content || '',
        created_at: l.created_at,
        updated_at: l.updated_at,
        source: 'local',
        is_favorite: Boolean(l.is_favorite)
      });
    });

    let filtered = list;
    if (tab === 'cloud') {
      filtered = filtered.filter((d) => d.source === 'cloud');
    } else if (tab === 'local') {
      filtered = filtered.filter((d) => d.source === 'local');
    } else if (tab === 'starred') {
      filtered = filtered.filter((d) => d.is_favorite);
    }

    if (filter.trim()) {
      const q = filter.toLowerCase();
      filtered = filtered.filter(
        (d) => d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q)
      );
    }

    return filtered.sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }, [cloudDocs, localDocs, tab, filter]);

  // Default selection
  useEffect(() => {
    if (allDocs.length > 0 && !selectedNoteId) {
      const active = allDocs.find((d) => d.id === activeDocId);
      setSelectedNoteId(active ? active.id : allDocs[0].id);
    }
  }, [allDocs, activeDocId, selectedNoteId]);

  const selectedDoc = useMemo(() => {
    return allDocs.find((d) => d.id === selectedNoteId) || allDocs[0] || null;
  }, [allDocs, selectedNoteId]);

  // Render preview for selected note
  useEffect(() => {
    if (!selectedDoc) {
      setPreviewHtml('');
      return;
    }
    const raw = marked.parse(selectedDoc.content || '') as string;
    setPreviewHtml(sanitizeHtml(raw));
  }, [selectedDoc]);

  if (!isMounted) return null;

  const handleDelete = async (doc: UnifiedDocument) => {
    if (!window.confirm(`Are you sure you want to delete "${doc.title}"?`)) return;

    if (doc.source === 'cloud') {
      await deleteCloudDocument(doc.id);
    } else {
      deleteLocalNote(doc.id);
    }
    loadAllDocuments();
  };

  const handleToggleFavorite = (doc: UnifiedDocument) => {
    if (doc.source === 'local') {
      toggleFavoriteLocalNote(doc.id);
      setLocalDocs(listLocalNotes());
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = (doc: UnifiedDocument) => {
    const blob = new Blob([doc.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title.replace(/\.md$/i, '')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const wordCount = (text: string) => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 pointer-events-auto">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-900/40 dark:bg-black/65 modal-backdrop modal-backdrop-${phase}`}
        onClick={onClose}
      />

      {/* Dual-Pane Modal Dialog */}
      <div
        className={`relative w-full max-w-4xl h-[82vh] max-h-[780px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800/90 rounded-2xl shadow-[0_25px_70px_-15px_rgba(0,0,0,0.35)] dark:shadow-[0_25px_80px_-15px_rgba(0,0,0,0.85)] ring-1 ring-black/5 dark:ring-white/10 z-10 dialog-spring dialog-spring-${phase} overflow-hidden text-xs flex flex-col transition-colors`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <img
              src="/image/markview.png"
              alt="Markview"
              className="w-8 h-8 rounded-lg object-contain shadow-xs"
            />
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Notes Explorer</h2>
              <p className="text-[11px] text-slate-400">Browse, preview and manage all your notes</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onNewNote();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition active:scale-95 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>New Note</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dual-Pane Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Pane: Notes List & Filter */}
          <div className="w-full sm:w-[360px] border-r border-slate-100 dark:border-slate-800/80 flex flex-col shrink-0">
            {/* Search Bar */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800/80 space-y-2">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter notes..."
                  className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 text-xs"
                />
                {filter && (
                  <button
                    type="button"
                    onClick={() => setFilter('')}
                    className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setTab('all')}
                  className={`px-2.5 py-0.5 rounded-md font-medium transition ${
                    tab === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  All ({allDocs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTab('cloud')}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition ${
                    tab === 'cloud'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Cloud className="w-3 h-3" />
                  <span>Cloud</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTab('local')}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition ${
                    tab === 'local'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <HardDrive className="w-3 h-3" />
                  <span>Local</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTab('starred')}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition ${
                    tab === 'starred'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Star className="w-3 h-3" />
                  <span>Starred</span>
                </button>
              </div>
            </div>

            {/* Note Cards List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Loading notes...</span>
                </div>
              ) : allDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-center">
                  <FolderOpen className="w-8 h-8 stroke-[1.2] mb-2 text-slate-300 dark:text-slate-600" />
                  <p className="font-semibold text-slate-600 dark:text-slate-300">No notes found</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {filter ? 'Try a different search term.' : 'Click "New Note" to start writing.'}
                  </p>
                </div>
              ) : (
                allDocs.map((doc) => {
                  const isSelected = selectedDoc?.id === doc.id;
                  const isActive = activeDocId === doc.id;
                  const snippet = extractSnippet(doc.content, 75);
                  const relTime = formatRelativeTime(doc.updated_at);

                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedNoteId(doc.id)}
                      className={`p-2.5 rounded-xl border transition cursor-pointer select-none ${
                        isSelected
                          ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 shadow-xs'
                          : 'bg-white dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {doc.title.endsWith('.md') ? doc.title : `${doc.title}.md`}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {isActive && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60">
                              Active
                            </span>
                          )}
                          {doc.source === 'cloud' ? (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60">
                              Cloud
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60">
                              Local
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-1">
                        {snippet || <span className="italic opacity-60">Empty note...</span>}
                      </p>

                      <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-100/60 dark:border-slate-800/60 text-[10px] text-slate-400">
                        <span>{relTime}</span>
                        <span>{wordCount(doc.content)} words</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Pane: Live Note Preview & Actions */}
          <div className="hidden sm:flex flex-1 flex-col overflow-hidden bg-slate-50/30 dark:bg-slate-900/40">
            {selectedDoc ? (
              <>
                {/* Note Action Toolbar */}
                <div className="p-3.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
                  <div className="min-w-0 pr-3">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                      {selectedDoc.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatRelativeTime(selectedDoc.updated_at)}</span>
                      </span>
                      <span>•</span>
                      <span>{wordCount(selectedDoc.content)} words</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {selectedDoc.source === 'local' && (
                      <button
                        type="button"
                        onClick={() => handleToggleFavorite(selectedDoc)}
                        className={`p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition ${
                          selectedDoc.is_favorite ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'
                        }`}
                        title="Star note"
                      >
                        <Star className={`w-3.5 h-3.5 ${selectedDoc.is_favorite ? 'fill-current' : ''}`} />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleCopy(selectedDoc.content)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300 transition"
                      title="Copy Markdown"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownload(selectedDoc)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300 transition"
                      title="Download Markdown (.md)"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(selectedDoc)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 transition"
                      title="Delete note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectDoc(selectedDoc);
                        onClose();
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition active:scale-95 shadow-xs ml-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open in Editor</span>
                    </button>
                  </div>
                </div>

                {/* Live Preview Container */}
                <div className="flex-1 overflow-y-auto p-6 bg-white/60 dark:bg-slate-900/60">
                  <div
                    className="markdown-body max-w-none text-slate-800 dark:text-slate-200"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                <Bookmark className="w-12 h-12 stroke-[1] mb-2 text-slate-300 dark:text-slate-600" />
                <p className="font-medium text-slate-600 dark:text-slate-300">No note selected</p>
                <p className="text-xs text-slate-400 mt-1">Select a note from the left to read preview</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
