# Bnoy Study production upgrade

## Goal
Turn the current app into **Bnoy Study** with fast, responsive student and admin experiences, reliable offline study capture, richer class-media management, secure account restoration, export history, and a revision-first planning engine. Existing study data and working features remain intact.

## 1. Branding, visual system, navigation, and loading
- Rename visible product copy, metadata, manifest labels, exports, notifications, and default app settings from Chronodeck to **Bnoy Study**.
- Keep the existing fire, sky, white, purple, mint, and peach direction, but rebalance day/night tokens for stronger contrast and layered backgrounds without heavy effects.
- Rebuild the bottom Liquid Morph menu to match the supplied interaction: compact yellow pill, expanding dark liquid layer, five animated letter-flip rows, current-page icon/label, hamburger-to-close motion, outside-click close, haptics, and reduced-motion support.
- Add the supplied smooth gooey loader as a theme-aware component and use it for route transitions and expensive operations; retain content-shaped skeletons where they avoid layout jumps.
- Remove the Rive “icon sheet” from Today analytics and use individual lightweight vector icons there.
- Upload and use the supplied Lottie files only in meaningful states: task completion, empty learning library, and error/not-found. Keep Today mobile free of decorative animation.

## 2. Desktop admin rebuild
- Fix the layout bug shown in the screenshot: admin routes currently inherit the student desktop grid even when its sidebar is hidden, squeezing content into a narrow column.
- Give admin routes their own full-width desktop workspace with a stable collapsible sidebar, readable headers, bounded tables, and proper mobile drawer navigation.
- Replace hand-built sheets and user-detail overlays with the reusable height-animating **Animated Drawer** on phones and a wide side drawer on desktop.
- Connect `AdminUsersTable` to Users & roles, including search, sorting, roles, login/device history, per-user export/import, and a selected-user management workspace.
- Add selected-user tabs for profile, plan, targets, timetable, study history, and transfers. Privileged changes stay server-authorized by admin role.
- Keep Notifications, Schedule, Data transfer, Branding, Android, Activity, and Settings pages desktop-width and prevent card/text overlap at every breakpoint.

## 3. Secure past login and faster responses
- Preserve normal persisted login sessions and refresh valid sessions automatically on return; show a branded restoring-session screen while identity is checked.
- Never grant access from an email remembered in browser storage. Expired/revoked sessions return to sign-in securely.
- Reduce duplicate requests by setting sensible query caching defaults, sharing query keys, prefetching likely next screens, and removing unnecessary global invalidations/refetches.
- Lazy-load large animation/chart/media viewers and keep costly work off initial page paint.
- Add clear offline, syncing, synced, and failed states rather than blocking screens.

## 4. Offline study mode
- Add a guarded offline app shell for the published app only; it will never register in Lovable preview/dev.
- Create an IndexedDB queue for reading, revision, class, practice, break, and daily-plan changes.
- Apply offline actions optimistically, preserve timer timestamps across reloads, and sync sequentially when connectivity returns.
- Make queued writes idempotent so reconnects cannot create duplicate sessions or plan completions.
- Surface pending item count and per-item retry failures; users can retry or discard failed local actions.

## 5. Classes as a folder-based study library
- Upgrade Classes into an app-like subject → chapter → topic folder browser with search, breadcrumbs, recent files, and revision-due sections.
- Add a private study-media model and private storage for PDFs, images, videos, and common documents, including validated size/type metadata, ordering, rename, delete, download, and upload progress.
- Provide inline PDF/image/video preview; unsupported documents get a safe download action.
- Preserve the existing chapter PDFs by reading them alongside the new media library rather than deleting or breaking them.
- Connect completed classes and attached study material to the existing spaced-revision queue and daily plan.

## 6. User exports and transfer history
- Keep complete ZIP export/import for profile, subjects, chapters, sessions, targets, timetable, outcomes, notes, and media.
- Add a private export-history list with creation date, content summary, size, status, download, and delete controls.
- Store generated exports privately with expiry/cleanup support; users can download any still-available export.
- Validate import manifests and files before writing, show an Animated Drawer preview, preserve current data by default, and report skipped/failed rows instead of silently ignoring them.
- Record admin-created transfers in the selected user’s audit history.

## 7. Revision, syllabus coverage, streak, and daily automation
- Keep the requested weighted day progress: new reading 20%/hour, revision 25%/hour, online class 15%/hour, and normal newspaper reading.
- Correct the weekly three-day lifeline so it is consumed once per week, persists in the database, and does not manufacture unlimited historical streak days.
- Extend the planning score with overdue revision, weak recall/test accuracy, uncovered syllabus chapters, deadlines, class-note revisions, target deficits, and recent workload balance.
- Add explicit syllabus coverage and next-revision recommendations to Today/Study.
- Extend the authenticated cron route to close stale sessions, dispatch due notifications/emails, refresh each user’s local-day plan safely, and clean expired exports.
- Add scheduled email jobs and admin controls alongside scheduled notifications, with delivery status and error history.

## 8. Settings and documentation
- Expand student Settings with app appearance, study goals, week start, timer defaults, offline-sync status, notification preferences, and export retention information.
- Keep global app controls in Admin Settings, including site identity and sign-in provider toggles; Google availability remains controlled through secure backend configuration.
- Add `/doc` with a searchable overview of every student/admin page, main workflows, components, offline behavior, study scoring, data transfer, media support, and deployment notes.
- Add unique Bnoy Study metadata to every content route.

## 9. Data safety and verification
- Apply additive database migrations only, with grants, row-level access rules, validation, indexes, and admin checks for every new table/function.
- Verify the restored `a@a.a` account end-to-end: sign-in/session restore, expected backup counts, daily-plan refresh, weighted streak, lifeline state, Classes library, offline queue/reconnect, export history, and admin selected-user actions.
- Test desktop and phone layouts with screenshots, especially all admin pages, drawers, the floating menu, Today, Study, Timer, Classes, Profile, and Docs.
- Run targeted tests and the project’s automatic production checks; document any backup rows that cannot be restored rather than claiming they exist.

## Technical notes
- New backend records: study media/folders, export history, offline mutation receipts, streak lifeline usage, and scheduled email jobs.
- User-scoped operations use normal authenticated access; admin operations use protected server functions with server-side role checks.
- The offline worker uses the existing PWA tooling with preview guards and network-first navigation.
- Existing uploaded animations are stored through the project asset system; large JSON is not bundled into every route.
