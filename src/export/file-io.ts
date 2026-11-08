/**
 * Pure logic and browser helpers for file export and import.
 */

/**
 * Creates a standalone, self-contained HTML document string with proper
 * DOCTYPE, meta tags, and rendered markdown content.
 */
export function generateHtmlDocument(title: string, bodyHtml: string): string {
  const safeTitle = title.replace(/[<>&"']/g, '');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle || 'Markdown Live Preview Export'}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #24292f;
      background-color: #ffffff;
      max-width: 900px;
      margin: 0 auto;
      padding: 32px 16px;
    }
    pre {
      background-color: #f6f8fa;
      padding: 16px;
      border-radius: 6px;
      overflow-x: auto;
    }
    code {
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
      font-size: 85%;
      background-color: rgba(175, 184, 193, 0.2);
      padding: 0.2em 0.4em;
      border-radius: 4px;
    }
    pre code {
      background-color: transparent;
      padding: 0;
    }
    blockquote {
      border-left: 0.25em solid #d0d7de;
      color: #57606a;
      padding: 0 1em;
      margin: 0;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 16px 0;
    }
    th, td {
      border: 1px solid #d0d7de;
      padding: 6px 13px;
    }
    tr:nth-child(2n) {
      background-color: #f6f8fa;
    }
    img {
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body class="markdown-body">
${bodyHtml}
</body>
</html>`;
}

/**
 * Validates whether a given file is a Markdown or plaintext file.
 */
export function isMarkdownFile(file: { name?: string; type?: string }): boolean {
  if (!file || !file.name) return false;
  const lowerName = file.name.toLowerCase();
  const validExtensions = ['.md', '.markdown', '.mdown', '.mkd', '.txt'];
  const hasValidExt = validExtensions.some(ext => lowerName.endsWith(ext));
  const validMimeTypes = ['text/markdown', 'text/x-markdown', 'text/plain'];
  const hasValidMime = file.type ? validMimeTypes.includes(file.type.toLowerCase()) : false;

  return hasValidExt || hasValidMime;
}

/**
 * Safely reads a File object as UTF-8 text.
 */
export async function readFileAsText(file: File): Promise<string> {
  if (typeof file.text === 'function') {
    return await file.text();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsText(file, 'utf-8');
  });
}

/**
 * Triggers a browser download of a given string payload as a file.
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Derives a sanitized document filename from the first header or content.
 */
export function deriveFilename(markdown: string, extension: 'md' | 'html'): string {
  const match = markdown.match(/^#\s+(.+)$/m);
  let baseName = 'document';
  if (match && match[1]) {
    baseName = match[1]
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 40);
  }
  return `${baseName || 'document'}.${extension}`;
}
