import { describe, it, expect, beforeEach } from 'vitest';
import {
  listLocalNotes,
  saveLocalNote,
  getLocalNote,
  deleteLocalNote,
  toggleFavoriteLocalNote,
  extractSnippet,
  formatRelativeTime
} from '../src/storage/local-notes';

describe('Local Notes Storage Manager', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with an empty note list', () => {
    expect(listLocalNotes()).toEqual([]);
  });

  it('saves and retrieves a new local note', () => {
    const saved = saveLocalNote({
      title: 'Meeting Notes',
      content: '# Team Sync\nDiscussed Q4 roadmap and priorities.'
    });

    expect(saved.id).toBeDefined();
    expect(saved.title).toBe('Meeting Notes');
    expect(saved.content).toContain('Team Sync');

    const list = listLocalNotes();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe(saved.id);

    const fetched = getLocalNote(saved.id);
    expect(fetched?.title).toBe('Meeting Notes');
  });

  it('updates an existing local note', () => {
    const created = saveLocalNote({
      title: 'Initial Title',
      content: 'Version 1'
    });

    const updated = saveLocalNote({
      id: created.id,
      title: 'Updated Title',
      content: 'Version 2'
    });

    expect(updated.id).toBe(created.id);
    expect(updated.title).toBe('Updated Title');
    expect(updated.content).toBe('Version 2');

    const list = listLocalNotes();
    expect(list.length).toBe(1);
    expect(list[0].title).toBe('Updated Title');
  });

  it('deletes a local note by id', () => {
    const note1 = saveLocalNote({ title: 'Note 1', content: 'A' });
    const note2 = saveLocalNote({ title: 'Note 2', content: 'B' });

    expect(listLocalNotes().length).toBe(2);

    deleteLocalNote(note1.id);
    const list = listLocalNotes();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe(note2.id);
  });

  it('toggles favorite on a local note', () => {
    const note = saveLocalNote({ title: 'Starred Idea', content: 'Test' });
    expect(note.is_favorite).toBe(false);

    toggleFavoriteLocalNote(note.id);
    expect(getLocalNote(note.id)?.is_favorite).toBe(true);

    toggleFavoriteLocalNote(note.id);
    expect(getLocalNote(note.id)?.is_favorite).toBe(false);
  });

  it('extracts snippet cleanly from markdown text', () => {
    const md = `# Header 1\nThis is **bold** and *italic* with [link](https://example.com).\n\n\`\`\`js\nconst x = 1;\n\`\`\`\n> Quote here\n- item 1\n- item 2`;
    const snippet = extractSnippet(md, 50);

    expect(snippet).not.toContain('#');
    expect(snippet).not.toContain('**');
    expect(snippet).not.toContain('```');
    expect(snippet).toContain('bold and italic with link');
  });

  it('formats relative timestamps correctly', () => {
    const justNow = new Date().toISOString();
    expect(formatRelativeTime(justNow)).toBe('Just now');

    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    expect(formatRelativeTime(tenMinAgo)).toBe('10m ago');

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(twoHoursAgo)).toBe('2h ago');
  });
});
