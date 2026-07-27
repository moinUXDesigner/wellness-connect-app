# GitHub Actions Secrets & Variables — Hostinger Deploy

Used by `.github/workflows/deploy-hostinger.yml`. Add these under repo **Settings → Secrets and variables → Actions**.

The workflow now renders the backend's production `.env` entirely from these secrets and uploads it over SSH on every deploy — nothing sensitive needs to be hand-placed on the server or committed to the repo.

## Secrets (Secrets tab)

**SSH access (already added):**

| Name | Purpose |
|---|---|
| `HOSTINGER_SSH_HOST` | SSH host — hPanel → Advanced → SSH Access |
| `HOSTINGER_SSH_USER` | SSH username — same page |
| `HOSTINGER_SSH_KEY` | Private key (RSA 4096) matching a public key added under SSH Access → Manage SSH Keys |

**Laravel app:**

| Name | Purpose |
|---|---|
| `LARAVEL_APP_KEY` | The app's encryption key. Generate once and reuse forever — do **not** regenerate on every deploy (that invalidates all existing sessions/encrypted data). Format: `base64:` followed by 32 random bytes, e.g. output of `openssl rand -base64 32` prefixed with `base64:`. |

**Database (new — matches the database you just created in hPanel):**

| Name | Purpose |
|---|---|
| `HOSTINGER_DB_DATABASE` | Database name, e.g. `u484303972_aura_connect`-style name from hPanel → Databases |
| `HOSTINGER_DB_USERNAME` | Database user |
| `HOSTINGER_DB_PASSWORD` | Database password |

**Mail (Hostinger SMTP mailbox for `noreply@khajamynuddin.com`):**

| Name | Purpose |
|---|---|
| `HOSTINGER_MAIL_USERNAME` | Full mailbox address, e.g. `noreply@khajamynuddin.com` |
| `HOSTINGER_MAIL_PASSWORD` | Mailbox password |

**Third-party integrations (leave empty if not used yet):**

| Name | Purpose |
|---|---|
| `RAZORPAY_KEY_ID` | Razorpay payment gateway |
| `RAZORPAY_KEY_SECRET` | Razorpay payment gateway |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook verification |
| `GOOGLE_CLIENT_ID` | "Continue with Google" on trainer registration |

## Variables (Variables tab, already added)

| Name | Value |
|---|---|
| `VITE_API_URL` | `https://api-wellness.khajamynuddin.com/api/v1` |
| `HOSTINGER_SSH_PORT` | `65002` |

## How the `.env` gets to the server

`deploy-backend` in the workflow: rsyncs the backend code (excluding `.env`/`.env.*`/`tests/`/`.git`) → renders a fresh `.env` from the secrets above into a runner-local temp file → `scp`s it to `/public_html/api-wellness/.env` → deletes the local temp copy → SSHes in to run `migrate --force`, `config:cache`, `route:cache`, `storage:link`.

`key:generate` is intentionally never run automatically — `LARAVEL_APP_KEY` is a fixed secret you generate once, so every deploy writes the same key and doesn't invalidate live sessions.

`backend/.env.production.example` in the repo stays a **placeholder-only** reference file (no real credentials) — it's not what actually gets deployed anymore.
