# Markdown Live Preview

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-Passing-brightgreen.svg)]()
[![Privacy](https://img.shields.io/badge/Privacy-100%25%20Client--Side-success.svg)]()

> A fast, secure, distraction-free online Markdown editor with live preview in the browser.

[**Live Demo »**](https://markdownlivepreview.com/)

![Markdown Live Preview Screenshot](public/image/sample.webp)

---

## ✨ Features

- **Split-Pane Live Preview**: Full-featured VS Code-powered editing experience via Monaco Editor on the left, live rendered GitHub-flavored Markdown on the right.
- **Debounced Autosave & Resilience**: Document drafts automatically save to `localStorage` with a 300ms debounce and immediate flush on tab close. Works seamlessly with in-memory fallback if storage is disabled or quota is exceeded.
- **Export & Import**:
  - Export document as raw Markdown (`.md`)
  - Export as standalone, formatted HTML (`.html`)
  - Export to PDF with optimized print stylesheets
  - Open files via file picker or **drag-and-drop** directly onto the editor
- **Mermaid Diagrams**: Native rendering for flowcharts, sequence diagrams, state machines, and class diagrams (` ```mermaid `).
- **Security & XSS Protection**: All rendered output is strictly sanitized via DOMPurify to strip `<script>`, `onerror=`, and malicious attack vectors.
- **Dark & Light Mode**: Toggle between light and dimmed dark themes matching GitHub's preview styling.
- **Synced Scrolling**: Synchronized scrolling between editor and preview panes.
- **100% Private**: User text never leaves your browser. No backend databases, no server processing, no third-party document tracking.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18+)
- `npm` (version 9+)

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/tanabe/markdown-live-preview.git
cd markdown-live-preview
npm install
```

*(Alternatively, run `make setup`)*

### Local Development

Start the Vite development server:

```bash
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 🧪 Testing & Code Quality

Run automated unit tests (powered by Vitest and JSDOM):

```bash
npm test
```

Run TypeScript strict type checking:

```bash
npm run type-check
```

Build production distribution assets:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

---

## 📂 Project Architecture

```text
src/
├── parser/
│   └── sanitizer.ts       # DOMPurify security configuration and sanitization
├── storage/
│   └── autosave.ts        # Debounced storage manager with memory fallback
├── export/
│   └── file-io.ts         # Export .md/.html, drag-and-drop, and file utilities
└── main.js                # Application initialization and UI bindings
tests/
├── sanitizer.test.ts      # XSS injection defense and security test suite
├── autosave.test.ts       # Debounce, quota error handling, and persistence tests
├── file-io.test.ts        # Export document generation and file reader tests
└── smoke.test.ts          # Environment and DOM smoke tests
```

---

## 🔒 Privacy & Security

Your documents belong to you:
- All Markdown parsing and diagram rendering occurs entirely on your device.
- Document content is stored strictly in your browser's local storage and is never transmitted over any network.
- Rendered HTML is checked against an XSS test suite preventing arbitrary code execution.

---

## 📄 Credits & Attribution

This project is derived from the open-source repository created by [Hideaki Tanabe (@tanabe)](https://github.com/tanabe/markdown-live-preview). We gratefully acknowledge and preserve the original work and attribution.

## 📜 License

This project is open-source software licensed under the [MIT License](LICENSE).
