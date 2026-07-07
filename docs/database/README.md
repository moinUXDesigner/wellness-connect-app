# Database Backups

Encrypted database backups live in this folder.

- `*.sql.enc` files are encrypted and can be committed.
- `*.sql` files are plaintext exports and are ignored.
- `*.key` files contain local decryption passphrases and are ignored.

Keep the matching `.key` file private. Without it, the encrypted backup cannot be restored.

## Merge-safe workflow

- Create a backup with `php scripts/create-db-backup.php`
- Commit the generated `*.sql.enc` file
- Keep the generated matching `*.key` file private on the machine that created it
- Merge a pulled backup into the current local database with `php scripts/restore-db-backup.php database_backups/<backup-name>.sql.enc database_backups/<backup-name>.key`

The generated SQL is merge-safe by design:

- schema uses `CREATE TABLE IF NOT EXISTS`
- data rows use `INSERT IGNORE`

That means restoring a pulled backup adds missing rows without wiping an existing local database.
