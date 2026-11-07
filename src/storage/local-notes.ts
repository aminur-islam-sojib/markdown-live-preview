export interface LocalNote {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_favorite?: boolean;
}

const STORAGE_KEY = 'com.markdownlivepreview_local_notes_index';

/**
 * Strips markdown formatting to produce a clean plain-text snippet for note card previews.
 */
export function extractSnippet(markdown: string, maxLen = 110): string {
  if (!markdown) return '';
  const clean = markdown
    .replace(/^#+\s+/gm, '') // headings
    .replace(/\!\[.*?\]\(.*?\)/g, '') // images
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // links
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // bold
    .replace(/(\*|_)(.*?)\1/g, '$2') // italic
    .replace(/`{1,3}[\s\S]*?`{1,3}/g, '') // code blocks
    .replace(/^>\s+/gm, '') // blockquotes
    .replace(/^[-*+]\s+/gm, '') // unordered lists
    .replace(/^\d+\.\s+/gm, '') // ordered lists
    .replace(/\n+/g, ' ') // newlines
    .trim();

  return clean.length > maxLen ? `${clean.slice(0, maxLen).trim()}...` : clean;
}

/**
 * Returns human-readable relative time (e.g. "Just now", "5m ago", "Yesterday").
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/**
 * Reads all locally saved notes from browser localStorage.
 */
export function listLocalNotes(): LocalNote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  } catch (err) {
    console.warn('Failed to read local notes:', err);
    return [];
  }
}

/**
 * Fetches a single local note by ID.
 */
export function getLocalNote(id: string): LocalNote | null {
  const notes = listLocalNotes();
  return notes.find((n) => n.id === id) || null;
}

/**
 * Saves (creates or updates) a note in local storage.
 */
export function saveLocalNote(note: {
  id?: string;
  title: string;
  content: string;
  is_favorite?: boolean;
}): LocalNote {
  const notes = listLocalNotes();
  const now = new Date().toISOString();

  const id = note.id || `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const cleanTitle = note.title.trim() || 'Untitled Note';

  const existingIndex = notes.findIndex((n) => n.id === id);
  let updatedNote: LocalNote;

  if (existingIndex >= 0) {
    updatedNote = {
      ...notes[existingIndex],
      title: cleanTitle,
      content: note.content,
      updated_at: now,
      is_favorite: note.is_favorite ?? notes[existingIndex].is_favorite
    };
    notes[existingIndex] = updatedNote;
  } else {
    updatedNote = {
      id,
      title: cleanTitle,
      content: note.content,
      created_at: now,
      updated_at: now,
      is_favorite: note.is_favorite ?? false
    };
    notes.unshift(updatedNote);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch (err) {
    console.warn('Failed to save note to localStorage:', err);
  }

  return updatedNote;
}

/**
 * Deletes a note from local storage by ID.
 */
export function deleteLocalNote(id: string): boolean {
  try {
    const notes = listLocalNotes().filter((n) => n.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    return true;
  } catch (err) {
    console.warn('Failed to delete note from localStorage:', err);
    return false;
  }
}

/**
 * Toggles the favorite flag on a local note.
 */
export function toggleFavoriteLocalNote(id: string): boolean {
  const notes = listLocalNotes();
  const note = notes.find((n) => n.id === id);
  if (!note) return false;

  note.is_favorite = !note.is_favorite;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    return true;
  } catch {
    return false;
  }
}
