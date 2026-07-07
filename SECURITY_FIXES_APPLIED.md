# Security & Compliance Fixes — Applied Changes

**Date:** 2026-07-07  
**Scope:** All 10 critical issues identified in the full-platform audit  
**Status:** All resolved — 112 backend tests pass, frontend build clean

---

## Issue 1 — Admin password reset hardcoded "password123"

**Risk:** Any admin could reset a user's password and read the new password from the API response.

### Files changed
| File | Change |
|------|--------|
| `backend/app/Http/Controllers/Api/AdminController.php` | Password is now `Str::password(12)` (random). Response no longer includes the password. All user tokens revoked on reset. |
| `backend/app/Mail/AdminPasswordResetMail.php` | **New file.** Mailable that sends the temporary password to the user's email. |
| `backend/resources/views/mail/admin-password-reset.blade.php` | **New file.** Blade markdown email view showing the temporary password with instructions. |
| `backend/tests/Feature/AdminUserPasswordResetTest.php` | Updated to use `Mail::fake()`, assert `AdminPasswordResetMail` was sent, assert old password no longer works, assert response does not expose the password. |

---

## Issue 2 — DatabaseSeeder creates accounts with known passwords in production

**Risk:** Running `db:seed` in production would create `admin@wellnessconnect.local` / `Admin@12345` and similar test accounts.

### Files changed
| File | Change |
|------|--------|
| `backend/database/seeders/DatabaseSeeder.php` | Added environment guard at the top of `run()` — exits immediately unless `APP_ENV=local` or `APP_ENV=testing`. |

---

## Issue 3 — No rate limiting on any auth endpoint

**Risk:** Brute-force attacks on login, registration, and OTP endpoints were unrestricted.

### Files changed
| File | Change |
|------|--------|
| `backend/routes/api.php` | Added `'throttle:15,1'` middleware to the entire public auth route group (15 requests/minute per IP). |
| `backend/app/Http/Controllers/Api/AuthController.php` | Added `use Illuminate\Support\Facades\RateLimiter`. In `login()`: per-account throttle key `login\|{email}\|{ip}`, max 5 attempts, 5-minute decay. Cleared on successful login. |

---

## Issue 4 — Dummy OTP code (123456) bypassed SMS verification in all environments

**Risk:** `DummySmsVerificationSender` was unconditionally bound — no SMS was ever sent in any environment. OTP config had `'123456'` as a hardcoded fallback.

### Files changed
| File | Change |
|------|--------|
| `backend/app/Providers/AppServiceProvider.php` | `DummySmsVerificationSender` is now only bound when `isLocal()` or `environment('testing')`. In all other environments the binding throws a `RuntimeException` at boot — forcing an explicit real SMS provider before going live. |
| `backend/app/Http/Controllers/Api/AuthController.php` | Added private `generateOtp(string $configKey): string` helper. In production (`isProduction()`), always returns `random_int(0–999999)` padded to 6 digits. In other environments, reads from config with random fallback. All 4 OTP generation lines replaced with `$this->generateOtp(...)`. |

---

## Issue 5 — `.env` file committed to git with live database credentials

**Finding:** `backend/.env` was already excluded by `backend/.gitignore` and was never actually committed. No git action was needed.  
**Action taken:** Verified with `git ls-files backend/.env` — returned empty. File is safe. `.env.example` was updated with proper comments.

### Files changed
| File | Change |
|------|--------|
| `backend/.env.example` | Added comments on `APP_KEY` (generate before first run), `SESSION_ENCRYPT`, `MAIL_MAILER` (production vs dev), added `SANCTUM_TOKEN_EXPIRY_MINUTES`, `TRAINER_OTP_DUMMY_CODE`, and `TRAINER_EMAIL_OTP_DUMMY_CODE` with dev-only notes. |

---

## Issue 6 — Sanctum tokens never expire

**Risk:** A stolen or leaked token was valid forever — no forced re-auth, no session timeout.

### Files changed
| File | Change |
|------|--------|
| `backend/config/sanctum.php` | `'expiration' => null` changed to `'expiration' => env('SANCTUM_TOKEN_EXPIRY_MINUTES', 10080)` (7 days). |
| `backend/.env.example` | Added `SANCTUM_TOKEN_EXPIRY_MINUTES=10080` with comment. |

---

## Issue 7 — Webhook idempotency bug caused permanent payment failure on retry

**Risk:** If `activateCapturedPayment()` threw an exception, the event record stayed in `status='received'`. The idempotency check (`->exists()`) then blocked all Razorpay retries, permanently preventing payment activation.

### Files changed
| File | Change |
|------|--------|
| `backend/app/Http/Controllers/Api/PaymentWebhookController.php` | Idempotency guard now blocks only `status='processed'` rows — `status='failed'` or `status='received'` events can be retried. Billing call wrapped in `try/catch`: success sets `status='processed'`, exception sets `status='failed'` and rethrows (so Razorpay gets a 500 and retries). |

