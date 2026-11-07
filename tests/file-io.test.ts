import { describe, it, expect, vi } from 'vitest';
import {
  generateHtmlDocument,
  isMarkdownFile,
  deriveFilename,
  readFileAsText,
  downloadFile
} from '../src/export/file-io';

describe('File IO & Export pure functions (F4)', () => {
  describe('generateHtmlDocument', () => {
    it('creates a complete HTML document with DOCTYPE, meta tags, and content', () => {
      const html = generateHtmlDocument('My Document', '<p>Hello World</p>');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="en">');
      expect(html).toContain('<title>My Document</title>');
      expect(html).toContain('<p>Hello World</p>');
      expect(html).toContain('<style>');
    });

    it('sanitizes title to prevent tag injection in the header', () => {
      const html = generateHtmlDocument('Doc <script>alert(1)</script>', '<p>Safe</p>');
      expect(html).not.toContain('<script>');
      expect(html).toContain('<title>Doc scriptalert(1)/script</title>');
    });

    it('falls back to default title if empty', () => {
      const html = generateHtmlDocument('', '<p>Content</p>');
      expect(html).toContain('<title>Markdown Live Preview Export</title>');
    });
  });

  describe('isMarkdownFile', () => {
    it('returns true for markdown extensions', () => {
      expect(isMarkdownFile({ name: 'notes.md' })).toBe(true);
      expect(isMarkdownFile({ name: 'README.MARKDOWN' })).toBe(true);
      expect(isMarkdownFile({ name: 'guide.mdown' })).toBe(true);
      expect(isMarkdownFile({ name: 'todo.txt' })).toBe(true);
    });

    it('returns true for valid MIME types even with arbitrary names', () => {
      expect(isMarkdownFile({ name: 'blob', type: 'text/markdown' })).toBe(true);
      expect(isMarkdownFile({ name: 'data', type: 'text/plain' })).toBe(true);
    });

    it('returns false for unsupported files', () => {
      expect(isMarkdownFile({ name: 'image.png' })).toBe(false);
      expect(isMarkdownFile({ name: 'script.js' })).toBe(false);
      expect(isMarkdownFile({ name: 'app.exe' })).toBe(false);
      expect(isMarkdownFile({})).toBe(false);
    });
  });

  describe('deriveFilename', () => {
    it('extracts filename from top level heading', () => {
      const markdown = '# Project Documentation\n\nSome text';
      expect(deriveFilename(markdown, 'md')).toBe('project-documentation.md');
      expect(deriveFilename(markdown, 'html')).toBe('project-documentation.html');
    });

    it('removes punctuation and cleans spaces', () => {
      const markdown = '# Hello: World! & Welcome\n\nBody';
      expect(deriveFilename(markdown, 'md')).toBe('hello-world-welcome.md');
    });

    it('falls back to document.ext when no heading is present', () => {
      const markdown = 'Just plain paragraph text without headers';
      expect(deriveFilename(markdown, 'md')).toBe('document.md');
      expect(deriveFilename(markdown, 'html')).toBe('document.html');
    });
  });

  describe('readFileAsText', () => {
    it('reads File content as text', async () => {
      const blob = new Blob(['# Markdown Content'], { type: 'text/markdown' });
      // In jsdom Blob can act as File
      const content = await readFileAsText(blob as unknown as File);
      expect(content).toBe('# Markdown Content');
    });
  });

  describe('downloadFile', () => {
    it('creates an anchor, appends to body, clicks, and cleans up', () => {
      const appendSpy = vi.spyOn(document.body, 'appendChild');
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      downloadFile('# Test Content', 'test.md', 'text/markdown');

      expect(appendSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();

      appendSpy.mockRestore();
      clickSpy.mockRestore();
    });
  });
});
