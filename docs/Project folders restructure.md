# Project Folders Restructure — What Changed and Why

This document records the folder/repo restructuring and CI/CD groundwork done on 2026-07-07, for future reference. See [FolderRestructure.md](FolderRestructure.md) for the original plan and reasoning; this file records what was actually done.

## 1. Stopped tracking non-source bloat (files kept on disk, just untracked)

`.gitignore` was updated to stop tracking, and `git rm --cached` was used to untrack (not delete):

- `Counselling_App_Images/` (~91 MB of design mockup PNGs/SVGs — not referenced anywhere in `src/`)
- `dev-dist/` (a Vite PWA **build artifact** — should never have been committed, same category as `dist/`)
- `Design Context.zip`
- `backend_login_response.json`
- `Full backend and frontend prompt.txt`
- `Roles & Responsibilities.txt`
- `default_shadcn_theme.css`
- `database_backups/*.sql`, `database_backups/*.sql.enc`, `database_backups/*.dump` (raw DB dumps — the `.md`/`.txt` *reports* describing these backups were moved to `docs/database/`, see below, and remain tracked)

**Important**: this only stops *future* tracking. The existing git history still contains every prior commit of these files — `.git` doesn't shrink from this change alone. Reclaiming that space would require a `git filter-repo` history rewrite, which was deliberately **not done** (it rewrites commit SHAs and requires everyone with a clone to re-clone/reset — out of scope for this pass).

## 2. Documentation reorganized into `docs/` (moved with `git mv`, history preserved)

Root previously had 15+ scattered `.md` files, plus `Plans/`, `guidelines/`, and doc-like files mixed into `database_backups/`. Consolidated into:

```
docs/
  design/     BRAND_GUIDELINES.md, DESIGN_SYSTEM_GUIDE.md, DESIGN_TOKENS_REFERENCE.md,
              TOKENS_ARCHITECTURE.md, LAYOUT_GUIDELINES.md, ACCESSIBILITY_GUIDELINES.md,
              ATTRIBUTIONS.md, COMPONENT_INVENTORY.md, Guidelines.md (from guidelines/)
  plans/      all 8 files formerly in Plans/ (both .md and .txt)
  security/   SECURITY_FIXES.md, SECURITY_FIXES_APPLIED.md
  business/   PITCH_DECK_PACKAGE.md, IMPLEMENTATION_BLUEPRINT.md (already under docs/, just grouped)
  database/   README.md, database_compare_final_recommendation.md, important_table_summary.md,
              migration_comparison_report.md, schema_diff_report.md, schema_diff.patch,
              sql_risk_report.md, table_row_count_comparison.md, artisan_migrate_status.txt
              (moved out of database_backups/ so they stay tracked even though the raw
              .sql/.sql.enc dumps next to them are now gitignored — see §1)
  archive/    CODEX_HANDOFF_INSTRUCTIONS.md
  deploy/     DEPLOY_HOSTINGER.md, MOBILE_DEV_SETUP.md, DEMO_RUNBOOK.md (pre-existing, unchanged)
  FolderRestructure.md          (the original plan for this work)
  Project folders restructure.md  (this file)
```

Root now only keeps `README.md`, `CHANGELOG.md`, `ROADMAP.md`, `CLAUDE.md` (the last one must stay at repo root — Claude Code and other tooling look for it there specifically).

The now-empty `Plans/` and `guidelines/` directories were removed. `design_context/` (raw design-token JSON exports, ~5 MB) was deliberately left alone — it wasn't part of this markdown cleanup and wasn't flagged as clutter.

Checked for broken links: no markdown files contained actual `[text](path)` hyperlinks to any of the moved files. A few plain-text filename mentions exist in `ROADMAP.md`'s changelog and the archived `CODEX_HANDOFF_INSTRUCTIONS.md` (historical prose, not live links) — left as-is.

## 3. New files created

