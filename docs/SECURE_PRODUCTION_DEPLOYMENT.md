# Secure Production Deployment Guide

This is the manual-configuration companion to `.github/workflows/ci-cd.yml`. The workflow enforces what it can in code; everything in this document is a GitHub/Hostinger setting that has to be configured by hand, once, outside of git. Nothing here is optional if you want the CI/CD architecture's guarantees to actually hold — an unprotected `main` branch or an unrestricted `production` environment defeats the whole design.

## 1. GitHub: branch protection on `main`

Settings → Branches → Add branch ruleset (or classic branch protection rule) for `main`:
- Require a pull request before merging (disable direct pushes).
- Require status checks to pass: select the `frontend` and `backend` jobs from `ci-cd.yml` once they've run at least once (they won't appear in the picker until the workflow has executed).
- Require branches to be up to date before merging.
- Do not allow force pushes or deletions.

## 2. GitHub: the `production` Environment

Settings → Environments → New environment → name it exactly `production` (matches `environment: production` in `ci-cd.yml`).
- **Deployment branches and tags**: set to "Selected branches and tags" → add `main` only. This is the actual mechanism that makes it impossible for the `deploy` job to run against any other ref or reach the environment's secrets from a branch/PR/fork — the workflow's own `if:` condition is a backstop, this setting is the enforcement.
- **Required reviewers**: add yourself (and anyone else who should sign off) — this repo is public on GitHub's Free tier, so required reviewers on environments is available (it is not available for private repos on Free).
- Add the environment secrets and variables listed in `docs/GITHUB_SECRETS.md` here, not as repository-wide secrets — environment-scoped secrets are only readable by jobs that declare `environment: production`.

## 3. `CODEOWNERS`

`.github/CODEOWNERS` (already added) requires review from the listed owner(s) on `.github/workflows/**`, `AuthController.php`, migrations, and the Razorpay/payment files. For this to actually block merges, branch protection (step 1) must also have "Require review from Code Owners" enabled.

## 4. Generating the CI deploy key vs. your personal key

Use **two separate SSH keypairs**, conceptually:
- **Your personal key**: passphrase-protected, used for your own manual `ssh`/SFTP access. Keep using whatever you already have.
- **A dedicated CI deploy key**: generated specifically for GitHub Actions, **without a passphrase** (a passphrase-protected key can't be used non-interactively by a CI runner — there's no human to type it in).

Generate the CI key:

```bash
ssh-keygen -t ed25519 -f hostinger_deploy_ci -N "" -C "wellness-connect-ci-deploy"
```

- Add `hostinger_deploy_ci.pub` to Hostinger: hPanel → Advanced → SSH Access → Manage SSH Keys.
- Put the full contents of the private key (`hostinger_deploy_ci`, no `.pub`) into the `HOSTINGER_SSH_KEY` environment secret from step 2.
- Delete the local copies of `hostinger_deploy_ci`/`hostinger_deploy_ci.pub` once added — they only need to exist transiently to generate and register the pair.

**Residual risk**: this key authenticates as the same Hostinger Unix account that owns everything else on the account (other subdomains, databases, files) — it is not scoped to only the WellnessConnect directories. If Hostinger's plan ever offers a separate restricted user or sub-account for this specific site, prefer that over a shared-account key. Until then, treat a leaked `HOSTINGER_SSH_KEY` as a full-account compromise, not a WellnessConnect-only one.

## 5. Obtaining and verifying Hostinger's SSH host fingerprint (`HOSTINGER_KNOWN_HOSTS`)

