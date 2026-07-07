# Critical Security Fixes — WellnessConnect

10 critical issues identified in the full platform audit. All must be resolved before any real user is onboarded.

---

## Issue 1 — Admin password reset hardcodes "password123"
**File:** `backend/app/Http/Controllers/Api/AdminController.php` lines 151–176
- Generate a random 12-char password with `Str::password(12)`
- Send it to the user's email via new `AdminPasswordResetMail`
- Return only `"Password reset. The user has been notified by email."` — never return the password in the response
- **New files:** `backend/app/Mail/AdminPasswordResetMail.php`, `backend/resources/views/mail/admin-password-reset.blade.php`

---

## Issue 2 — Seeder creates known-password accounts in production
**File:** `backend/database/seeders/DatabaseSeeder.php`
- Add at top of `run()`: abort unless `app()->isLocal() || app()->environment('testing')`

---

## Issue 3 — No rate limiting on any API endpoint
**File:** `backend/routes/api.php`
- Add `'throttle:15,1'` middleware to public auth route group
- Add per-account `RateLimiter` lockout (5 attempts) inside `AuthController::login()`

---

## Issue 4 — Dummy OTP (123456) bypasses trainer verification
**Files:** `backend/app/Providers/AppServiceProvider.php`, `backend/app/Http/Controllers/Api/AuthController.php`, `backend/.env.example`
- Make `DummySmsVerificationSender` binding conditional on `app()->isLocal() || environment('testing')`
- In production: always generate random OTP, never use config fallback
- Update `.env.example` to document dummy keys as dev-only

---

## Issue 5 — `.env` committed with live DB credentials
**Files:** `backend/.gitignore`, git history
- Add `backend/.env` to `backend/.gitignore`
- Run `git rm --cached backend/.env`
- **User must manually:** rotate DB passwords, run `php artisan key:generate`, set `SESSION_ENCRYPT=true`

---

## Issue 6 — Sanctum tokens never expire
**File:** `backend/config/sanctum.php` line 50
- Set `'expiration' => env('SANCTUM_TOKEN_EXPIRY_MINUTES', 10080)` (7 days)
- In `AuthController::changePassword()`: revoke all tokens (`$user->tokens()->delete()`) then reissue

---

## Issue 7 — Webhook idempotency bug causes permanent payment failure
**File:** `backend/app/Http/Controllers/Api/PaymentWebhookController.php`
- Wrap billing call in `try/catch`; on exception set `$event->status = 'failed'` and rethrow (so Razorpay retries)
- Change idempotency guard to only block on `status = 'processed'` (not `'failed'` or `'received'`)

---

## Issue 8 — Terms/Privacy Policy are placeholder copy
**File:** `src/app/features/public/LegalPage.tsx`
- Remove the visible "placeholder copy" disclaimer text from the rendered output
- Show the warning banner only in `import.meta.env.DEV` builds
- **User must:** engage a lawyer to replace the placeholder body content before public launch

---

## Issue 9 — User consent is hardcoded `true`
**Files:** `src/app/features/public/GetStartedWizardPage.tsx`, `src/app/features/auth/SignupPage.tsx`, `backend/app/Http/Controllers/Api/AuthController.php`
- Add unticked consent checkbox on wizard review step; drive `consent_to_terms` from its state
- Disable "Create Account" button until checkbox is ticked
- Remove `password` from `sessionStorage` draft persistence
- Change `SignupPage` initial consent state from `useState(true)` → `useState(false)`
- Write a `ConsentRecord` row after registration (table already exists but is never populated)

---

## Issue 10 — Hard delete permanently destroys clinical records
**Files:** 9 model files, 1 new migration, `AdminController::destroyUser()`
- Add `SoftDeletes` trait to all clinical models: `CounsellorSessionNote`, `CounsellorSessionFlow`, `CounsellorSessionFlowStep`, `CounsellorAssessmentResult`, `CbtCarePlan`, `CbtExerciseResponse`, `CbtRiskEvent`, `IntakeFlow`, `IntakeAnswer`
- New migration: `2026_07_07_100000_add_soft_deletes_to_clinical_tables.php`
- Replace `$user->delete()` in `destroyUser()` with PII anonymisation (name/email/phone pseudonymised, status set to `'deleted'`, clinical records retained under pseudonym)

---

## Execution Order
1. Issue 5 — unstage .env from git (before any other commit)
2. Issue 1 — fix admin password reset
3. Issue 2 — gate seeder
4. Issue 6 — set token expiry
5. Issue 7 — fix webhook idempotency
6. Issue 3 — add rate limiting
7. Issue 4 — fix dummy OTP
8. Issue 9 — consent checkbox + ConsentRecord
9. Issue 10 — soft deletes migration + anonymisation
10. Issue 8 — remove placeholder disclaimer from LegalPage

## Verification
```bash
docker compose exec app composer test   # all tests pass
# manual: hit /auth/login 16× in 1 min → 16th returns 429
# manual: /get-started → Create Account button disabled until checkbox ticked
# manual: admin password reset → no password in response, email sent to user
```
