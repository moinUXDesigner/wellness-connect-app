# CI/CD Enablement Plan — WellnessConnect (GitHub Actions → Hostinger)

## Context

The user asked whether the repo's folder structure needs reorganizing for better CI/CD deployment. A full survey (structure + Docker + docs) found:

- **No CI/CD exists today at all** — no `.github/workflows/`, no other CI config, no deploy automation. Deploys are 100% manual: build locally, FTP the output to Hostinger shared hosting (per `docs/DEPLOY_HOSTINGER.md`).
- **Both halves deploy to the same Hostinger shared-hosting account**, as two subdomains: frontend → `public_html/wellness/` (static `dist/` + `deploy/wellness/.htaccess`), backend → `public_html/api-wellness/` (Laravel tree, doc root `public_html/api-wellness/public`). `docker-compose.yml`/`docker/php/Dockerfile` are **local-dev-only** — there is no Docker in the documented production path.
- **Backend tests are already CI-ready with zero extra setup**: `backend/phpunit.xml` forces `DB_CONNECTION=sqlite`, `DB_DATABASE=:memory:` for the testing env, so `composer test` runs standalone — no DB service container needed in CI.
- **Frontend has no lint/typecheck/test script**, and critically **no `tsconfig.json` exists anywhere** despite the codebase being `.tsx`/TypeScript — `vite build` transpiles per-file via esbuild without ever type-checking. `npm run build` passing today says nothing about type correctness.
- **The repo is bloated with tracked non-source content** that slows every checkout/build context: `Counselling_App_Images/` (~91 MB, tracked), `database_backups/*.sql.enc` (tracked), `dev-dist/` (a **build artifact**, tracked — should never have been tracked), `Design Context.zip`, `backend_login_response.json`, stray prompt `.txt` files, `default_shadcn_theme.css`. `.git` is already ~108 MB.
- No `.dockerignore` exists at root or in `backend/`.

The user confirmed, in order:
1. Hostinger shared hosting is the real, intended production target for both halves (not a Docker VPS) — **and they explicitly want GitHub Actions to build and deploy to Hostinger on trigger** as their CI/CD plan.
2. Add TypeScript checking using whatever is generally recommended for this kind of project — i.e. add `tsconfig.json` + a `typecheck` script, run it in CI as **advisory/non-blocking** first (since the codebase has never been type-checked, it likely has pre-existing errors that need triage before the gate can be made blocking).
3. Do the repo cleanup: stop tracking the bloat, `.gitignore` it, no git-history rewrite.
4. Skip Android/Capacitor CI for now.

**Verdict on the original question**: the folder structure itself (frontend at root, `backend/` subdir, each with its own independent toolchain) is fine for CI/CD and does not need reorganizing — GitHub Actions supports path-filtered triggers natively, so two independent workflows can each fire only on their half. Restructuring into `packages/frontend` + `packages/backend` or adopting a monorepo tool (Nx/Turborepo) would only be justified if the two halves shared code or needed cross-package incremental builds — they don't (npm vs composer, no shared code). The `pnpm-workspace.yaml` (`packages: - '.'`) is inert dead weight, harmless to leave or delete. The actual blockers are automation gaps, not structure — this plan fixes those.

## Future-proofing: switching to a VPS + Docker later

This plan is intentionally structured so a later move to a Docker-capable VPS is a swap, not a rebuild:
- The folder structure (`backend/` as-is) doesn't change either way — `docker-compose.yml` and `docker/php/Dockerfile` already exist and work for local dev today, and are the same artifacts a VPS deploy would use in prod.
- CI (test/build) is kept separate from deploy on purpose: `frontend-ci.yml`/`backend-ci.yml` stay identical regardless of hosting target.
- Only the deploy workflow changes: `deploy-hostinger.yml` (FTP/SFTP upload) would be replaced by a `deploy-docker.yml` (build image from `docker/php/Dockerfile` → push to GHCR/Docker Hub → SSH `docker compose pull && up -d`, or a managed platform).
- The one real gap to close at that point: `docker/nginx/default.conf` is currently a local-dev-only config and would need to become a real prod-facing config (TLS/domain) — expected work regardless of starting point, not caused by this plan.

## Implementation Steps

