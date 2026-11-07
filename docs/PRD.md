# PRD: Markdown Live Preview

Location in repo: `docs/PRD.md`. This is the source of truth for what to build.

## 1. Overview

Markdown Live Preview is a small, fast web tool: type Markdown on one side, see the rendered result on the other. The repo is Vite-based (Makefile scripts, Firebase hosting config) and appears derived from the MIT-licensed `tanabe/markdown-live-preview`. Goal: turn it into a polished, differentiated product and a strong portfolio piece.

## 2. Problem

The repo has an unfinished description, a README copied from the original, and basic preview only. Users who write notes, READMEs and docs also want saving, exporting, theming and extended Markdown.

## 3. Goals

- Make the project clearly the owner's: new features, new README, proper credit to the original.
- Make writing safe and convenient: autosave, import, export.
- Support the Markdown people actually use: GFM tables, task lists, code highlighting, math, diagrams.
- Be secure: all rendered output is sanitized.
- Be fast, accessible and mobile friendly.
- Maintainable code: TypeScript, lint, tests, CI.

## 4. Non-goals (do NOT build)

- Accounts, login or a backend database.
- Real-time multi-user collaboration.
- AI features.
- Anything that sends user text to a server.

## 5. Target users

- Developers writing READMEs and docs.
- Students taking notes in Markdown.
- Writers who want a distraction-free editor with preview.

## 6. Feature requirements

Priorities: P0 = must, P1 = should, P2 = nice to have.

| ID | Pri | Feature | Acceptance criteria |
|---|---|---|---|
| F1 | P0 | Repo hygiene | Complete About text and topics; new README with screenshot, live demo link, features, setup, credit to original author; LICENSE retained |
| F2 | P0 | HTML sanitization | Rendered output passes through a sanitizer; tests prove `<script>` and `onerror=` payloads are removed |
| F3 | P0 | Autosave | Saved to localStorage after a debounce; restored on reload; works when storage is unavailable |
| F4 | P0 | Export / import | Export `.md` and `.html`; open or drag-and-drop a `.md` file |
| F5 | P1 | Dark/light theme | Follows system preference; manual toggle; choice persisted |
| F6 | P1 | Extended Markdown | GFM tables and task lists; syntax-highlighted code blocks |
| F7 | P1 | Toolbar and shortcuts | Bold, italic, link, code, list, heading buttons; Ctrl/Cmd+B and Ctrl/Cmd+I |
| F8 | P1 | Layout | Resizable split pane on desktop; Edit/Preview toggle on mobile |
| F9 | P1 | Synced scrolling | Panes stay roughly aligned; can be turned off |
| F10 | P1 | Stats | Live word, character and reading-time count |
| F11 | P2 | Math and diagrams | KaTeX math; Mermaid diagrams |
| F12 | P2 | Shareable link | Document encoded in the URL hash; size limit shown to user |
| F13 | P2 | PWA | Installable and works offline |
| F14 | P2 | PDF export | Print-friendly stylesheet via browser print |

## 7. Non-functional requirements

- **Performance:** instant typing on a 5,000-line document; debounced rendering; Lighthouse Performance 90+.
- **Accessibility:** keyboard operable, visible focus, labelled controls, WCAG AA contrast; Lighthouse Accessibility 95+.
- **Security:** no unsanitized HTML; no secrets in repo; `npm audit` reviewed.
- **Privacy:** no analytics or network calls with user content.
- **Browsers:** latest Chrome, Firefox, Safari, Edge; mobile Safari and Chrome.
- **Code quality:** TypeScript strict, ESLint and Prettier clean, CI green.

## 8. Success metrics

- All P0 and P1 features shipped and acceptance criteria met.
- CI passes (lint, type-check, test, build) on every push.
- Lighthouse targets met.
- README has a live demo and screenshots.

## 9. Risks

| Risk | Mitigation |
|---|---|
| Licensing or credit problems | Keep MIT LICENSE and original attribution; credit in README |
| XSS from rendered Markdown | Do F2 first and test it |
| Agent changes too much at once | Rules in `AGENTS.md`: one feature per branch, small diffs |
| TypeScript migration breaks app | Separate phase, build green after each commit |
| Unknown code quality | Phase 0 audit before any change |