| File | Purpose |
|---|---|
| `.dockerignore` (root) | Keeps local `docker compose build` context small — excludes `node_modules`, `dist`, `Counselling_App_Images`, `database_backups`, `docs`, `android`, etc. |
| `backend/.dockerignore` | Same purpose for the Laravel image build — excludes `vendor`, `node_modules`, `storage/logs`, `tests`, `.env`. |
| `tsconfig.json` (root) | The codebase is TypeScript (`.tsx`) but had **no tsconfig at all** — `vite build` was transpiling per-file via esbuild without ever type-checking. Added a standard Vite + React 18 config (`moduleResolution: bundler`, `@/*` path alias matching `vite.config.ts`, `strict: true`). |
| `.github/workflows/frontend-ci.yml` | Runs on push/PR to `main`, path-filtered to frontend source paths. Steps: `npm ci` → `npm run typecheck` (non-blocking) → `npm run build`. |
| `.github/workflows/backend-ci.yml` | Runs on push/PR to `main`, path-filtered to `backend/**`. Steps: PHP 8.3 setup → `composer install` → `composer test`. No DB service container needed — `backend/phpunit.xml` already forces sqlite in-memory for the testing env. |
| `.github/workflows/deploy-hostinger.yml` | Triggered after `frontend-ci`/`backend-ci` succeed on `main`. Builds and FTP-deploys the frontend `dist/` (+ `deploy/wellness/.htaccess`) to `public_html/wellness/`, and the backend (with `vendor/` pre-built via `composer install --no-dev`) to `public_html/api-wellness/`. The post-deploy `artisan migrate/config:cache/route:cache/storage:link` SSH step is gated behind a `HOSTINGER_SSH_ENABLED` repo variable (off by default) until SSH access on the Hostinger plan is confirmed. |
| `docs/FolderRestructure.md` | The original CI/CD enablement plan (context, verdict on folder structure, decisions made). |
| `docs/Project folders restructure.md` | This file. |

## 4. Files modified

- `.gitignore` — added the exclusions from §1.
- `package.json` — added `"typecheck": "tsc --noEmit"` script.

## 5. Code fix required to make typechecking possible

`src/app/routes/routeConfig.ts` contained JSX but had a `.ts` extension, which is a hard parse error for `tsc` (`.ts` files can't contain JSX, only `.tsx` can). This file is dead code — not imported anywhere in `src/` (routing is handled directly by `src/app/routes/AppRoutes.tsx` per `CLAUDE.md`) — so it was renamed to `routeConfig.tsx` via `git mv`. This was necessary just to get `tsc` to run at all; no logic was changed.

## 6. Baseline established, not fixed

Running `npm run typecheck` after the above fix surfaces **20 pre-existing type errors** in application code (e.g. missing `@types/react-dom`, a real bug at `src/app/features/trainer/trainerApplicationsApi.ts:357` referencing an undefined `createHistoryItem`, a few library-version mismatches with `recharts`/`zod`). These were deliberately **left unfixed** — that's app-code cleanup, separate from this CI/CD/folder-structure task — and `frontend-ci.yml` runs typecheck as `continue-on-error: true` so it doesn't block builds. Triaging and fixing these is a good next task, and once done the CI step can be flipped to blocking.

## 7. Verified before commit

- `npm run build` — succeeds (pre-existing chunk-size warnings only, unrelated).
- Backend test suite — ran via the project's own `docker compose exec app php artisan test` (PHP 8.3, matching `docker/php/Dockerfile` and what `backend-ci.yml` uses) since the local machine has PHP 8.2: **112/112 tests passed**.

## 8. Still needed before `deploy-hostinger.yml` can actually run

- GitHub repo secrets: `HOSTINGER_FTP_HOST`, `HOSTINGER_FTP_USER`, `HOSTINGER_FTP_PASSWORD`.
- GitHub repo variable: `VITE_API_URL` (production API URL).
- Confirm whether Hostinger SSH/terminal access is available on the plan; if so, set `HOSTINGER_SSH_ENABLED=true` and add `HOSTINGER_SSH_HOST`/`HOSTINGER_SSH_USER`/`HOSTINGER_SSH_KEY` secrets to enable the automated `artisan migrate`/`config:cache` step.
