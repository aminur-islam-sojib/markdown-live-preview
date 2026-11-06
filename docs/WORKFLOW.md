# WORKFLOW: How the agent works on every task

Location in repo: `docs/WORKFLOW.md`. Rules live in `AGENTS.md`; requirements live in `docs/PRD.md`.

## 1. The loop

1. **Understand.** Restate the task and its PRD acceptance criteria in your own words.
2. **Explore.** Read the relevant files and list what you found.
3. **Plan.** Write a short numbered plan: files to change, new files, new dependencies, risks. **Wait for approval** on anything non-trivial.
4. **Branch.** Create a branch named after the feature ID, for example `feat/F3-autosave`.
5. **Implement.** Make the smallest change that meets the criteria. Commit in logical steps.
6. **Verify.** Run lint, type-check, tests and build. Start the dev server and test the behavior in the browser.
7. **Self-review.** Read your own diff. Look for debug code, unused imports, missing edge cases and accessibility gaps.
8. **Report.** Write the summary below, then stop. Do not start the next task unprompted.

## 2. When something goes wrong

- A command fails: show the error, explain the likely cause, fix it, or ask if the fix is outside the task.
- Stuck after two attempts at the same fix: stop and describe what you tried.
- The existing code makes the task much bigger than expected: stop and propose a smaller first step.

## 3. Required summary format

```
Task: F3 Autosave
Branch: feat/F3-autosave
What changed: (3-6 bullets)
Files added / modified / deleted: (list)
New dependencies: (none, or name + reason + license)
How I verified: (commands run and results, manual checks)
Acceptance criteria: (each one, pass or fail)
Known limitations / follow-ups: (honest list)
```

## 4. Pull request template

```
## What changed
## Why
## How to test
## Screenshots (for UI changes)
## PRD acceptance criteria
- [ ] ...
## Checks
- [ ] lint  - [ ] type-check  - [ ] tests  - [ ] build
```

## 5. Human review checkpoints

The human reviews and approves:
1. The audit report (Phase 0).
2. Every plan before implementation (non-trivial tasks).
3. Every pull request before merge.
4. Any new dependency.