### 1. Repo cleanup (untrack bloat, no history rewrite)
- Add to root `.gitignore`: `Counselling_App_Images/`, `dev-dist/`, `Design Context.zip`, `backend_login_response.json`, `Full backend and frontend prompt.txt`, `Roles & Responsibilities.txt`, `default_shadcn_theme.css`.
- For `database_backups/`: don't blanket-ignore the whole folder (it contains both raw dumps and useful `.md` reports — see step 1b). Instead ignore just the raw dump files: `database_backups/*.sql`, `database_backups/*.sql.enc`, `database_backups/*.dump`.
- `git rm -r --cached` the ignored paths (keeps them on disk, stops future tracking).
- Leaves `.git` history size alone (that's a separate, higher-risk `git filter-repo` operation, not part of this plan) but stops the bleeding going forward and shrinks future checkouts.

### 1b. Documentation reorganization (`git mv`, preserves history)
30+ tracked `.md` files are currently scattered across root, `Plans/`, `guidelines/`, `docs/`, and `database_backups/`. Consolidate into a single `docs/` hierarchy:
```
docs/
  design/       BRAND_GUIDELINES.md, DESIGN_SYSTEM_GUIDE.md, DESIGN_TOKENS_REFERENCE.md,
                TOKENS_ARCHITECTURE.md, LAYOUT_GUIDELINES.md, ACCESSIBILITY_GUIDELINES.md,
                ATTRIBUTIONS.md, COMPONENT_INVENTORY.md, Guidelines.md (from guidelines/)
  plans/        everything currently in Plans/*.md
  deploy/       DEPLOY_HOSTINGER.md, MOBILE_DEV_SETUP.md, DEMO_RUNBOOK.md (already in docs/, just grouped)
  security/     SECURITY_FIXES.md, SECURITY_FIXES_APPLIED.md
  business/     PITCH_DECK_PACKAGE.md, IMPLEMENTATION_BLUEPRINT.md
  database/     the *.md reports from database_backups/ (schema_diff_report.md, sql_risk_report.md, etc.)
                — moved here specifically so they stay tracked/reviewable even though the raw
                  .sql/.sql.enc dumps next to them get gitignored per step 1
  archive/      CODEX_HANDOFF_INSTRUCTIONS.md
```
- Root keeps only: `README.md`, `CHANGELOG.md`, `ROADMAP.md`, `CLAUDE.md` (must stay at repo root — Claude Code and other tooling look for it there specifically).
- Use `git mv` (not delete+recreate) for every move so file history/blame is preserved.
- After moving, grep the repo for any relative links between these docs (e.g. `Plans/` or `guidelines/` references from README/CLAUDE.md) and update them.
- `Plans/`, `guidelines/`, `design_context/` directories become empty and can be removed once their contents are moved (confirm `design_context/` isn't holding non-.md assets still in use before removing it — check separately, it wasn't part of the .md audit).

### 2. Add `.dockerignore` (hygiene for local dev Docker Compose builds)
- Root `.dockerignore`: `node_modules`, `dist`, `dev-dist`, `.git`, `Counselling_App_Images`, `database_backups`, `*.zip`, `docs`, `Plans`, `android`, `.claude`, `.codex`, `.agents`.
- `backend/.dockerignore`: `vendor`, `node_modules`, `storage/logs`, `storage/framework/cache`, `tests`, `.env`.

### 3. TypeScript checking (advisory first)
- Add `tsconfig.json` at root (standard Vite + React 18 + `@` path alias config matching existing `vite.config.ts` alias).
- Add `"typecheck": "tsc --noEmit"` to root `package.json` scripts.
- Wire into CI as a non-blocking step initially (`continue-on-error: true`), so existing type errors surface without breaking builds; can be flipped to blocking later once triaged.

### 4. `.github/workflows/frontend-ci.yml`
Path-filtered (allow-list, since root has lots of unrelated clutter) to `src/**`, `public/**`, `index.html`, `vite.config.ts`, `postcss.config.mjs`, `capacitor.config.ts`, `package.json`, `package-lock.json`, `tsconfig*.json`. Runs on PRs and pushes to `main`:
```yaml
- actions/checkout
- actions/setup-node (v20, npm cache)
- npm ci
- npm run typecheck   (continue-on-error: true)
- npm run build
```

### 5. `.github/workflows/backend-ci.yml`
Path-filtered to `backend/**`. Runs on PRs and pushes to `main`:
```yaml
- actions/checkout
- shivammathur/setup-php (8.3, sqlite/mbstring/zip/gd extensions)
- composer install --no-interaction --prefer-dist
- cp .env.example .env && php artisan key:generate
- composer test
```
No DB service container required (sqlite in-memory per `phpunit.xml`).

### 6. `.github/workflows/deploy-hostinger.yml` (or two workflows: `deploy-frontend.yml` + `deploy-backend.yml`)
Triggered on push to `main` (after CI passes — either as a second job gated on the CI job succeeding, or as `workflow_run` triggered by the CI workflows completing successfully). Two jobs:

- **Frontend deploy job** (path-filtered to frontend paths):
  - `npm ci`
  - `npm run build` with `VITE_API_URL=https://api-wellness.khajamynuddin.com/api/v1` and `VITE_DEMO_MODE=false` injected from repo/environment secrets.
  - Upload `dist/**` plus `deploy/wellness/.htaccess` to `public_html/wellness/` via an FTP/SFTP deploy action (e.g. `SamKirkland/FTP-Deploy-Action`), using Hostinger FTP/SFTP credentials stored as GitHub Actions secrets (`HOSTINGER_FTP_HOST`, `HOSTINGER_FTP_USER`, `HOSTINGER_FTP_PASSWORD`).

- **Backend deploy job** (path-filtered to `backend/**`):
  - `composer install --no-dev --optimize-autoloader` on the CI runner (PHP 8.3, matching Hostinger) so `vendor/` ships pre-built.
  - Upload the backend tree (excluding `.env`, `tests`, `node_modules` — reuse `backend/.dockerignore`-style exclude list) via SFTP to `public_html/api-wellness/`.
  - If Hostinger SSH/terminal access is available (needs confirming — the docs say "if available"): an SSH step (`appleboy/ssh-action`) runs `php artisan migrate --force`, `config:cache`, `route:cache`, `storage:link` per `docs/DEPLOY_HOSTINGER.md`. If SSH is not available on the current Hostinger plan, these stay manual steps documented in `docs/DEPLOY_HOSTINGER.md` (flag this as a follow-up to confirm with the user before wiring the SSH step, since it needs SSH key/credentials as secrets either way).
  - The production `backend/.env` on the server is managed independently (not overwritten by deploy) — it's a one-time manual setup from `.env.production.example` per existing docs.

### Secrets/config needed (to be added in GitHub repo settings, not part of code changes)
- `HOSTINGER_FTP_HOST` / `HOSTINGER_FTP_USER` / `HOSTINGER_FTP_PASSWORD` (or SSH key if using SFTP-over-SSH/SSH deploy).
- `VITE_API_URL` (prod value, can be a plain repo variable, not a secret).
- Optionally `HOSTINGER_SSH_HOST`/`HOSTINGER_SSH_USER`/`HOSTINGER_SSH_KEY` if terminal access is confirmed available.

### Files to add/change
- `.gitignore` (edit — add bloat exclusions)
- `.dockerignore` (new, root)
- `backend/.dockerignore` (new)
- `tsconfig.json` (new, root)
- `package.json` (edit — add `typecheck` script)
- `.github/workflows/frontend-ci.yml` (new)
- `.github/workflows/backend-ci.yml` (new)
- `.github/workflows/deploy-hostinger.yml` (new, or split into `deploy-frontend.yml`/`deploy-backend.yml`)

## Verification
- After adding workflows, push to a branch/PR and confirm `frontend-ci` and `backend-ci` trigger correctly and only for their respective path changes (test by touching a file in `src/` vs `backend/` vs an unrelated root doc).
- Confirm `npm run typecheck` runs locally and review how many pre-existing errors surface (informs whether/when to make it blocking).
- Confirm `composer test` still passes unchanged (no behavior change, just running it in CI).
- For the deploy workflow: dry-run against a staging/test path if possible before pointing at the real `public_html/wellness` and `public_html/api-wellness`, since a bad deploy overwrites production. Confirm Hostinger FTP/SSH credentials work via a manual `FTP-Deploy-Action` test run (e.g. `dry-run: true` option) before enabling real uploads.
- Follow up with the user to confirm whether Hostinger SSH/terminal access is actually available on their plan before wiring the automated `migrate`/`config:cache` step — otherwise those stay manual post-upload steps.