Do **not** trust a live `ssh-keyscan` output as-is (that's exactly the trust-on-first-use weakness this replaces). Verify the host key out-of-band:
- Connect once manually via `ssh -p <port> <user>@<host>` and note the fingerprint OpenSSH shows on first connection.
- Cross-check that fingerprint against Hostinger's own account panel/support if they publish it, or at minimum confirm it doesn't change across independent connection attempts from different networks (a MITM on a single network path would only affect one of them).
- Once confident, capture the actual host key line(s):
  ```bash
  ssh-keyscan -p <port> -t ed25519 <host>
  ```
  Store that exact line's content as the `HOSTINGER_KNOWN_HOSTS` environment secret. The deploy job writes it directly to `~/.ssh/known_hosts` and uses `StrictHostKeyChecking=yes`, so a mismatch fails the connection instead of silently trusting whatever key the server presents that day.

## 6. Provisioning the production `.env`

This is a **one-time, manual** step per server (not per deploy — the workflow no longer touches `.env` at all):

1. Copy `backend/.env.production.example` to your own machine and fill in every real value (DB credentials from hPanel → Databases, mail credentials, Razorpay keys, Google client ID).
2. Generate `APP_KEY` **once**:
   ```bash
   php artisan key:generate --show
   ```
   (run locally against a copy of the app, or via SSH on the server the first time only). Put the resulting `base64:...` value into `APP_KEY=`.
3. Upload the filled-in file to the server as `domains/khajamynuddin.com/public_html/api-wellness/.env` (one level **above** the `public/` document root — never inside `public/`).
4. Set restrictive permissions:
   ```bash
   chmod 600 domains/khajamynuddin.com/public_html/api-wellness/.env
   ```
5. Delete the local filled-in copy once uploaded, or keep it somewhere that isn't git (a password manager, not a repo, not a plain-text note in the project folder).

Every subsequent deploy leaves this file untouched (`rsync` excludes `.env`/`.env.*`). Never run `php artisan key:generate` again after this — it invalidates every existing session and any already-encrypted data.

## 7. Verifying the `public/` document root

`docs/DEPLOY_HOSTINGER.md` documents the expected layout. To re-verify it live at any time:

```bash
curl -s https://api-wellness.khajamynuddin.com/.env
curl -s https://api-wellness.khajamynuddin.com/../.env  # sanity-check only, most servers normalize this
```

Both should return Hostinger's 404 or a connection rejection — never file contents. If either ever returns real `.env` content, the document root is misconfigured and must be fixed immediately (point the subdomain at the nested `public/` folder, not the project root) before anything else.

## 8. Rotating and revoking the deploy key

To rotate: generate a new keypair (step 4), add the new public key to Hostinger, update `HOSTINGER_SSH_KEY`, confirm a deploy succeeds, then remove the old public key from Hostinger's SSH Access panel. To revoke immediately (suspected leak): remove the public key from Hostinger's SSH Access panel first (cuts off access immediately), then rotate as above at your own pace.

## 9. Database backups and restoration

Before every deploy that finds an application already present (i.e. every deploy after the first), the `deploy` job takes a `mysqldump` backup to `~/private_backups/api-wellness/pre-deploy-<timestamp>.sql` on the server — **outside** `domains/khajamynuddin.com/public_html/api-wellness/` entirely, so it's never touched by `rsync --delete` and never web-servable regardless of document root configuration. Credentials are never read from `.env` via shell `source`/`grep`/`eval` — the currently-deployed app's own `artisan tinker` resolves its already-loaded Laravel database config in-process and writes a MySQL "option file" (`--defaults-extra-file`) directly to a `mktemp`'d, `chmod 600` file under a `umask 077`, cleaned up by a `trap` on every exit path. The password never appears on a command line, in workflow output, or in logs, and this handles passwords containing spaces, `$`, quotes, `#`, or semicolons correctly since the value is never re-parsed by a shell. Retention is capped at the 10 most recent backups (deploy job env var `BACKUP_RETENTION_COUNT`) — older ones are deleted automatically each deploy.

To restore from one of these backups:

```bash
mysql -h<DB_HOST> -u<DB_USERNAME> -p<DB_PASSWORD> <DB_DATABASE> < ~/private_backups/api-wellness/pre-deploy-<timestamp>.sql
```

Test this restoration procedure at least once against a **non-production** database before you ever need it for real — the first time you run a restore command should not be during an actual incident.

**Migrations are never automatically rolled back** (a bad migration is expand/contract-fixed forward or restored from the pre-deploy backup above, by hand) — automatic rollback of a partially-applied schema change is often worse than the original problem, and is out of scope until specifically designed and tested.

## 10. Testing deploy and rollback safely (no real health data)

- Before relying on this pipeline for real launch traffic, do at least one full run against a **staging** database/subdomain pair if you can provision one cheaply on the same Hostinger plan — never rehearse rollback procedures against the production database.
- If no staging environment exists yet, test the health-check failure path deliberately: temporarily point `DB_DATABASE` in the server's `.env` at a nonexistent database name, trigger a deploy, and confirm the `deploy` job's health check step actually fails the workflow (rather than silently succeeding) — then revert the `.env` change.
- "Rollback" today means: restore the previous release's files from your last known-good `git` commit (re-run the `deploy` job against that commit via a revert PR) plus, if the migration also needs undoing, restore from the pre-deploy `mysqldump` backup. There is no atomic release-directory/symlink switch yet (see §11) — this is a conscious, documented trade-off, not an oversight.

## 11. Follow-up: atomic release directories (not implemented yet)

Zero-downtime atomic deploys (a `releases/<timestamp>/` directory per deploy plus a `current` symlink swapped only after everything succeeds) were deliberately **not** implemented in this pass, because Hostinger's actual symlink support in this account's shell hasn't been verified. Before attempting it:

```bash
cd domains/khajamynuddin.com/public_html
mkdir -p _symlink_test/target
ln -s _symlink_test/target _symlink_test/current
ls -la _symlink_test/current   # should show it resolving to target
```

If that works, and Hostinger's Apache config follows symlinks for the subdomain's document root (test by pointing the subdomain at a symlink and confirming it serves correctly, rather than a `403`/`500`), the deploy can be restructured to build into a fresh timestamped `releases/<n>/` directory and only repoint `api-wellness -> releases/<n>/public` (and an equivalent for the frontend) after the health check passes — with old releases retained (e.g. last 3-5) for instant rollback by re-pointing the symlink. Until verified, the current in-place deploy (with the safety rails in `ci-cd.yml`: path validation, protective rsync excludes, pre-migration backup, a failing health check that stops before the frontend swap) is the conservative fallback.

## 12. Residual risks, explicitly

- **Shared hosting account, shared Unix user**: the deploy key, once on the box, can touch every file the account's user can touch — not just WellnessConnect's directories. See §4.
- **Sibling subdomains under `khajamynuddin.com`**: `wellness.` and `api-wellness.` (and any other subdomain on the same root domain) share the ability to set cookies scoped to `.khajamynuddin.com` if any of them ever did — this app's actual auth is bearer-token/`Authorization` header, not cookies, so this is currently inert, but if a future feature reintroduces cookie-based session auth, revisit `SESSION_DOMAIN` scoping and Sanctum's `stateful` list before shipping it.
- **XSS against the bearer token**: since the auth token lives in `localStorage` (not an `HttpOnly` cookie), any successful XSS can steal it. This makes Content-Security-Policy headers and rigorous output-encoding the actual first line of defense for session integrity — verify a CSP is in place; none was found during this pass's audit of the current `.htaccess`/middleware configuration, and adding one is recommended follow-up work.
- **No atomic rollback yet**: see §11 — a failed deploy after the health check but before full stabilization requires manual recovery per §9/§10, not an automatic instant revert.
- **Single shared MySQL server for backups**: `mysqldump` runs on the same box being deployed to; a full-disk or full-account outage affects both the live app and its most recent local backups simultaneously — for real resilience, periodically copy `~/private_backups/api-wellness/*.sql` off-server (a downloaded copy, a separate cloud storage bucket, etc.), which is not automated here.
