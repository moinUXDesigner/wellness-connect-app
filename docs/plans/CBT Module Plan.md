# CBT Module Plan

## Summary

Build CBT as a full-stack module inside the existing WellnessConnect app, not as a separate project. The frontend will follow the repo convention at `src/app/features/cbt`, and the backend API will use the existing Laravel versioned route base: `/api/v1/cbt`.

The MVP will cover the complete clinical loop: counsellor creates a CBT care plan, assigns exercises, client completes them, counsellor reviews responses, progress is tracked, and risk events trigger alerts/audit records.

## Key Changes

* Add CBT frontend under `src/app/features/cbt` with internal `pages`, `components`, `services`, `types`, and `mockCbtData`.
* Add routes inside existing authenticated layouts:

  * Client: `/client/cbt`, `/client/cbt/plan`, `/client/cbt/exercises`, `/client/cbt/exercises/:instanceId`, `/client/cbt/progress`
  * Counsellor: `/counsellor/cbt`, `/counsellor/cbt/clients/:clientId`, `/counsellor/cbt/plans/:planId`, `/counsellor/cbt/reviews`
  * Admin: `/admin/cbt/exercise-library`
* Use existing roles first:

  * `client` for client CBT access
  * `counsellor` for practitioner CBT workflows
  * `admin` for template library management
* Add permissions:

  * `client.cbt.view`, `client.cbt.manage`
  * `counsellor.cbt.view`, `counsellor.cbt.manage`, `counsellor.cbt.review`
  * `admin.cbt\_templates.manage`

## Backend Implementation

* Add Laravel migrations for:

  * `cbt\_exercise\_categories`
  * `cbt\_exercise\_templates`
  * `cbt\_care\_plans`
  * `cbt\_plan\_goals`
  * `cbt\_plan\_exercises`
  * `cbt\_exercise\_instances`
  * `cbt\_exercise\_responses`
  * `cbt\_practitioner\_reviews`
  * `cbt\_progress\_snapshots`
  * `cbt\_risk\_events`
* Reuse existing tables:

  * `users`
  * `client\_profiles`
  * `practitioners`
  * `notifications`
  * `activity\_events`
  * `permissions`
  * `role\_permissions`
* Add Laravel models and relationships for each CBT table.
* Add `CbtController` or grouped controllers under `App\\Http\\Controllers\\Api\\Cbt`.
* Add `/api/v1/cbt` routes inside existing `auth:sanctum` and `account.active` middleware.
* Seed five MVP exercise templates:

  * Mood Check-in
  * Thought Record
  * Behavioral Activation
  * Cognitive Distortion Practice
  * Problem Solving Worksheet
* Store template form definitions in `template\_schema\_json`.
* Store client submissions in `response\_json`.
* Create risk events for high-risk keywords and link them to notifications/activity logs.

## Frontend Implementation

* Build typed CBT API service in `src/app/features/cbt/services/cbtApi.ts`.
* Build shared CBT types in `src/app/features/cbt/types/cbt.types.ts`.
* Start with mock data fallback so screens can render before backend is fully wired.
* Build dynamic `ExerciseFormRenderer` supporting:

  * `text`
  * `textarea`
  * `select`
  * `multi\_select`
  * `slider`
  * `date`
  * `time`
  * `checkbox`
  * `radio`
* Client screens:

  * CBT dashboard
  * My CBT plan
  * My exercises
  * Complete exercise
  * My progress
* Counsellor screens:

  * CBT dashboard
  * Client CBT overview
  * Create care plan
  * Assign exercise
  * Review responses
  * Progress report
* Admin screen:

  * Exercise template library
  * Simple template create/edit form using predefined schemas first, not drag-and-drop form building
* Use existing WellnessConnect visual language: lavender/white surfaces, purple actions, rounded cards, responsive dashboard layouts, lucide icons, and existing shared UI components where practical.

## API Surface

* Admin:

  * `GET /api/v1/cbt/categories`
  * `POST /api/v1/cbt/categories`
  * `GET /api/v1/cbt/exercise-templates`
  * `POST /api/v1/cbt/exercise-templates`
  * `PUT /api/v1/cbt/exercise-templates/{id}`
* Counsellor:

  * `GET /api/v1/cbt/clients/{clientId}/plans`
  * `POST /api/v1/cbt/clients/{clientId}/plans`
  * `GET /api/v1/cbt/plans/{planId}`
  * `PUT /api/v1/cbt/plans/{planId}`
  * `POST /api/v1/cbt/plans/{planId}/exercises`
  * `GET /api/v1/cbt/plans/{planId}/progress`
  * `GET /api/v1/cbt/plans/{planId}/responses`
  * `POST /api/v1/cbt/responses/{responseId}/review`
* Client:

  * `GET /api/v1/cbt/my-plan`
  * `GET /api/v1/cbt/my-exercises`
  * `GET /api/v1/cbt/exercise-instances/{id}`
  * `POST /api/v1/cbt/exercise-instances/{id}/start`
  * `POST /api/v1/cbt/exercise-instances/{id}/submit`
  * `GET /api/v1/cbt/my-progress`

## Test Plan

* Backend feature tests:

  * Client can only view and submit own CBT exercises.
  * Counsellor can only manage CBT plans for assigned/valid clients.
  * Admin can create and update exercise templates.
  * Submitting an exercise stores `response\_json` and updates instance status.
  * Reviewing a response stores feedback and creates activity log entries.
  * Risk keywords create `cbt\_risk\_events` and notifications.
* Frontend checks:

  * `npm run build`
  * Exercise renderer handles every supported field type.
  * Client, counsellor, and admin CBT routes render under existing layouts.
  * Mock mode works when API is unavailable.
* Database checks:

  * `php artisan migrate`
  * `php artisan db:seed`
  * `php artisan test`

## Assumptions

* CBT practitioner workflows map to the existing `counsellor` role for MVP.
* API route base is `/api/v1/cbt`, matching the existing Laravel API versioning.
* Frontend location is `src/app/features/cbt`, matching the current app architecture.
* No new auth system, user table, practitioner table, client table, notification table, or audit table will be created.
* AI-generated CBT suggestions are out of scope for MVP; the MVP uses structured templates and clinician review.

