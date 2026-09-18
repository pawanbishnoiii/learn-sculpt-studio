# Chronodeck production UI and admin upgrade

## Goal
Bring the remaining screens up to the colourful clay-style mobile quality shown in the supplied references, while completing the classes workflow and a secure multi-page admin workspace.

## What will change

### 1. Mobile visual system and supplied assets
- Use the supplied `STUDENT.json` and `Girl_with_books.json` animations as the main study/classes illustrations.
- Keep the supplied `Fire.json` animation for streaks.
- Use the supplied 404 animation for the app’s unavailable/error state.
- Preserve the pastel clay palette, but tighten typography, spacing, contrast, shadows, and dark-mode surfaces to match the reference screens.
- Add reusable colourful bento-card and clay-illustration treatments so Today, History, Classes, and admin summaries feel like one product.

### 2. Floating mobile navigation
- Replace the current simplified bar with the supplied Liquid Morph interaction: expanding dark shape, spring transition, animated selection, and five destinations.
- Adapt it for touch-first use: no hover dependency, safe-area support, clear active state, and one-tap navigation for Home, Timetable, Study, Targets, and History.
- Keep desktop navigation unchanged and keep the mobile control usable with reduced-motion enabled.

### 3. Classes page rebuild
- Recompose `/classes` as a mobile-first bento screen with an animated student header, scheduled/completed metrics, live versus recorded categories, and a prominent add-class action.
- Turn the notes-revision queue into colourful progress cards with due/overdue state and pass progress.
- Upgrade class cards with subject/chapter context, duration, link launch, completion control, and safe deletion.
- Keep all current add, complete, revise, and delete actions connected to live data.

### 4. Admin dashboard and sidebar
- Add the supplied Dashboard Sidebar as a reusable component, adapted to real Chronodeck routes instead of mock content.
- Support desktop collapse/expand, active-route highlighting, grouped navigation, mobile drawer access, and a persistent way to reopen it.
- Keep the existing `/admin/pagename` structure and organize it into Overview, Users, Activity, Data transfer, Schedule, Notifications, Branding, Android, and Settings.
- Restyle admin pages into a dense, scannable workspace with colourful KPI tiles and production-safe loading, empty, and error states.

### 5. Users, history, login activity, import/export
- Add a dedicated user-detail page showing profile, last seen, sign-in count, subjects, targets, reading totals, study history, breaks, recent activity, and platform/device information.
- Add an admin Activity page for sign-in/app-open/page-view history with user, path, platform, and timestamp filters.
- Add a Data transfer page for user export/import with file validation, clear progress, confirmation before replacement, and post-import refresh.
- Keep all privileged reads/writes behind the existing authenticated admin server functions; expand those functions only for the new user/activity views.
- Improve import ordering and validation so linked study records restore reliably without exposing private keys or bypassing user access rules.

### 6. Responsive and production checks
- Keep the supplied Draggable Widget Grid on desktop Today analytics and the stable stacked mobile layout.
- Verify Classes, Today, History, the floating menu, every admin route, user detail, import/export, light mode, and dark mode at phone and desktop sizes.
- Check keyboard/touch behavior, text overflow, safe-area spacing, asset loading, console/network errors, route metadata, and reduced motion.

## Technical details
- New/updated UI will use existing semantic design tokens and shared Button controls; no hardcoded page-level colour system.
- New admin pages will be TanStack file routes created in the same change as their navigation links.
- Existing database tables are sufficient; no schema migration is planned unless verification uncovers a missing field that cannot be derived from `profiles`, `app_events`, `device_tokens`, and study tables.
- Uploaded animation files will be stored through the project asset flow and loaded with the existing Lottie player.
