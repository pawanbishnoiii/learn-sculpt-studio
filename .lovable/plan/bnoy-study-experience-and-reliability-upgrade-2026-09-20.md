# Bnoy Study experience and reliability upgrade

## Goal
Make Classes/media reliable, fix data portability, apply the uploaded B logo, add richer personal themes and backgrounds, show the supplied Gooey Loader during meaningful waits, and strengthen the habit/level experience across student and admin screens.

## What will change

### 1. Fix uploads and redesign Classes
- Keep `chapter-pdfs` private and verify its 50 MB limit and owner-only access rules.
- Preserve subject → chapter → topic organization, but rebuild the Classes screen as a responsive folder/media workspace.
- Add drag/drop and file picker uploads, batch progress, exact per-file error messages, safer delete confirmation, and clearer empty/loading states.
- Keep PDF, image, video, and document preview/download; make mobile actions compact and desktop layout wider.

### 2. Fix and expand data transfer
- Accept current `bnoy-study-user-export` files plus legacy `chronodeck-user-export` files.
- Offer two exports/imports:
  - **Full account:** profile, preferences, goals, subjects, chapters, plans, history, XP/streak, classes, revisions, and study media.
  - **Study package:** subjects, chapters, study/history records, classes/revisions, and media, without replacing personal identity.
- Validate before import, show a detailed preview, preserve existing data, remap relationships, report skipped/failed rows, and never silently claim success.
- Do not restore or import the uploaded file automatically; users control imports themselves.

### 3. Brand, loader, and visual system
- Replace visible app branding and favicon with the uploaded B logo.
- Use the requested Gooey Loader after sign-in, during route/network waits, and for genuinely incomplete page data; keep skeletons where they prevent layout jumps.
- Add layered Pipo-inspired peach/sky/paper backgrounds, subtle texture, stronger clay surfaces, polished buttons, and restrained smooth motion with reduced-motion support.
- Keep all current illustrations/icons and add a cohesive set of new clay study-card artwork where pages need stronger visual cues.

### 4. Personal themes and backgrounds
- Expand settings beyond clean/grid/colorful into multiple named background choices with live previews.
- Persist each user’s light/dark choice, background, and accent profile.
- When gender is female, suggest a girl-inspired palette once; never lock it, and let the user select any theme afterward.
- Keep timer visual, detail, sound/haptic, and keep-awake controls connected to user settings.

### 5. Discipline, tasks, XP, and levels
- Surface XP, level progress, next milestone, streak, and daily goal in student screens.
- Use the uploaded `user-level.riv` for level progress/celebration and `bee-baby.riv` for encouraging task feedback.
- Upgrade daily tasks with clearer priority, completion momentum, recovery after missed days, and positive discipline/consistency messaging without punishment loops.
- Increase suggested daily targets gently by level, capped to avoid unrealistic goals; users can still edit their targets.
- Keep task completion and XP calculations server-authoritative and compatible with offline sync.

### 6. Admin and performance pass
- Improve every admin page for wide desktop and small mobile layouts, including tables, drawers, navigation, status/loading states, and content density.
- Add user level/progress visibility and preserve private role validation.
- Review expensive/repeated reads, query caching, media loading, and page transitions; avoid adding heavy libraries where current React, Rive, Motion, and GSAP already cover the need.

### 7. Verification
- Test sign-in with the provided account without storing its password in code.
- Test valid/invalid full and study-package imports, multi-file upload, previews, downloads, deletion, theme persistence, gender suggestion, level progression, offline/reconnect behavior, and admin/student responsive layouts.
- Check current build/runtime/network signals and key routes at mobile and desktop sizes.

## Technical details
- Database changes will extend user appearance/progression settings only where current columns are insufficient, with owner-only access rules and explicit grants.
- Storage remains private; file paths stay scoped to the signed-in user.
- Uploaded binaries will use the app asset flow; the favicon remains a real optimized file in `public/`.
- No automatic backup restore, no password hardcoding, and no replacement of the existing router or backend architecture.
