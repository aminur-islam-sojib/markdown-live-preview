import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, FolderOpen, Loader2, Bookmark, Calendar } from 'lucide-react';
import { listCloudDocuments, deleteCloudDocument, CloudDocument } from '../supabase/documents';
import { useModalAnimation } from '../hooks/useModalAnimation';

interface MyNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDocId: string | null;
  onSelectDoc: (doc: CloudDocument) => void;
  onNewNote: () => void;
}

export const MyNotesModal: React.FC<MyNotesModalProps> = ({
  isOpen,
  onClose,
  activeDocId,
  onSelectDoc,
  onNewNote
}) => {
  const [docs, setDocs] = useState<CloudDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const { isMounted, phase } = useModalAnimation(isOpen, 200);

  const loadDocuments = async () => {
    setLoading(true);
    const data = await listCloudDocuments();
    setDocs(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadDocuments();
    }
  }, [isOpen]);

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

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title || 'Untitled'}"?`)) return;
    const ok = await deleteCloudDocument(id);
    if (ok) {
      setDocs((prev) => prev.filter((d) => d.id !== id));
    }
  };

  const filteredDocs = docs.filter((d) =>
    (d.title || 'Untitled Document').toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-900/40 dark:bg-black/60 modal-backdrop modal-backdrop-${phase}`}
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className={`relative w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.8)] ring-1 ring-black/5 dark:ring-white/10 z-10 dialog-spring dialog-spring-${phase} overflow-hidden text-xs flex flex-col max-h-[80vh]`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">My Cloud Notes</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                onNewNote();
                onClose();
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-medium hover:bg-blue-100 dark:hover:bg-blue-900/60 active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search notes by title..."
            className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 text-xs"
          />
        </div>

        {/* List */}
        <div className="overflow-y-auto p-3 space-y-1.5 flex-1 min-h-[160px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading notes...</span>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
              <Bookmark className="w-8 h-8 stroke-[1.2] mb-2 text-slate-300 dark:text-slate-600" />
              <p className="font-medium text-slate-600 dark:text-slate-300">No notes found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {filter ? 'No notes match your filter.' : 'Create your first note to sync to cloud!'}
              </p>
            </div>
          ) : (
            filteredDocs.map((doc) => {
              const isActive = activeDocId === doc.id;
              const date = new Date(doc.updated_at);
              const formattedDate = isNaN(date.getTime())
                ? ''
                : `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

              return (
                <div
                  key={doc.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                    isActive
                      ? 'bg-blue-50/60 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60'
                      : 'bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {doc.title || 'Untitled Document'}
                      </span>
                      {isActive && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 shrink-0">
                          Active
                        </span>
                      )}
                    </div>
                    {formattedDate && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>{formattedDate}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectDoc(doc);
                        onClose();
                      }}
                      className="px-2.5 py-1 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id, doc.title)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition"
                      aria-label="Delete note"
                      title="Delete note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
