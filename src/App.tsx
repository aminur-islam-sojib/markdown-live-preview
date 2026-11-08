import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as monaco from 'monaco-editor';
import { Header } from './components/Header';
import { EditorPane } from './components/EditorPane';
import { PreviewPane } from './components/PreviewPane';
import { SaveNoteModal } from './components/SaveNoteModal';
import { AuthModal } from './components/AuthModal';
import { MyNotesModal } from './components/MyNotesModal';
import { NotesDrawer, UnifiedNote } from './components/NotesDrawer';
import { Footer } from './components/Footer';
import { Toast, ToastData } from './components/Toast';
import { ViewMode, Theme, CursorPosition, SaveStatus, Visibility } from './types';
import { AutosaveManager, debounce } from './storage/autosave';
import { saveLocalNote } from './storage/local-notes';
import {
  downloadFile,
  deriveFilename,
  generateHtmlDocument,
  isMarkdownFile,
  readFileAsText
} from './export/file-io';
import { onAuthStateChange, signOut as supabaseSignOut } from './supabase/auth';
import {
  calculatePreviewScroll,
  calculateEditorScroll,
  extractAnchorsFromContainer
} from './utils/sync-scroll';
import {
  createCloudDocument,
  updateCloudDocument,
  getCloudDocument,
} from './supabase/documents';

const DEFAULT_MARKDOWN = `# Welcome to Markview ✨

> A modern, privacy-first live Markdown workspace with Monaco Editor, instant synchronized preview, native Mermaid diagrams, and export options.

---

### ⚡ Quick Start Checklist
- [x] **Live Editing**: Edit text in the editor on the left; the preview updates instantly on the right.
- [ ] **Synchronized Scrolling**: Click **Sync On** in the header to lock both panes together with anchor alignment.
- [ ] **Formatting Tools**: Select text and press \`Ctrl+B\` (Bold), \`Ctrl+I\` (Italic), or use the header toolbar.
- [ ] **Notes Library**: Press \`Ctrl+O\` or click the menu button (≡) on the top-left to manage your notes.
- [ ] **Save Your Work**: Press \`Ctrl+S\` to save locally or sync with your Cloud account.

---

### 📊 Live Mermaid Diagrams
Markview renders native Mermaid diagrams automatically:

\`\`\`mermaid
graph LR
  A[📝 Markdown Input] --> B(⚡ Monaco Editor)
  B --> C{🛡️ DOMPurify}
  C --> D[🎨 Live HTML Preview]
  D --> E[💾 Export / Cloud Sync]
\`\`\`

---

### ⌨️ Essential Keyboard Shortcuts

| Action | Shortcut | Description |
| :--- | :---: | :--- |
| **Save Note** | \`Ctrl + S\` / \`Cmd + S\` | Save locally or sync to Cloud |
| **Notes Drawer** | \`Ctrl + O\` | Open sliding Notes Library |
| **Toggle Bold** | \`Ctrl + B\` | Wrap selection in \`**bold**\` |
| **Toggle Italic** | \`Ctrl + I\` | Wrap selection in \`*italic*\` |

---

### 💻 Code Blocks with Syntax Highlighting

\`\`\`typescript
interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: Date;
}

const welcomeUser = (name: string): string => {
  return \`Welcome to Markview, \${name}!\`;
};
\`\`\`

---

### 🚀 Key Features

* **Instant Live Preview**: Powered by Marked and DOMPurify.
* **Anchor-Based Synchronized Scrolling**: Headings and diagrams stay locked in sync.
* **Export Options**: Export your work anytime to \`.md\`, HTML, or PDF.
* **Cloud & Local Storage**: Save locally in your browser, or sign in to sync with Supabase.

> 💡 **Privacy First:** Your documents stay strictly in your browser storage unless you choose to sign in and save to your private Cloud library.
`;