---

## Issue 8 — Terms of Service and Privacy Policy showed "placeholder copy" disclaimer to users

**Risk:** End users could see "This page is product-ready placeholder copy and should be reviewed by legal counsel before production launch." — a trust and legal compliance issue.

### Files changed
| File | Change |
|------|--------|
| `src/app/features/public/LegalPage.tsx` | Removed the "placeholder copy" sentence from both Terms of Service and Privacy Policy intro strings. Added a yellow dev-only banner inside `{import.meta.env.DEV && ...}` — visible during development, compiled out of production builds. |

---

## Issue 9 — User consent hardcoded to `true` — no actual consent act recorded

**Risk:** `consent_to_terms: true` was sent regardless of user action. No `ConsentRecord` row was ever written, so there was no audit trail of when/from where consent was given.

### Files changed
| File | Change |
|------|--------|
| `src/app/features/public/GetStartedWizardPage.tsx` | Removed `password` from sessionStorage draft (passwords must never be persisted in browser storage). `getRestorableStep` updated accordingly. Added `const [consent, setConsent] = useState(false)`. Step 5 review screen: replaced the "by creating your account..." text with a real unticked checkbox. "Create My Plan" button disabled until checkbox is ticked. `consent_to_terms: consent` passed to API instead of hardcoded `true`. |
| `src/app/features/auth/SignupPage.tsx` | Changed `useState(true)` → `useState(false)` for consent state. |
| `backend/app/Http/Controllers/Api/AuthController.php` | `register()`: writes a `ConsentRecord` row (with `user_id`, `ip_address`, `user_agent`, `accepted_at`) when `consent_to_terms` is true. `createTrainerAccount()`: also writes a `ConsentRecord` row after trainer account creation (trainer consent is validated at the mobile OTP step). |

---

## Issue 10 — Hard delete permanently destroyed clinical records

**Risk:** Deleting a user via admin removed all linked counsellor notes, CBT care plans, intake flows, etc. — violating clinical data retention requirements.

### Files changed

#### New migration
| File | Change |
|------|--------|
| `backend/database/migrations/2026_07_07_100000_add_soft_deletes_to_clinical_tables.php` | **New file.** Adds `deleted_at` column to 9 clinical tables: `counsellor_session_notes`, `counsellor_session_flows`, `counsellor_session_flow_steps`, `counsellor_assessment_results`, `cbt_care_plans`, `cbt_exercise_responses`, `cbt_risk_events`, `intake_flows`, `intake_answers`. |

#### Models — added `SoftDeletes` trait
| Model file | Change |
|-----------|--------|
| `backend/app/Models/CounsellorSessionNote.php` | Added `use SoftDeletes` |
| `backend/app/Models/CounsellorSessionFlow.php` | Added `use SoftDeletes` |
| `backend/app/Models/CounsellorSessionFlowStep.php` | Added `use SoftDeletes` |
| `backend/app/Models/CounsellorAssessmentResult.php` | Added `use SoftDeletes` |
| `backend/app/Models/CbtCarePlan.php` | Added `use SoftDeletes` |
| `backend/app/Models/CbtExerciseResponse.php` | Added `use SoftDeletes` |
| `backend/app/Models/CbtRiskEvent.php` | Added `use SoftDeletes` |
| `backend/app/Models/IntakeFlow.php` | Added `use SoftDeletes` |
| `backend/app/Models/IntakeAnswer.php` | Added `use SoftDeletes` |

#### AdminController — user anonymisation instead of hard delete
| File | Change |
|------|--------|
| `backend/app/Http/Controllers/Api/AdminController.php` | `destroyUser()` now anonymises PII instead of calling `$user->delete()`. Fields replaced: `name` → `Deleted User #{id}`, `email` → `deleted+{id}@wellnessconnect.internal`, `phone/google_id/avatar_url/wellness_goal` → `null`, `status` → `suspended`. Client profile emergency contact and photo fields also nulled. Clinical records are **not** touched — they remain linked to the pseudonymous user ID for the legal retention period. Removed `userDeletionBlockers()` and `blockedUserDeletionResponse()` private methods (no longer needed). |

#### Tests updated
| File | Change |
|------|--------|
| `backend/tests/Feature/AdminUserDeletionTest.php` | Rewritten to assert anonymisation rather than hard deletion. The three "blocker" tests (`appointment_audit_events`, `financial_actions`, `client_billing_history`) now assert that these records do **not** block anonymisation (they used to assert a 409 Conflict). |

---

## One-off action still required before production launch

> Run the new migration on the production database before deploying:
> ```
> docker compose exec app php artisan migrate --force
> ```
> This adds `deleted_at` to the 9 clinical tables.

---

## Verification results

```
Backend tests:   112 passed (612 assertions) — 0 failures
Frontend build:  ✓ built in 36.99s — 0 errors (pre-existing chunk size warnings only)
```
