# Chronodeck production upgrade

## Goal
Turn the current app into a polished clay-style study workspace with a true Liquid Morph phone menu, clearer one-choice-at-a-time study setup, hierarchical class materials, offline mobile study, consistent streak scoring, richer admin insights, and restored legacy data for account `984c3007-36da-4b40-abce-b95566c246a6`.

## Experience and visual system
- Replace the plain grid-only canvas with layered semantic backgrounds: soft sky wash, white working surfaces, fire/orange energy accents, purple highlights, and restrained texture. Keep dark mode rich and readable rather than simply inverted.
- Use the supplied multi-screen references as composition guidance, not embedded screenshots.
- Generate a new clay study illustration set that matches the fire + sky + white + purple palette. Use the main illustration only on desktop; phones get a lighter, faster layout without decorative hero art.
- Keep Fredoka/Nunito as the rounded clay typography base, refine heading weights and multicolor emphasis, and preserve Devanagari fallback.
- Use supplied Lottie and Rive assets where their artboards render correctly. Add purposeful animation to empty states, milestones, study launch, and navigation; respect reduced-motion and avoid heavy animation on phones.

## Mobile Liquid Morph navigation
- Rebuild the existing five-item bottom menu around the supplied Liquid Morph behavior while keeping Chronodeck destinations: Home, Timetable, Study, Targets, History.
- Use a compact floating pill, an expanding dark liquid layer, spring-based morphing, safe-area spacing, touch-first interactions, and no hover dependency on phones.
- Keep all five destinations visible and directly tappable; make Study the visual center action.
- Replace the current viewport-based indicator math with measured container positions so it stays aligned on phones, landscape, tablets, and foldables.
- Add haptic feedback when supported for menu selection, study start/stop, break/resume, successful upload, and streak milestones.

## Study setup and weekly planning
- Refine Study into a strict three-step flow: Subject → Chapter/topic → Session.
- At every choice point, selecting one option collapses the unselected options into a compact selected-control pattern; users can tap Change to reopen the list. Only one active choice is shown after selection.
- Keep timetable/daily-plan prefill, but show the chosen values clearly before starting.
- Add validation, empty-chapter handling, and a single unambiguous Start timer action.
- Let users adjust weekly topic targets per subject with compact steppers/inputs and save them to their existing subject target records.

## Classes and study materials
- Redesign Classes as a desktop-friendly and mobile-friendly workspace with a clear Subject → Chapter → Topic/PDF hierarchy.
- Use relational chapter IDs where available while retaining safe compatibility with existing chapter names.
- Allow multiple PDFs and other supported study materials per topic, ordered in a series.
- Add upload validation, progress, reorder controls, inline PDF preview, download, rename/delete, and clear empty/loading/error states.
- Cache selected subject, chapter, topic, and PDF metadata for offline browsing. Actual PDF files become optionally downloadable for offline use rather than silently caching every large file.

## Offline study mode
- Add a guarded production-only PWA service worker using `vite-plugin-pwa`; never register it in Lovable preview or development and preserve the existing Firebase messaging worker.
- Cache the app shell and selected study metadata in IndexedDB. Provide explicit “Available offline” controls for chosen subjects/chapters and selected PDFs.
- Queue offline session starts/stops, breaks, outcomes, target edits, and note metadata changes with stable client operation IDs.
- Sync automatically on `online`, app resume, and foreground refresh. Show Offline, Syncing, Synced, and Needs attention states.
- Use conflict-safe, idempotent server writes; server timestamps remain authoritative. Offline works on the published/installable app, not the editor preview.

## Progress and streak algorithm
- Make one database-backed source of truth for both Today and the top navigation.
- Activity progress per 60 focused minutes:
  - first-pass/new-topic reading: 20%
  - revision: 25%
  - online class: 15%
  - newspaper reading counts as normal reading time