const deriveDocTitle = (text: string): string => {
  const match = text.match(/^#\s+(.+)$/m);
  return match && match[1] ? match[1].trim() : 'Untitled Document';
};

export const App: React.FC = () => {
  // 1. Core Editor State
  const [content, setContent] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('com.markdownlivepreview_last_state');
      return saved ? JSON.parse(saved).value : DEFAULT_MARKDOWN;
    } catch {
      return DEFAULT_MARKDOWN;
    }
  });

  const [docTitle, setDocTitle] = useState<string>(() => {
    try {
      return localStorage.getItem('com.markdownlivepreview_doc_title') || 'Untitled Document';
    } catch {
      return 'Untitled Document';
    }
  });

  // 2. View & Layout State
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      return (localStorage.getItem('com.markdownlivepreview_view_mode') as ViewMode) || 'split';
    } catch {
      return 'split';
    }
  });

  const [splitRatio, setSplitRatio] = useState<number>(0.5);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);

  // 3. Theme State
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('com.markdownlivepreview_theme');
      if (saved === 'dark') return 'dark';
      if (saved === 'light') return 'light';
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  // 4. Scrolling & Cursor State
  const [syncScroll, setSyncScroll] = useState<boolean>(() => {
    try {
      return localStorage.getItem('com.markdownlivepreview_sync_scroll') === 'true';
    } catch {
      return true;
    }
  });

  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({
    lineNumber: 1,
    column: 1
  });

  // 5. Auth & Cloud State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeCloudDocId, setActiveCloudDocId] = useState<string | null>(null);
  const [activeLocalDocId, setActiveLocalDocId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('com.markdownlivepreview_active_local_id') || null;
    } catch {
      return null;
    }
  });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({
    text: 'Saved just now',
    type: 'saved'
  });
  const [justSaved, setJustSaved] = useState<boolean>(false);
  const [lastSavedContent, setLastSavedContent] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('com.markdownlivepreview_last_state');
      return saved ? JSON.parse(saved).value : DEFAULT_MARKDOWN;
    } catch {
      return DEFAULT_MARKDOWN;
    }
  });
  const isDirty = content !== lastSavedContent;

  // 6. Modal Open & Toast States
  const [isNotesDrawerOpen, setIsNotesDrawerOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMyNotesModalOpen, setIsMyNotesModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  const showToast = useCallback((data: Omit<ToastData, 'id'>) => {
    setToast({
      ...data,
      id: String(Date.now())
    });
  }, []);

  // Refs for fresh state access in callbacks/shortcuts
  const contentRef = useRef(content);
  contentRef.current = content;

  const lastSavedContentRef = useRef(lastSavedContent);
  lastSavedContentRef.current = lastSavedContent;

  const docTitleRef = useRef(docTitle);
  docTitleRef.current = docTitle;

  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  const activeCloudDocIdRef = useRef(activeCloudDocId);
  activeCloudDocIdRef.current = activeCloudDocId;

  const activeLocalDocIdRef = useRef(activeLocalDocId);
  activeLocalDocIdRef.current = activeLocalDocId;

  // Refs
  const editorInstanceRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const saveButtonRef = useRef<HTMLButtonElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Synchronized scrolling tracking refs
  const syncScrollRef = useRef(syncScroll);
  syncScrollRef.current = syncScroll;
  const scrollSourceRef = useRef<'editor' | 'preview' | null>(null);
  const scrollTimeoutRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  // Sync theme with HTML data-theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('com.markdownlivepreview_theme', theme);
    } catch {}
  }, [theme]);

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setCurrentUser(user);
      if (!user) {
        setActiveCloudDocId(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Autosave Manager setup
  const autosaveRef = useRef<AutosaveManager | null>(null);
  useEffect(() => {
    autosaveRef.current = new AutosaveManager({
      debounceMs: 350,
      onStatusChange: (status) => {
        if (status === 'saving') {
          setSaveStatus({ text: 'Saving...', type: 'saving' });
        } else if (status === 'saved') {
          setSaveStatus({
            text: activeCloudDocId ? 'Saved (Cloud)' : 'Saved just now',
            type: 'saved'
          });
        } else if (status === 'unavailable') {
          setSaveStatus({ text: 'Offline (unsaved)', type: 'offline' });
        } else {
          setSaveStatus({ text: 'Save failed', type: 'error' });
        }
      }
    });
  }, [activeCloudDocId]);

  // Cloud Sync Debounce
  const syncToCloud = useCallback(
    debounce(async (val: string, docId: string) => {
      setSaveStatus({ text: 'Syncing to Cloud...', type: 'saving' });
      const updated = await updateCloudDocument(docId, {
        content: val,
        title: deriveDocTitle(val)
      });
      if (updated) {
        setLastSavedContent(val);
        setSaveStatus({ text: 'Saved (Cloud)', type: 'saved' });
      } else {
        setSaveStatus({ text: 'Offline (Saved locally)', type: 'offline' });
      }
    }, 600),
    []
  );

  // Handle Editor Changes
  const handleContentChange = (val: string) => {
    setContent(val);
    autosaveRef.current?.save(val);

    if (currentUser && activeCloudDocId) {
      syncToCloud(val, activeCloudDocId);
    }
  };

  // Bidirectional synchronized scrolling: Editor -> Preview
  const handleEditorScroll = (scrollTop: number, scrollHeight: number, height: number) => {
    if (!syncScrollRef.current || !previewContainerRef.current) return;
    if (scrollSourceRef.current === 'preview') return;

    scrollSourceRef.current = 'editor';
    if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = window.setTimeout(() => {
      scrollSourceRef.current = null;
    }, 100);

    const editor = editorInstanceRef.current;
    const preview = previewContainerRef.current;
    if (!editor || !preview) return;

    const maxEditorScroll = scrollHeight - height;
    const maxPreviewScroll = preview.scrollHeight - preview.clientHeight;

    // Calculate fractional line from visible ranges
    const visibleRanges = editor.getVisibleRanges();
    const topLine = visibleRanges.length > 0 ? visibleRanges[0].startLineNumber : 1;
    const lineTop = editor.getTopForLineNumber(topLine);
    const nextLineTop = editor.getTopForLineNumber(topLine + 1);
    const lineProgress = nextLineTop > lineTop ? (scrollTop - lineTop) / (nextLineTop - lineTop) : 0;
    const fractionalLine = topLine + Math.max(0, Math.min(1, lineProgress));

    const anchors = extractAnchorsFromContainer(preview);
    const targetPreviewScroll = calculatePreviewScroll(
      fractionalLine,
      scrollTop,
      maxEditorScroll,
      maxPreviewScroll,
      anchors
    );

    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      preview.scrollTop = targetPreviewScroll;
    });
  };

  // Bidirectional synchronized scrolling: Preview -> Editor
  const handlePreviewScroll = (scrollTop: number, scrollHeight: number, clientHeight: number) => {
    if (!syncScrollRef.current || !editorInstanceRef.current) return;
    if (scrollSourceRef.current === 'editor') return;

    scrollSourceRef.current = 'preview';
    if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = window.setTimeout(() => {
      scrollSourceRef.current = null;
    }, 100);

    const editor = editorInstanceRef.current;
    const preview = previewContainerRef.current;
    if (!editor || !preview) return;

    const layout = editor.getLayoutInfo();
    const maxEditorScroll = editor.getScrollHeight() - layout.height;
    const maxPreviewScroll = scrollHeight - clientHeight;
    const model = editor.getModel();
    const totalLines = model ? model.getLineCount() : 1;

    const anchors = extractAnchorsFromContainer(preview);
    const { targetLine } = calculateEditorScroll(
      scrollTop,
      maxPreviewScroll,
      maxEditorScroll,
      anchors,
      totalLines
    );

    if (targetLine <= 1) {
      editor.setScrollTop(0);
      return;
    }
    if (maxPreviewScroll > 0 && scrollTop >= maxPreviewScroll - 2) {
      editor.setScrollTop(maxEditorScroll);
      return;
    }

    const lineInt = Math.floor(targetLine);
    const lineFrac = targetLine - lineInt;
    const lineTop = editor.getTopForLineNumber(lineInt);
    const nextTop = editor.getTopForLineNumber(lineInt + 1);
    const targetEditorTop = lineTop + (nextTop - lineTop) * lineFrac;

    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      editor.setScrollTop(targetEditorTop);
    });
  };

  // Toggle sync scroll with immediate alignment & viewmode awareness
  const handleToggleSyncScroll = () => {
    setSyncScroll((prev) => {
      const next = !prev;
      syncScrollRef.current = next; // Immediately update ref to avoid stale closure
      try {
        localStorage.setItem('com.markdownlivepreview_sync_scroll', String(next));
      } catch {}

      if (next) {
        // Auto-switch to split view if currently in single pane mode
        if (viewMode !== 'split') {
          setViewMode('split');
          try {
            localStorage.setItem('com.markdownlivepreview_view_mode', 'split');
          } catch {}
          setTimeout(() => editorInstanceRef.current?.layout(), 50);
        }

        // Instantly align preview to editor
        setTimeout(() => {
          const editor = editorInstanceRef.current;
          const preview = previewContainerRef.current;
          if (editor && preview) {
            const layout = editor.getLayoutInfo();
            const visibleRanges = editor.getVisibleRanges();
            const topLine = visibleRanges.length > 0 ? visibleRanges[0].startLineNumber : 1;
            const lineTop = editor.getTopForLineNumber(topLine);
            const nextLineTop = editor.getTopForLineNumber(topLine + 1);
            const lineProgress = nextLineTop > lineTop ? (editor.getScrollTop() - lineTop) / (nextLineTop - lineTop) : 0;
            const fractionalLine = topLine + Math.max(0, Math.min(1, lineProgress));

            const anchors = extractAnchorsFromContainer(preview);
            const maxEditorScroll = editor.getScrollHeight() - layout.height;
            const maxPreviewScroll = preview.scrollHeight - preview.clientHeight;
            const targetY = calculatePreviewScroll(
              fractionalLine,
              editor.getScrollTop(),
              maxEditorScroll,
              maxPreviewScroll,
              anchors
            );
            preview.scrollTop = targetY;
          }
        }, 80);

        showToast({ message: 'Sync scroll enabled (panes locked)', type: 'info' });
      } else {
        showToast({ message: 'Sync scroll disabled (panes unlocked)', type: 'info' });
      }

      return next;
    });
  };

  // Handle Save Trigger (Button click or Ctrl+S)
  const handleSaveTrigger = useCallback(async (forceOpenModal = false) => {
    const user = currentUserRef.current;
    const docId = activeCloudDocIdRef.current;
    const currentDocContent = contentRef.current;
    const currentDocTitle = docTitleRef.current;
    const isDocDirty = currentDocContent !== lastSavedContentRef.current;

    // 1. If explicitly opened via "Note Details & Tags" or tab click:
    if (forceOpenModal) {
      setIsSaveModalOpen(true);
      return;
    }

    // 2. If logged in and this note is an existing Cloud note:
    if (user && docId) {
      if (!isDocDirty) {
        // Already up to date! Don't open any modal, just give gentle reassurance
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 1500);
        showToast({
          message: 'All changes are up to date in Cloud',
          type: 'cloud'
        });
        return;
      }

      // Has unsaved changes: save immediately in background
      setSaveStatus({ text: 'Saving to Cloud...', type: 'saving' });
      try {
        const updated = await updateCloudDocument(docId, {
          content: currentDocContent,
          title: currentDocTitle
        });
        if (updated) {
          setLastSavedContent(currentDocContent);
          setSaveStatus({ text: 'Saved (Cloud)', type: 'saved' });
          setJustSaved(true);
          setTimeout(() => setJustSaved(false), 1500);
          showToast({
            message: 'Saved to Supabase Cloud',
            type: 'cloud'
          });
        } else {
          setSaveStatus({ text: 'Offline (Saved locally)', type: 'offline' });
        }
      } catch (err) {
        console.error('Failed to sync to cloud:', err);
        setSaveStatus({ text: 'Save failed', type: 'error' });
      }
      return;
    }

    // 3. If guest / unauthenticated user:
    if (!user) {
      // Save locally to localStorage without opening a disruptive modal
      autosaveRef.current?.saveImmediately(currentDocContent);
      setLastSavedContent(currentDocContent);

      const saved = saveLocalNote({
        id: activeLocalDocIdRef.current || undefined,
        title: currentDocTitle,
        content: currentDocContent
      });
      setActiveLocalDocId(saved.id);
      try {
        localStorage.setItem('com.markdownlivepreview_active_local_id', saved.id);
      } catch {}

      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
      setSaveStatus({ text: 'Saved locally', type: 'saved' });
      showToast({
        message: 'Saved to browser storage',
        type: 'success',
        action: {
          label: 'Sign In to sync',
          onClick: () => setIsAuthModalOpen(true)
        }
      });
      return;
    }

    // 4. Logged in, but first-time save for an unsaved/new note:
    // Open the metadata dialog so the user can choose title, tags, visibility!
    setIsSaveModalOpen(true);
  }, [showToast]);

  // Keyboard shortcuts Ctrl+S, Ctrl+O, Cmd+K
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveTrigger();
      } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'o' || e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        setIsNotesDrawerOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleSaveTrigger]);

  // Split Divider Dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSplit || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const minW = 120;
      const maxW = rect.width - minW;
      const clamped = Math.max(minW, Math.min(offsetX, maxW));
      setSplitRatio(clamped / rect.width);
    };

    const handleMouseUp = () => {
      if (isDraggingSplit) {
        setIsDraggingSplit(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        if (editorInstanceRef.current) {
          editorInstanceRef.current.layout();
        }
      }
    };

    if (isDraggingSplit) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSplit]);

  // Window resize layout for Monaco
  useEffect(() => {
    const handleResize = () => {
      if (editorInstanceRef.current) {
        editorInstanceRef.current.layout();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Window Drag & Drop
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(true);
    };
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(true);
    };
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        setIsDragOver(false);
      }
    };
    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!isMarkdownFile(file)) {
        window.alert('Please drop a Markdown (.md) or plain text file.');
        return;
      }
      try {
        const text = await readFileAsText(file);
        setContent(text);
        setLastSavedContent(text);
        autosaveRef.current?.saveImmediately(text);
        const name = file.name.replace(/\.md$/i, '');
        setDocTitle(name);
        try {
          localStorage.setItem('com.markdownlivepreview_doc_title', name);
        } catch {}
      } catch {
        window.alert('Unable to read this file. Please try again.');
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  // Handlers
  const handleOpenFile = async (file: File) => {
    try {
      const text = await file.text();
      setContent(text);
      setLastSavedContent(text);
      autosaveRef.current?.saveImmediately(text);
      const name = file.name.replace(/\.md$/i, '');
      setDocTitle(name);
      try {
        localStorage.setItem('com.markdownlivepreview_doc_title', name);
      } catch {}
    } catch {
      window.alert('Unable to read file. Please try again.');
    }
  };

  const handleResetDoc = () => {
    if (window.confirm('Are you sure you want to reset? Your unsaved changes will be lost.')) {
      setContent(DEFAULT_MARKDOWN);
      setLastSavedContent(DEFAULT_MARKDOWN);
      autosaveRef.current?.saveImmediately(DEFAULT_MARKDOWN);
      const defaultTitle = deriveDocTitle(DEFAULT_MARKDOWN);
      setDocTitle(defaultTitle);
      setActiveCloudDocId(null);
      setActiveLocalDocId(null);
      try {
        localStorage.removeItem('com.markdownlivepreview_doc_title');
        localStorage.removeItem('com.markdownlivepreview_active_local_id');
      } catch {}
    }
  };

  const handleNewDoc = () => {
    const blank = '# Untitled Note\n\nStart writing here...\n';
    setContent(blank);
    setLastSavedContent(blank);
    autosaveRef.current?.saveImmediately(blank);
    setDocTitle('Untitled Note');
    setActiveCloudDocId(null);
    setActiveLocalDocId(null);
    try {
      localStorage.setItem('com.markdownlivepreview_doc_title', 'Untitled Note');
      localStorage.removeItem('com.markdownlivepreview_active_local_id');
    } catch {}
    showToast({ message: 'Created new note', type: 'info' });
  };

  const handleFormat = (type: 'bold' | 'italic' | 'link' | 'quote' | 'code') => {
    const editor = editorInstanceRef.current;
    if (!editor) return;
    const selection = editor.getSelection();
    const model = editor.getModel();
    if (!selection || !model) return;

    const selected = model.getValueInRange(selection);
    let replacement = '';

    switch (type) {
      case 'bold':
        replacement = `**${selected || 'bold text'}**`;
        break;
      case 'italic':
        replacement = `*${selected || 'italic text'}*`;
        break;
      case 'link':
        replacement = `[${selected || 'link text'}](https://example.com)`;
        break;
      case 'quote':
        replacement = selected
          ? selected.split('\n').map((l) => `> ${l}`).join('\n')
          : '> quote text';
        break;
      case 'code':
        replacement = selected.includes('\n')
          ? `\`\`\`\n${selected}\n\`\`\``
          : `\`${selected || 'code'}\``;
        break;
    }

    editor.executeEdits('format', [
      {
        range: selection,
        text: replacement,
        forceMoveMarkers: true
      }
    ]);
    editor.focus();
  };

  const handleExport = (format: 'md' | 'html' | 'pdf') => {
    if (format === 'md') {
      const filename = deriveFilename(content, 'md');
      downloadFile(content, filename, 'text/markdown');
    } else if (format === 'html') {
      const outputEl = document.querySelector('#output');
      const renderedHtml = outputEl ? outputEl.innerHTML : '';
      const fullHtml = generateHtmlDocument(docTitle, renderedHtml);
      const filename = deriveFilename(content, 'html');
      downloadFile(fullHtml, filename, 'text/html');
    } else if (format === 'pdf') {
      window.print();
    }
  };

  const handleSaveNote = async (metadata: {
    title: string;
    description: string;
    tags: string;
    visibility: Visibility;
  }) => {
    const cleanTitle = metadata.title.trim();
    setDocTitle(cleanTitle);
    try {
      localStorage.setItem('com.markdownlivepreview_doc_title', cleanTitle);
      localStorage.setItem(
        `com.markdownlivepreview_meta_${cleanTitle}`,
        JSON.stringify(metadata)
      );
    } catch {}

    autosaveRef.current?.saveImmediately(content);

    if (currentUser) {
      if (activeCloudDocId) {
        const updated = await updateCloudDocument(activeCloudDocId, {
          title: cleanTitle,
          content
        });
        if (updated) {
          setLastSavedContent(content);
          setSaveStatus({ text: 'Saved (Cloud)', type: 'saved' });
          setJustSaved(true);
          setTimeout(() => setJustSaved(false), 1500);
          showToast({ message: 'Saved to Supabase Cloud', type: 'cloud' });
        }
      } else {
        const newDoc = await createCloudDocument(cleanTitle, content);
        if (newDoc) {
          setActiveCloudDocId(newDoc.id);
          setLastSavedContent(content);
          setSaveStatus({ text: 'Saved (Cloud)', type: 'saved' });
          setJustSaved(true);
          setTimeout(() => setJustSaved(false), 1500);
          showToast({ message: 'Saved to Supabase Cloud', type: 'cloud' });
        }
      }
    } else {
      const saved = saveLocalNote({
        id: activeLocalDocIdRef.current || undefined,
        title: cleanTitle,
        content
      });
      setActiveLocalDocId(saved.id);
      try {
        localStorage.setItem('com.markdownlivepreview_active_local_id', saved.id);
      } catch {}

      setLastSavedContent(content);
      setSaveStatus({ text: 'Saved just now', type: 'saved' });
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
      showToast({ message: 'Saved to browser storage', type: 'success' });
    }
  };

  const handleDownloadMd = (title: string) => {
    const filename = `${title.replace(/\.md$/i, '')}.md`;
    downloadFile(content, filename, 'text/markdown');
    setSaveStatus({ text: 'Downloaded .md', type: 'saved' });
  };

  const handleSelectNote = async (note: { id: string; title: string; content?: string; source: 'cloud' | 'local' }) => {
    let noteContent = note.content;
    if (note.source === 'cloud') {
      setActiveCloudDocId(note.id);
      if (typeof noteContent !== 'string') {
        const full = await getCloudDocument(note.id);
        noteContent = full?.content ?? '';
      }
      setSaveStatus({ text: 'Saved (Cloud)', type: 'saved' });
    } else {
      setActiveCloudDocId(null);
      setSaveStatus({ text: 'Saved locally', type: 'saved' });
    }

    const finalContent = noteContent ?? '';
    setContent(finalContent);
    setLastSavedContent(finalContent);
    const cleanTitle = (note.title || 'Untitled Document').replace(/\.md$/i, '');
    setDocTitle(cleanTitle);
    autosaveRef.current?.saveImmediately(finalContent);
    try {
      localStorage.setItem('com.markdownlivepreview_doc_title', cleanTitle);
    } catch {}
    showToast({ message: `Opened "${cleanTitle}"`, type: 'info' });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans transition-colors">
      {/* Unified 44px Pro Header */}
      <Header
        docTitle={docTitle}
        onNewDoc={handleNewDoc}
        onResetDoc={handleResetDoc}
        saveStatus={saveStatus}
        activeCloudDocId={activeCloudDocId}
        onOpenFile={handleOpenFile}
        onOpenMyNotes={() => setIsMyNotesModalOpen(true)}
        onExport={handleExport}
        onSaveClick={() => handleSaveTrigger()}
        onEditNoteDetails={() => handleSaveTrigger(true)}
        justSaved={justSaved}
        saveButtonRef={saveButtonRef}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onSignOut={() => {
          supabaseSignOut();
          setActiveCloudDocId(null);
        }}
        onToggleNotesDrawer={() => setIsNotesDrawerOpen((prev) => !prev)}
        isDirty={isDirty}
        onDownloadMd={() => handleDownloadMd(docTitle)}
        onCopyContent={() => {
          navigator.clipboard.writeText(content);
          showToast({ message: 'Copied Markdown to clipboard', type: 'info' });
        }}
        viewMode={viewMode}
        onViewModeChange={(m) => {
          setViewMode(m);
          try {
            localStorage.setItem('com.markdownlivepreview_view_mode', m);
          } catch {}
          setTimeout(() => editorInstanceRef.current?.layout(), 50);
        }}
        onFormat={handleFormat}
        syncScroll={syncScroll}
        onToggleSyncScroll={handleToggleSyncScroll}
      />

      {/* Main Workspace (Editor + Split Divider + Preview) */}
      <main ref={containerRef} className="flex-1 relative flex overflow-hidden">
        {/* Editor Pane */}
        {(viewMode === 'split' || viewMode === 'editor') && (
          <div
            style={{
              width: viewMode === 'editor' ? '100%' : `${splitRatio * 100}%`
            }}
            className="h-full relative overflow-hidden"
          >
            <EditorPane
              value={content}
              onChange={handleContentChange}
              onCursorChange={setCursorPosition}
              onSaveTrigger={() => handleSaveTrigger()}
              theme={theme}
              onScrollChange={handleEditorScroll}
              editorRef={editorInstanceRef}
            />
          </div>
        )}

        {/* Resizable Divider (Split View only) */}
        {viewMode === 'split' && (
          <div
            onMouseDown={() => setIsDraggingSplit(true)}
            onDoubleClick={() => setSplitRatio(0.5)}
            className="w-1.5 hover:w-2 bg-slate-200 dark:bg-slate-800 hover:bg-blue-500 dark:hover:bg-blue-500 cursor-col-resize transition-all shrink-0 z-10"
            title="Drag to resize, double-click to center"
          />
        )}

        {/* Preview Pane */}
        {(viewMode === 'split' || viewMode === 'preview') && (
          <div
            style={{
              width: viewMode === 'preview' ? '100%' : `${(1 - splitRatio) * 100}%`
            }}
            className="h-full relative overflow-hidden"
          >
            <PreviewPane
              content={content}
              theme={theme}
              previewRef={previewContainerRef}
              onScroll={handlePreviewScroll}
            />
          </div>
        )}

        {/* Drag & Drop Visual Overlay */}
        {isDragOver && (
          <div className="absolute inset-0 bg-blue-500/10 dark:bg-blue-500/20 border-4 border-dashed border-blue-500 rounded-xl z-50 flex items-center justify-center pointer-events-none">
            <div className="bg-white dark:bg-slate-900 px-6 py-4 rounded-2xl shadow-2xl border border-blue-200 dark:border-blue-800 text-center">
              <p className="font-semibold text-slate-800 dark:text-slate-100">Drop Markdown file to open</p>
              <p className="text-xs text-slate-400 mt-1">Accepts .md, .markdown, and plain text files</p>
            </div>
          </div>
        )}
      </main>

      {/* Status Footer */}
      <Footer cursorPosition={cursorPosition} content={content} />

      {/* Floating Save Popover Dialog */}
      <SaveNoteModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        anchorRef={saveButtonRef}
        currentTitle={docTitle}
        onSave={handleSaveNote}
        onDownloadMd={handleDownloadMd}
        currentUser={currentUser}
        isExistingNote={Boolean(activeCloudDocId)}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Slide-over Notes Library Drawer */}
      <NotesDrawer
        isOpen={isNotesDrawerOpen}
        onClose={() => setIsNotesDrawerOpen(false)}
        activeDocId={activeCloudDocId || activeLocalDocId}
        onSelectNote={handleSelectNote}
        onNewNote={handleNewDoc}
        onOpenExplorerModal={() => setIsMyNotesModalOpen(true)}
        currentUser={currentUser}
      />

      {/* Dual-Pane Notes Explorer Modal */}
      <MyNotesModal
        isOpen={isMyNotesModalOpen}
        onClose={() => setIsMyNotesModalOpen(false)}
        activeDocId={activeCloudDocId || activeLocalDocId}
        onSelectDoc={handleSelectNote}
        onNewNote={handleNewDoc}
        currentUser={currentUser}
      />

      {/* Floating Micro Toast Notifications */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};
