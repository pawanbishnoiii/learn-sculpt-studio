# Complete Chronodeck migration and dashboard upgrade

## Outcome
Rebuild the GitHub main branch in this project, restore the `a@a.a` learner's old profile and study history, and deliver a polished mobile/desktop study experience based on the supplied visual references.

## Build plan
1. **Clone the complete app**
   - Transplant all public, signed-in, admin, study, timer, timetable, targets, history, profile, settings, onboarding, and class screens.
   - Preserve working AI, notifications, realtime updates, PWA behavior, metadata, and error states where their required configuration is available.

2. **Recreate the database safely**
   - Reconstruct the full application schema from the uploaded PostgreSQL backup, then apply the repository's newer migrations.
   - Preserve row-level access rules, roles, triggers, planning logic, session tracking, recommendations, and profile setup.
   - Import only the old records owned by `a@a.a`, plus required shared catalog/settings records, in dependency order.

3. **Make `a@a.a` login work**
   - Enable email/password login.
   - Implement the approved one-time activation: the first successful signup for `a@a.a` creates the new identity and securely attaches the pre-imported profile, settings, subjects, history, targets, timetable, classes, and recommendations.
   - Keep password reset available, while clearly handling the dummy email limitation.

4. **Upgrade Today**
   - Keep **Day** selected by default.
   - Remove question/test-style analytics from Today.
   - Show the day's first study start, latest reading/online-class exit, total focused time, and measurable output per time spent.
   - Convert key Today blocks into the supplied draggable widget grid, responsive across phone and desktop, with saved order and keyboard/touch support.

5. **Upgrade mobile navigation and visuals**
   - Replace the five-item phone dock with a complete, accessible Liquid Morph Floating Menu for Home, Timetable, Study, Targets, and History.
   - Use the uploaded Rive animojis where static/basic icons or empty states benefit from animation.
   - Apply a bold pastel clay-inspired system based on the references, using a suitable rounded display/body font pairing and smoother, restrained motion.
   - Reuse and extend the app's clay illustrations across sparse study, welcome, and dashboard states.

6. **Production verification**
   - Validate schema security, account activation, restored data visibility, live timers, recommendations, draggable layout persistence, navigation, and all major routes.
   - Check phone and desktop layouts for overflow, overlap, animation smoothness, and loading/error states.

## Technical notes
- The uploaded backup is treated as data, never executed wholesale. Managed/internal schemas and secret material are excluded.
- Existing user IDs will be mapped to the newly activated account so ownership remains correct.
- Widget layout persistence will be user-scoped in the database rather than browser-only storage.
- The source contains one legacy server function; app-internal behavior will use the current TanStack server runtime.
