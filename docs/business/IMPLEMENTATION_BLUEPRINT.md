# WellnessConnect Implementation Blueprint (Mobile First)

## 1) Laravel Migration List (Execution Order)
1. `2014_10_12_000000_create_users_table.php`
2. `2026_05_03_090000_add_profile_fields_to_users_table.php`
3. `2026_05_03_093000_create_appointments_table.php`
4. `2026_05_03_100000_create_client_profiles_table.php`
5. `2026_05_03_100005_add_status_to_users_table.php`
6. `2026_05_03_100010_create_service_catalog_and_wellness_packages_table.php`
7. `2026_05_03_100020_create_practitioner_tables.php`
8. `2026_05_03_100030_create_intake_tables.php`
9. `2026_05_03_100040_extend_appointments_and_events.php`
10. `2026_05_03_100050_create_notifications_and_consent_records.php`

## 2) Core Model Relations
- `User` 1:1 `ClientProfile`
- `User` 1:1 `Practitioner`
- `User` 1:N `IntakeFlow` (`client_user_id`)
- `User` 1:N `Appointment` (`client_user_id`)
- `Practitioner` 1:N `PractitionerSpecialty`
- `Practitioner` 1:N `AvailabilitySlot`
- `Practitioner` 1:N `Appointment`
- `IntakeFlow` 1:N `IntakeAnswer`
- `IntakeFlow` 1:N `Appointment`
- `Appointment` 1:N `AppointmentEvent`
- `User` 1:N `Notification`
- `User` 1:N `ConsentRecord`

## 3) API Contract Summary (`/api/v1`)
See: [openapi.wellnessconnect.json](/d:/wellness-connect-app/docs/openapi.wellnessconnect.json)

Auth:
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`

Client:
- `PUT /client/profile`

Intake:
- `POST /intake-flows`
- `GET /intake-flows/{id}`
- `PUT /intake-flows/{id}/service`
- `PUT /intake-flows/{id}/intake`
- `POST /intake-flows/{id}/submit`
- `GET /intake-flows/{id}/confirmation`

Practitioner:
- `GET /intake-flows/{id}/recommended-practitioners`
- `GET /practitioners/{id}/slots`

Appointments:
- `GET /client/appointments`
- `POST /appointments`
- `PUT /appointments/{id}/reschedule`
- `POST /appointments/{id}/cancel`

## 4) Frontend State Machine (Client Intake)
States:
- `service` -> `intake` -> `schedule` -> `confirm`

Status transitions:
- `draft` (created)
- `submitted` (intake submitted)
- `auto_bookable` (can continue to schedule)
- `under_review` (manual team review)
- `booked` (session confirmed)
- `closed` (end state)

Transitions:
1. `createIntakeFlow(service_type)` -> `service/draft`
2. `updateService + saveIntake` -> `intake/draft`
3. `submitIntakeFlow`:
 - low risk -> `schedule/auto_bookable`
 - medium/high risk -> `confirm/under_review`
4. `bookAppointment` -> `confirm/booked`

## 5) Folder-by-Folder Implementation Checklist

`backend/app/Models`
- [x] Add normalized wellness entities (profile, intake, practitioner, booking, events, consent, notifications)
- [x] Define relations for auth + intake + booking flows

`backend/app/Http/Controllers/Api`
- [x] Auth controller with token + profile payload
- [x] Profile update endpoint
- [x] Intake flow CRUD-like progression endpoints
- [x] Practitioner recommendation + slots
- [x] Appointment book/reschedule/cancel endpoints

`backend/app/Services`
- [x] Triage service for risk/status mapping
- [x] Slot booking service with transaction and event tracking

`backend/database/migrations`
- [x] User profile/status augmentation
- [x] Service/package catalog
- [x] Practitioner and slot tables
- [x] Intake flow and answers tables
- [x] Appointment lifecycle tables
- [x] Notification and consent tables

`backend/database/seeders`
- [x] Seed services/packages
- [x] Seed demo users and practitioners
- [x] Seed specialties and initial slots

`backend/routes`
- [x] Consolidate v1 API routes

`src/design`
- [x] Tokens and primitives for reusable UI layer
- [x] Intake pattern components (stepper/title)

`src/app/features/shared/services`
- [x] API service module with backend-ready contracts

`src/app/features/auth`
- [x] Real login/register integration
- [x] Session persistence and logout

`src/app/features/client`
- [x] Profile page wired to API
- [x] Appointment page wired to API
- [x] Intake flow page with state machine

`src/app/layout`
- [x] Mobile-first dashboard shell + bottom nav
- [x] Sidebar collapse/expand behavior

`src/app/routes`
- [x] Add client intake route and role-protected flow

`public + vite config`
- [x] PWA manifest and service worker setup
- [x] Install prompt integration

