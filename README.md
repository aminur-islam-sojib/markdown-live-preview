# Markview

<p align="center">
  <img src="public/image/markview.png" alt="Markview Logo" width="80" height="80" style="border-radius: 16px;" />
</p>

<p align="center">
  <strong>A modern, privacy-first live Markdown editor & workspace in the browser.</strong><br />
  Featuring Monaco Editor, anchor-based synchronized scrolling, native Mermaid diagrams, local & cloud notes, and one-click exports.
</p>

<p align="center">
  <a href="https://github.com/aminur-islam-sojib/markdown-live-preview/actions"><img src="https://img.shields.io/badge/Tests-63%20Passing-brightgreen.svg" alt="Tests Status" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
  <img src="https://img.shields.io/badge/Privacy-100%25%20Client--First-success.svg" alt="Privacy First" />
  <img src="https://img.shields.io/badge/React-19-61dafb.svg" alt="React 19" />
  <img src="https://img.shields.io/badge/Tailwind-v4-38bdf8.svg" alt="Tailwind CSS v4" />
</p>

---

## ✨ Key Features

- **Unified 44px Pro Header**: Ergonomic, distraction-free single toolbar maximizing canvas workspace.
- **Split-Pane Live Editing**: Full VS Code editing power with [Monaco Editor](https://microsoft.github.io/monaco-editor/) on the left, live GitHub-Flavored Markdown preview on the right.
- **Anchor-Based Bidirectional Sync Scroll**:
  - Headings, code blocks, tables, and Mermaid diagrams remain tightly synchronized between editor and preview.
  - Zero-lag bidirectional scrolling with event echo guards and `requestAnimationFrame`.
  - Immediate alignment toggle (`Sync On` / `Sync Off`) with active visual status indicator.
- **Native Mermaid Diagrams**: Live rendering of flowcharts, sequence diagrams, state diagrams, and entity-relationship charts.
- **Local Notes Library & Drawer**:
  - Slide-out library drawer (`Ctrl+O`) with search, tags, sorting, and pin/favorite support.
  - Fully functional offline without requiring an account.
- **Optional Cloud Sync (Supabase)**:
  - Sign in with Email / Magic Link or OAuth (GitHub, Google) to sync notes across devices.
  - State-aware Save button with quick note details, tags, and cloud status popover.
- **Export & Import**:
  - Export document to raw Markdown (`.md`), styled HTML (`.html`), or print-ready PDF (`.pdf`).
  - Open `.md` files via file picker or drag-and-drop onto the workspace.
- **XSS Protection & Sanitization**: Strict HTML sanitization via DOMPurify blocking script injection and dangerous attributes.
- **Dark & Light Mode**: Seamless theme switching with system preference detection and smooth transitions.
- **Privacy First**: Your notes remain strictly on your device unless you choose to authenticate and sync to your private cloud library.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + S` / `Cmd + S` | Save note (local browser storage or Supabase Cloud) |
| `Ctrl + O` | Toggle slide-out Notes Library |
| `Ctrl + B` | Format selection as **Bold** (`**text**`) |
| `Ctrl + I` | Format selection as *Italic* (`*text*`) |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18+)
- `npm` (version 9+)

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/aminur-islam-sojib/markdown-live-preview.git
cd markdown-live-preview
npm install
```

### Local Development

Start the development server:

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🧪 Testing & Quality Assurance

Run the automated Vitest suite (8 test suites, 63 unit tests):

```bash
npm test
```

Run TypeScript strict type checking:

```bash
npm run type-check
```

Build production bundle:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

---

## 📂 Architecture & Directory Structure

```text
src/
├── components/          # React UI components
│   ├── Header.tsx       # Unified 44px Pro Header with tab strip and view tools
│   ├── EditorPane.tsx   # Monaco Editor integration with ref-stabilized listeners
│   ├── PreviewPane.tsx  # Marked + DOMPurify + Mermaid with data-line anchors
│   ├── NotesDrawer.tsx  # Slide-out notes library with search, tags, and filters
│   ├── AuthModal.tsx    # Supabase authentication modal (Email, GitHub, Google)
│   ├── SaveNoteModal.tsx# Note metadata editor (Title, Description, Tags)
│   ├── MyNotesModal.tsx # Dual-pane cloud notes browser
│   ├── Footer.tsx       # Status bar with Tanabe attribution & stats
│   └── Toast.tsx        # Spring-animated toast notification system
├── export/
│   └── file-io.ts       # Export (.md, .html, .pdf) & file reader utilities
├── parser/
│   └── sanitizer.ts     # DOMPurify security configuration & safe SVG support
├── storage/
│   ├── autosave.ts      # Debounced local persistence with fallback
│   └── local-notes.ts   # Browser-local note management & indexing
├── supabase/
│   ├── client.ts        # Supabase client initialization
│   ├── auth.ts          # Auth state subscriptions & sign in/out
│   └── documents.ts     # Cloud document CRUD operations
├── utils/
│   └── sync-scroll.ts   # Piecewise linear anchor interpolation for sync scroll
├── types.ts             # TypeScript definitions & data models
├── App.tsx              # Application state coordinator & workspace layout
└── main.tsx             # Application bootstrap & DOM entry point
tests/
├── sync-scroll.test.ts  # Anchor extraction & interpolation test suite
├── sanitizer.test.ts    # XSS injection defense and security tests
├── autosave.test.ts     # Debounce, persistence, and storage tests
├── file-io.test.ts      # Export document generation tests
├── local-notes.test.ts  # Local note CRUD and search tests
├── animation.test.ts    # Physics & spring timing tests
├── supabase.test.ts     # Supabase auth & client tests
└── smoke.test.ts        # Tooling and DOM smoke tests
```

---

## 🔒 Security & Privacy

- **Client-First Architecture**: Parsing, previewing, and diagram generation occur 100% on your machine.
- **Strict Content Sanitization**: DOMPurify sanitizes all parsed markdown HTML, preventing script execution, malicious event handlers, and unsafe protocols.
- **Zero Document Tracking**: No analytics, telemetry, or user documents are sent to any remote server without explicit user authentication.

---

## 📄 Credits & Attribution

Developed and maintained by [Aminur Islam Sojib](https://github.com/aminur-islam-sojib/markdown-live-preview).  
Derived from the open-source project created by [Hideaki Tanabe (@tanabe)](https://github.com/tanabe/markdown-live-preview). We gratefully preserve the original author's work, attribution, and license.

---

## 📜 License

This project is open-source software licensed under the [MIT License](LICENSE).
