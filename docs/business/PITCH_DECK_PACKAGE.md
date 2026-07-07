# Investor Pitch Deck Package (MVP)

## 12-Slide Storyline
1. Problem: Fragmented wellness journey across counselling, training, support, and operations.
2. Why now: Rising blended mental + fitness demand with poor workflow continuity.
3. Product vision: One role-based platform that unifies care + operations.
4. Role ecosystem: Client, Counsellor, Trainer, Helpdesk, Admin, Content.
5. End-to-end journey: Intake -> care matching -> sessions -> progress -> support.
6. Live demo storyline: Walkthrough of role flows and escalation paths.
7. Differentiation: Workflow continuity, escalation discipline, role-ready architecture.
8. Architecture/readiness: React role UI + API contracts + deterministic demo mode.
9. GTM wedge: High-touch clinics/studios needing integrated wellness operations.
10. 90-day milestones: Core role modules, quality gates, compliance hardening.
11. Risks + mitigation: Compliance, SLA misses, adoption friction and controls.
12. Ask: Pilot partners, strategic intros, and funding for module completion.

## Slide-to-Route Mapping
- Slide 5-6: `/client/intake?demo=1`, `/client/appointments?demo=1`, `/client/programs?demo=1`
- Slide 6 (counsellor): `/counsellor/sessions?demo=1`, `/counsellor/clients?demo=1`
- Slide 6 (trainer): `/trainer/plans?demo=1`, `/trainer/check-ins?demo=1`
- Slide 6 (helpdesk): `/helpdesk/tickets?demo=1`, `/helpdesk/knowledge-base?demo=1`
- Slide 6/8 (admin): `/admin`, `/admin/escalations`
- Slide 6 (content): `/content/programs?demo=1`, `/content/assets?demo=1`

## Demo Claims Checklist
- Each core role has visible happy path and exception path.
- No placeholder dead-end in core role navigation.
- Booking and schedule flow works with deterministic seed data in demo mode.
- Escalation states are visible and explainable during live walkthrough.
