# Deploy WellnessConnect On Hostinger

This project deploys as two subdomains under `khajamynuddin.com`:

- Frontend: `https://wellness.khajamynuddin.com`
- Backend API: `https://api-wellness.khajamynuddin.com/api/v1`

## Hostinger Folder Layout

```text
public_html/
  wellness/
  api-wellness/
    public/
```

Set the subdomain document roots to:

```text
wellness.khajamynuddin.com      -> public_html/wellness
api-wellness.khajamynuddin.com  -> public_html/api-wellness/public
```

## Frontend Build And Upload

Build the React app with the production API URL:

```powershell
$env:VITE_API_URL="https://api-wellness.khajamynuddin.com/api/v1"
$env:VITE_DEMO_MODE="false"
npm.cmd run build
```

Upload the contents of `dist/` into:

```text
public_html/wellness/
```

Also upload:

```text
deploy/wellness/.htaccess -> public_html/wellness/.htaccess
```

The `.htaccess` file keeps React Router deep links working when users refresh routes such as `/get-started`, `/login`, or `/client/intake`.

## Backend Upload

Upload the Laravel backend folder contents into:

```text
public_html/api-wellness/
```

The API subdomain must point to:

```text
public_html/api-wellness/public
```

`backend/.env.production.example` in this repo is a **placeholder-only reference** — it is never uploaded as-is and never contains real credentials. The actual `.env` is rendered and deployed automatically by the GitHub Actions workflow from repo secrets (see CI/CD section below). Manual upload of `.env` is only a fallback if you're deploying without CI — see `docs/GITHUB_SECRETS.md` for what values it needs.

## Backend Commands

If deploying manually (no CI) and Hostinger terminal access is available, run these from `public_html/api-wellness`:

```bash
composer install --no-dev --optimize-autoloader
php artisan key:generate
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan storage:link
```

If dependencies are installed locally instead, upload the `vendor/` directory with the backend.

## CI/CD (GitHub Actions)

`.github/workflows/deploy-hostinger.yml` deploys automatically after `Frontend CI`/`Backend CI` pass on `main`, using `rsync`/`scp` over SSH (no FTP). It renders the backend's production `.env` entirely from GitHub secrets and uploads it on every deploy, then runs `migrate --force`, `config:cache`, `route:cache`, `storage:link` over SSH.

Full list of required secrets/variables: **`docs/GITHUB_SECRETS.md`**.

`key:generate` is intentionally never run by the workflow — the app key is a fixed `LARAVEL_APP_KEY` secret instead, so re-deploys don't invalidate live sessions.

## Android / Capacitor

Use the same API URL for Android builds:

```powershell
$env:VITE_API_URL="https://api-wellness.khajamynuddin.com/api/v1"
$env:VITE_DEMO_MODE="false"
npm.cmd run build:cap
npx cap sync android
```

## Smoke Tests

After upload, test:

- `https://wellness.khajamynuddin.com`
- `https://wellness.khajamynuddin.com/get-started`
- `https://wellness.khajamynuddin.com/login`
- `https://wellness.khajamynuddin.com/client/intake`
- `https://api-wellness.khajamynuddin.com/api/v1/auth/login`
- `https://api-wellness.khajamynuddin.com/api/v1/auth/register`

The API login/register endpoints should return JSON responses, even for validation errors.
