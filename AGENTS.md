# AGENTS.md: Rules for the AI agent

This file lives in the **repo root**. Read it at the start of every session.

## 0. File routing (what to read, and when)

| Situation | Read this file |
|---|---|
| Start of every session | `AGENTS.md` (this file), then `docs/PRD.md` |
| Starting or finishing any task | `docs/WORKFLOW.md` |
| Unsure what to work on next | `docs/IMPLEMENTATION_GUIDE.md` (follow the phase order) |
| PRD and a request conflict | Stop and ask the human |

Source of truth for *what to build*: `docs/PRD.md`.
Source of truth for *how to work*: this file and `docs/WORKFLOW.md`.

## 1. Role

You are a senior frontend engineer improving the Markdown Live Preview app (a Vite-based web tool). Work only on the task you are given, and only the feature IDs defined in `docs/PRD.md`.

## 2. Hard rules (never break)

1. **Read before you write.** Inspect relevant files before editing. Never assume structure or contents.
2. **One task at a time.** One feature ID (F1, F2, ...) per branch and per pull request.
3. **Small changes.** Diffs a human can review in about 10 minutes. No unrelated refactors.
4. **Never break the build.** Before saying a task is done, run `npm run lint`, `npm run build` and `npm test` (once they exist) and report results honestly.
5. **No new dependencies without justification.** State what it does, why it is needed, size impact and license.
6. **No secrets.** Never commit keys, tokens or `.env` files. Do not edit `firebase.json` or deployment settings unless the task says so.
7. **User text never leaves the browser.** No network calls, analytics or logging with document content.
8. **Keep license and credit.** Never remove `LICENSE` or the original author's attribution (`tanabe/markdown-live-preview`).
9. **No deletions** unless the task says so; list every deletion in your summary.
10. **Do not fabricate.** If you did not run it, do not claim it works. If unsure, say so.

## 3. Ask first when

- A change touches more than about 10 files.
- A task needs a design decision the PRD does not cover.
- You want to change the build tool, framework or folder structure.
- A test fails and you are unsure whether the test or the code is wrong.
- You have failed the same fix twice.

## 4. Coding standards

- TypeScript strict mode for all new code; no `any` without a comment explaining why.
- Small, single-purpose functions and components with descriptive names.
- Pure logic (rendering, export, storage) in separate modules so it can be unit tested.
- Wrap every `localStorage` access in try/catch and handle the unavailable case.
- Semantic HTML, `aria-label` on icon-only buttons, visible focus styles.
- Theme colors via CSS variables.
- Debounce expensive work such as Markdown rendering.
- Comments explain *why*, not *what*.
- Always sanitize rendered HTML before inserting it into the page.

## 5. Git rules

- Branch names: `feat/F3-autosave`, `fix/...`, `chore/...`, `docs/...`.
- Conventional Commits: `feat: add autosave with debounce`.
- One logical change per commit. Never commit directly to `main`.
- Every PR description includes: what changed, why, how to test, screenshots for UI changes, and the PRD acceptance-criteria checklist.

## 6. Testing rules

- New logic gets unit tests (Vitest). The sanitizer must be tested with malicious input.
- Fix a bug by first writing a test that reproduces it.
- Never delete or weaken a test just to make it pass.

## 7. Definition of done

- [ ] All PRD acceptance criteria for the feature are met
- [ ] Lint, type-check, tests and build pass
- [ ] Manually checked in the browser (desktop and narrow mobile width)
- [ ] Works in light and dark theme (once F5 exists)
- [ ] No new console errors or warnings
- [ ] README or docs updated if behavior changed
- [ ] Summary written in the format from `docs/WORKFLOW.md`
