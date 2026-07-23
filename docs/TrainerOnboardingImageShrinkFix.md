# Fix trainer-onboarding hero image shrinking on step 2+ (Continue click)

## Context

Earlier in this session, the "Welcome" step of `/trainer/onboarding` (full name + gender screen, rendered by `TrainerWelcomeScreen` in `src/app/features/trainer/TrainerOnboardingPage.tsx`) had its left-side illustration either cropped or invisible. Root cause: Tailwind custom variants `short`/`shorter`/`shortest` (defined in `src/styles/tailwind.css` as `max-height: 760px/700px/680px` media queries, with no width component) were applied **bare** (e.g. `shorter:h-[28dvh]`, `shorter:max-h-[13dvh]`) instead of combined with a width qualifier. On a desktop-width browser window that also has a short viewport height (extremely common — normal tab/address/bookmarks-bar chrome easily eats 150-200px), these bare rules won the CSS cascade over the intended `lg:h-auto`/`lg:h-full`/`lg:max-h-full` desktop sizing, wrongly shrinking/clipping the image. This was fixed in `TrainerWelcomeScreen` by prefixing the mobile-only-intended rules with `max-lg:` (e.g. `shorter:h-[28dvh]` → `max-lg:shorter:h-[28dvh]`), scoping them so they can never fight the desktop rule. Verified fixed via real-browser screenshots (Puppeteer + local Chrome) across viewport heights 600–1000px: image and cards render fully, no clipping, no scroll.

The user has now confirmed (via two screenshots) that clicking **Continue** from the Welcome screen navigates to the next onboarding step ("When were you born? / Date of birth"), and on that screen **the same left-side illustration shrinks to a much smaller size**, even though only the right-side form content should differ between steps.

Investigation (Explore agent, read-only) found the next step is rendered by a **different** function in the same file — `TrainerApplicationScreenShell` (~line 2694–2872) — which reuses the identical illustration asset (`trainerWelcomeIllustration`) in its own hero markup (~lines 2756–2768). That image's className still has **exactly one** bare, unscoped occurrence of the same bug:

```
lg:h-full lg:max-h-full lg:w-auto lg:max-w-full shorter:max-h-[13dvh]
```
(line 2766) — `shorter:max-h-[13dvh]` has no `lg:`/`max-lg:` qualifier, so at any desktop-width-but-short-height viewport it overrides `lg:h-full`/`lg:max-h-full` and crushes the image down to `13dvh` (e.g. ~91px tall at a 700px-tall viewport) — matching exactly what the user's second screenshot shows.

A full-file grep (confirmed by the Explore agent) shows this is the **only remaining occurrence** of the bug pattern anywhere in `TrainerOnboardingPage.tsx` — every other `short:`/`shorter:`/`shortest:` usage is already either correctly chained with `lg:` (e.g. `short:lg:h-[230px]`) or already fixed (`max-lg:shorter:...` at lines 2556/2564 from the earlier fix). `ProfessionalOnboardingPage.tsx` and the rest of `src/` don't use these custom variants at all, so no other file is affected.

Note: `TrainerApplicationScreenShell`'s hero `<section>` (line 2758) has **no className at all** (unstyled) — unlike `TrainerWelcomeScreen`'s hero section, it has no `overflow-hidden`/conflicting `min-h` to also fix. This one image-class fix is sufficient here; the two hero sections are not fully structurally parallel, but that's out of scope — only the reported shrinking bug needs fixing.

## Fix

In `src/app/features/trainer/TrainerOnboardingPage.tsx`, on the `<img>` at line 2766 (inside `TrainerApplicationScreenShell`), change:

```
shorter:max-h-[13dvh]
```
to
```
max-lg:shorter:max-h-[13dvh]
```

This is the exact same one-line-class edit already applied and verified at line 2564 for `TrainerWelcomeScreen`'s image — no other changes needed.

## Verification

1. `npm run typecheck` and `npm run build` — confirm no new errors (matching the same checks already run after the first fix; baseline was 20 pre-existing unrelated errors).
2. Visually verify in the browser: navigate to `/trainer/onboarding`, fill in the Welcome step, click Continue, and confirm the illustration on the "When were you born?" step now renders at full size (matching the Welcome step's image size) across both a tall browser window and a shorter one (e.g. resize the window to test near the 700-760px height range where the bug manifested).
3. Re-use the same real-browser verification approach from the earlier fix if needed (a temporary Puppeteer + local Chrome script driving the already-running Vite dev server at `localhost:6026`, injecting `wc_auth` + `wc_trainer_onboarding_v3` localStorage to reach the authenticated onboarding screens directly) to screenshot this specific step at a few viewport heights (e.g. 650, 700, 900) and confirm the image is full-size and not clipped, then clean up the temporary script/package afterward.
