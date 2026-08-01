# Deploy WellnessConnect On Hostinger

This project deploys as two subdomains under `khajamynuddin.com`:

- Frontend: `https://wellness.khajamynuddin.com`
- Backend API: `https://api-wellness.khajamynuddin.com/api/v1`

For the full production-hardening picture (branch protection, required reviewers, secrets model, SSH key handling, `.env` provisioning, rollback/recovery), see **`docs/SECURE_PRODUCTION_DEPLOYMENT.md`**. This file covers the deployment paths and manual/CI upload mechanics only.

## Hostinger Folder Layout

Confirmed against the live account (verify this still matches before relying on it — Hostinger's actual home-relative paths, not just what hPanel's UI implies):

```text
/home/<user>/domains/khajamynuddin.com/public_html/
  wellness/
  api-wellness/
    public/
```

Subdomain document roots:

```text
wellness.khajamynuddin.com      -> domains/khajamynuddin.com/public_html/wellness
api-wellness.khajamynuddin.com  -> domains/khajamynuddin.com/public_html/api-wellness/public
```

The API's document root **must** be the nested `public/` folder, never the Laravel project root — the project root holds `.env`, `app/`, `config/`, `storage/`, none of which should ever be web-servable.

## Frontend Build And Upload (manual, no CI)

Build the React app with the production API URL:

```powershell
$env:VITE_API_URL="https://api-wellness.khajamynuddin.com/api/v1"
$env:VITE_DEMO_MODE="false"
npm.cmd run build
```

Upload the contents of `dist/` into `domains/khajamynuddin.com/public_html/wellness/`, plus:

```text
deploy/wellness/.htaccess -> domains/khajamynuddin.com/public_html/wellness/.htaccess
```

The `.htaccess` file keeps React Router deep links working when users refresh routes such as `/get-started`, `/login`, or `/client/intake`.

## Backend Upload (manual, no CI)

Upload the Laravel backend folder contents into `domains/khajamynuddin.com/public_html/api-wellness/` (excluding `.git`, `tests/`, `.env*`).

`backend/.env.production.example` in this repo is a **placeholder-only reference** — never upload it as-is or commit real values into it. The real `.env` is provisioned **once, manually**, directly on the server (outside the `public/` docroot, `chmod 600`) — see `docs/SECURE_PRODUCTION_DEPLOYMENT.md` for the exact procedure. CI does not touch `.env` at all.

## Backend Commands

If deploying manually (no CI) and Hostinger terminal access is available, run these from `domains/khajamynuddin.com/public_html/api-wellness`:

```bash
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan storage:link
```

`php artisan key:generate` is intentionally **not** listed here — it must only ever be run once, the very first time `.env` is provisioned (see the deployment guide). Running it again on a live app invalidates every existing session and any data encrypted with the old key.

If dependencies are installed locally instead, upload the `vendor/` directory with the backend.

## CI/CD (GitHub Actions)

`.github/workflows/ci-cd.yml` is a single workflow: `frontend` and `backend` jobs build/test/audit on every PR and push to `main` (no secrets involved, safe for fork PRs); a `deploy` job runs only for a push to `main`, only after both succeed, and only within the `production` GitHub Environment. It downloads the already-built/tested artifacts (no rebuild inside the deploy job), deploys the backend, backs up the database and runs migrations, health-checks `/api/health`, deploys the frontend, then does a final health check — failing the job (and leaving the previous deploy live) if either health check fails.

Full list of required secrets/variables: **`docs/GITHUB_SECRETS.md`**. Full manual GitHub/Hostinger configuration (environment protection, branch rules, SSH key generation and known-hosts verification, `.env` provisioning): **`docs/SECURE_PRODUCTION_DEPLOYMENT.md`**.

## Android / Capacitor

Use the same API URL for Android builds:

```powershell
$env:VITE_API_URL="https://api-wellness.khajamynuddin.com/api/v1"
$env:VITE_DEMO_MODE="false"
npm.cmd run build:cap
npx cap sync android
```

## Smoke Tests

After a deploy, test:

- `https://wellness.khajamynuddin.com`
- `https://wellness.khajamynuddin.com/get-started`
- `https://wellness.khajamynuddin.com/login`
- `https://wellness.khajamynuddin.com/client/intake`
- `https://api-wellness.khajamynuddin.com/api/health` — should return `{"status":"ok"}`
- `https://api-wellness.khajamynuddin.com/api/v1/auth/login`
- `https://api-wellness.khajamynuddin.com/api/v1/auth/register`

The API login/register endpoints should return JSON responses, even for validation errors, and never a stack trace, SQL, or file path (confirm `APP_DEBUG=false` in the server's `.env` if they ever do).
