# Study wizard, chapter PDFs, and personal data transfer

## 1. Study page as a 3-step flow
Rebuild `/study` into a guided three-step setup, then start the timer:

1. **Subject** — pick from your subjects (search + quick add).
2. **Chapter / topic** — pick a chapter of that subject, or type a topic; today's plan items can prefill this step.
3. **Session** — choose kind (reading, revision, class, practice), planned end time, then **Start timer**.

A progress bar shows step 1/2/3, back/next controls, and the step is only unlocked once the previous one is chosen. Existing timetable/plan prefill keeps working and jumps straight to the last step.

## 2. PDF notes per topic (Classes page)
- On the Classes page, a user picks a **subject → chapter/topic**, then uploads one or more PDFs to that topic.
- Multiple PDFs per topic, kept in **sequence order** (auto-numbered, drag or arrow to reorder).
- Each PDF card shows name, size, page order number, and actions: **Preview** (inline viewer in a sheet), **Download**, **Delete**.
- Chapter view lists its PDFs series-wise so a chapter reads like an ordered set of notes.
- Files are stored in a private storage bucket, one folder per user, so nobody else can read them.

## 3. Export / import your own data (Profile page)
- **Export**: one button produces a single file containing profile info, subjects, chapters, study history, sessions/breaks, reading logs, targets, timetable, classes, and the PDF list with the PDF files bundled in.
- **Import**: another user can upload that file into their own account; everything is recreated under their user id, including re-uploading the PDFs.
- Before importing, a confirmation shows what will be added, and duplicates are skipped rather than wiping existing data.

## 4. Today page
- Hide the decorative animations on phone screens (they stay on desktop), so mobile stays fast and clean.
- Refresh Today with live data: day start / last exit, focused time, break time, output, plan progress, and streak — all read from the database, with proper loading and empty states.

## Technical details
- New table `chapter_notes` (user_id, subject_id, chapter_id/chapter_name, title, storage_path, file_size, mime, position) with RLS scoped to `auth.uid()` and grants for `authenticated`/`service_role`.
- New private storage bucket `chapter-pdfs` with owner-only RLS policies on `storage.objects`; PDF preview/download uses short-lived signed URLs.
- Export builds a ZIP (JSON manifest + `pdfs/` folder) client-side; import parses the ZIP, inserts rows in dependency order (subjects → chapters → notes → sessions), and re-uploads PDFs under the importing user's folder.
- Study wizard is a local step state machine in `src/routes/_authenticated/study.tsx`; no change to `startSession`.
- Mobile animation suppression via existing `useIsMobile` + CSS, not by removing desktop assets.
