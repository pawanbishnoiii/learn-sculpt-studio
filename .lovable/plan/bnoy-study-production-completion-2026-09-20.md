# Bnoy Study production completion

## Goal
Complete the requested Classes media library, admin automation, revision engine, responsive layouts, theme controls, timer preferences, loader, and production verification without removing current working study data or offline behavior.

## What will be built

### 1. Classes media library
- Generalize chapter uploads from PDF-only to private PDF, image, video, and common document files.
- Preserve subject → chapter → topic organization and ordered multi-file uploads.
- Add file-type, subject, chapter, and topic filters plus search.
- Show inline PDF, image, and video previews; unsupported formats receive safe download actions.
- Add per-file validation, upload state, partial-failure reporting, rename/reorder/delete/download controls, and phone-friendly rows.
- Update the private storage bucket rules and limits so permitted uploads work securely for their owner.

### 2. Admin revision engine and daily plans
- Add global revision defaults and per-user overrides controlled by admins.
- Support a 5–10 revision target, odd/even/all-day subject rotation, and the 1/3/7/15/30-day ladder.
- Apply the same schedule to completed chapters and completed online-class notes.
- Generate due revision and class items inside each user’s daily plan with overdue, coverage, recall, target, and workload priority signals.
- Add selected-user plan refresh and revision controls to the admin workspace.

### 3. Scheduled automation and transfers
- Upgrade the authenticated daily automation endpoint to close stale sessions, refresh local-day plans, schedule due revisions/classes, dispatch notifications and scheduled emails, and clean expired exports.
- Keep the job idempotent and isolate failures so one task cannot block the rest.
- Add scheduled-email records, delivery status, errors, and admin create/cancel controls.
- Harden selected-user import/export with validation, a preview, audit history, and export-history download/delete actions.
- Use one daily schedule for plan generation; due messages use the existing bounded dispatcher rather than unnecessary frequent database polling.

### 4. Interface and preferences
- Make Admin, Users, and Classes genuinely usable on phones through stacked summaries, compact actions, drawers, and overflow-safe content.
- Add the requested theme-aware gooey loader as `loader-10` and use it for expensive operations and page restoration states.
- Add user-selectable background appearance while preserving light/dark modes.
- Add Timer toggles for background effects, detail visibility, sounds/haptics, and keeping the screen awake.
- Refine Today’s live day timeline, focus/break/output analytics, revision recommendations, and mobile layout without decorative animation on phones.

### 5. Verification
- Add route-specific Bnoy Study metadata where still missing.
- Verify uploads, previews, filters, plan generation, revision progression, admin actions, scheduled work, theme/timer preferences, offline reconnect, and error states.
- Test Admin, Users, Classes, Today, Settings, and Timer at desktop and phone widths and fix overlap or blank states.
- Confirm automatic build checks and browser console/network health.

## Technical details
- Backend changes are additive, row-protected, explicitly granted, indexed, and server-authorized for admin actions.
- User files remain private; signed links are generated only for the authenticated owner or an authorized admin transfer.
- Revision advancement is server-authoritative rather than trusting the device clock.
- Existing chapter PDFs, online classes, daily plans, exports, and offline queue remain compatible.
- The missing `bs555_260917.backup` cannot be restored until it is uploaded again; all other requested work can proceed independently.