- Prorate partial hours and cap each day’s completion at 100%. Store an auditable daily breakdown by activity type.
- A streak is earned from qualifying daily progress. If a day is missed, one weekly shield can preserve the streak for up to three consecutive days; that shield can activate only once in the same calendar week.
- Track current streak, best streak, shield state, days remaining, last qualifying date, and weekly shield usage in the backend. Recalculate imported history safely and remove the competing 48-hour/client-only rules.
- Update Today with a concise completion breakdown, lifeline status, and clear explanation of what moved the score.

## Profile data transfer
- Keep the existing ZIP export/import and make it reliable and complete: profile, subjects, chapters, topics, sessions, breaks, outcomes, targets, timetable, classes, notes, PDFs, reading logs, XP/streak state, and user-owned preferences.
- Add export progress, import validation, duplicate detection, idempotency, per-section results, and a visible partial-failure report instead of silently skipping rows.
- Never transfer roles, device tokens, raw IP/login telemetry, admin data, or another user’s private notifications.

## Admin desktop workspace
- Make every admin page use a consistent wide desktop shell, dense tables, sticky controls, responsive columns, and readable empty/loading/error states.
- Users page becomes a proper sortable/searchable table. Selecting a row opens a wide detail panel with profile, subjects, chapters, sessions, breaks, targets, PDFs, streak/score history, and login/device activity.
- Keep role changes server-authorized. Improve per-user import/export with preview and results.
- Capture real sign-in events server-side. Store server-observed IP, user agent, platform, device/browser labels, screen size, language, standalone state, and best-effort connection type.
- Do not claim ISP/network-provider accuracy: browsers do not expose it reliably. Show connection type where supported and “Unavailable” otherwise.
- Add retention-conscious login history and keep telemetry admin-only.

## Today page quality pass
- Audit every section for duplicate metrics, question/test remnants, mobile overflow, loading behavior, and expensive re-renders.
- Keep day-first analytics: first study start, last end, focused time, breaks, output, weighted completion, and subject contribution.
- Keep draggable widgets on desktop and stable stacked cards on phones. Persist the layout per user.
- Replace the current desktop hero artwork with the generated clay illustration; keep it hidden on mobile.

## Backup restore
- Extract only the target account’s public study data from `bs555_260917.backup`; do not restore managed auth/storage schemas wholesale.
- Remap and restore the target account’s linked rows in dependency order while preserving stable relationships and avoiding duplicates.
- Restore data to `984c3007-36da-4b40-abce-b95566c246a6`. If that identity is not yet present in authentication, stage the public data and attach it when the matching account exists; never fabricate a password.
- Verify row counts across profile, subjects, chapters, sessions, breaks, targets, reading logs, classes, notes, plan items, XP, and activity after import.

## Technical implementation
- Add migrations for offline operation IDs/sync bookkeeping, authoritative daily progress/streak state, and admin-only login audit records with full grants, RLS, indexes, and server functions.
- Use authenticated TanStack server functions for user mutations and admin reads. Privileged reads occur only after a server-side role check.
- Keep Firebase messaging separate from the generated app-shell service worker.
- Extend app metadata for installability and keep all route-specific title/description/Open Graph/Twitter metadata complete.

## Verification
- Run focused logic tests for weighted progress, daily caps, weekly shield activation, three-day expiry, DST/date boundaries, and offline replay idempotency.
- Verify Study, Classes, Profile transfer, Today, all admin pages, navigation, haptics fallback, offline/online recovery, and PDF preview/download on phone and desktop.
- Verify reduced motion, keyboard navigation, touch targets, no overlapping text, and smooth transitions.
- Confirm the target backup row counts after restore and run the project type checks/tests before completion.

## Delivery boundaries
- Rive Community assets cannot be copied from the linked website without downloadable source/license permission; the uploaded `.riv` file and supplied animations will be used where technically compatible.
- Raw network provider/ISP names are not reliably available in browsers; only best-effort connection type plus server-observed IP will be recorded.
