# Pre-Demo Readiness Audit

Date: 2026-06-08  
Repo: `SSG-Platform-v03`  
Scope: source audit only; no code changes, builds, or tests were run for this report.

## Readiness Verdict

Status: **Not ready**

The most important reason is authority drift between White Cell and Game Master. The current White Cell console exposes real session-admin controls and the backend RPC chain accepts White Cell grants for create-session, delete-session, and participant-removal operations. In a live seminar run, that means a White Cell operator can delete the active session or remove seats during the demo from the same interface they are expected to use for adjudication and comms. The next most visible risk is failure aesthetics: backend drift and RLS/RPC faults are wired through to user-facing toasts as raw Supabase/Postgres messages.

## Scope and Method

This audit focused on demo-visible failures rather than general code quality. The review traced actual browser paths and backend contract files for:

- landing and join flow
- White Cell and Game Master authority boundaries
- export and research mode gating
- runtime configuration and Pages deployment contract
- visible product naming and live-demo UX consistency

Primary files inspected:

- `README.md`
- `LIVE_DEMO_BACKEND_ALIGNMENT.md`
- `RESEARCH_EXPORT_SPECIFICATION.md`
- `SUPABASE_BLANK_PROJECT_RUNBOOK.md`
- `.env.example`
- `.env.local`
- `.github/workflows/deploy-pages.yml`
- `index.html`
- `master.html`
- `whitecell.html`
- `src/roles/landing.js`
- `src/roles/gamemaster.js`
- `src/roles/whitecell.js`
- `src/roles/notetaker.js`
- `src/services/database.js`
- `src/services/supabaseMock.js`
- `src/core/errors.js`
- relevant SQL files under `data/`

## Severity Summary

| ID | Title | Severity | Roles affected | Data-flow stage | Primary file(s) |
| --- | --- | --- | --- | --- | --- |
| F1 | White Cell can perform Game-Master-only session admin | Demo-Blocker | White Cell lead/support, Game Master, participants | White Cell UI -> browser RPC -> Supabase RPC | `whitecell.html`, `src/roles/whitecell.js`, `src/services/database.js`, `data/2026-04-17_white_cell_backend_alignment.sql` |
| F2 | Raw Supabase / SQL / RLS errors leak into user toasts | High | Participants, White Cell, Game Master, facilitators | Join/auth/write failure -> error mapper -> toast | `src/core/errors.js`, `src/roles/landing.js`, `src/roles/whitecell.js`, `src/roles/gamemaster.js`, `README.md` |
| F3 | Research export mode defaults contradict the spec and fail open | Medium | Game Master, White Cell | Runtime config -> export gating | `RESEARCH_EXPORT_SPECIFICATION.md`, `README.md`, `SUPABASE_BLANK_PROJECT_RUNBOOK.md`, `data/2026-06-04_research_export_capture.sql`, `src/roles/gamemaster.js`, `src/roles/whitecell.js` |
| F4 | Tracked `.env.local` breaks the repo's own runtime-config contract | Medium | Rehearsal operators, deploy owners | Local config -> runtime selection | `.env.example`, `.env.local`, `README.md`, `.github/workflows/deploy-pages.yml` |
| F5 | Landing screen still uses the wrong public product name | Cosmetic | Audience, participants, operators | First paint / projected landing UI | `index.html`, `README.md`, `whitecell.html`, `master.html`, `src/roles/landing.test.js` |

## Detailed Findings

### F1. White Cell can perform Game-Master-only session admin

Severity: **Demo-Blocker**  
Confidence: **Proven**

#### Why this matters live

This is not a hidden permission discrepancy. The White Cell shell presents session and participant admin as ordinary controls in the same role surface used during the seminar. That makes accidental or intentional misuse plausible under demo pressure.

#### Live trigger scenario

1. A White Cell operator signs in from `whitecell.html`.
2. They open the `Sessions` or `Participants` tab.
3. They click `Create Session`, `Delete`, or `Remove seat`.
4. The browser executes privileged RPCs successfully under a White Cell operator grant.

#### Root cause and trace

The UI exposes the tabs directly:

- `whitecell.html:216-218` shows `Sessions`, `Participants`, and `Export Data`.
- `whitecell.html:265-311` defines the session, participant, and export admin panels.

The frontend only disables game-control buttons for support operators:

- `src/roles/whitecell.js:937-960` disables move/phase/timer controls for non-leads.

But it still binds admin handlers regardless of lead/support role:

- `src/roles/whitecell.js:1006-1015` binds participant-removal clicks.
- `src/roles/whitecell.js:1017-1034` binds session create/delete/refresh clicks.
- `src/roles/whitecell.js:1036-1044` binds export clicks.

Those handlers execute real mutations:

- `src/roles/whitecell.js:2657-2696` renders and executes `Remove seat`.
- `src/roles/whitecell.js:2731-2846` renders and executes `Create Session` and `Delete`.

The browser service calls straight into privileged RPCs:

- `src/services/database.js:496-503` calls `delete_live_demo_session`.
- `src/services/database.js:756-764` calls `operator_remove_session_participant`.

The backend alignment patch widened authority from Game Master to White Cell:

- `data/2026-04-17_white_cell_backend_alignment.sql:92-97` allows Game Master or White Cell for session creation.
- `data/2026-04-17_white_cell_backend_alignment.sql:157-162` allows Game Master or White Cell for session deletion.
- `data/2026-04-17_white_cell_backend_alignment.sql:204-209` allows Game Master or White Cell for participant removal.
- `data/2026-04-17_white_cell_backend_alignment.sql:525` documents `operator_remove_session_participant` as a Game Master or White Cell RPC.

#### User-visible symptom

White Cell can:

- create new sessions mid-demo
- delete the active session
- remove live participant seats

That undermines role trust and can immediately break the seminar flow.

#### Spec contradiction

Yes. The repo contains both older SQL and current docs that still describe these as Game-Master-only operations:

- `data/2026-04-08_live_demo_rls_hardening.sql:594-597`
- `data/2026-04-08_live_demo_rls_hardening.sql:656-658`
- `data/2026-04-16_game_master_remove_session_participant.sql:31-33`
- `LIVE_DEMO_BACKEND_ALIGNMENT.md:445-446`
- `LIVE_DEMO_BACKEND_ALIGNMENT.md:524-527`

#### Clarification

This is broader than "White Cell support can see a tab." The dangerous part is that both the UI and the backend contract accept the action. A CSS hide or disabled button alone would not fix the real issue because the authority widening already exists in SQL.

#### Smallest safe fix

- Remove or hard-disable session create/delete and participant-removal controls from White Cell.
- Add explicit role guards in `src/roles/whitecell.js` so the handlers fail closed even if the DOM still contains the buttons.
- Restore GM-only authorization in the affected SQL functions.

### F2. Raw Supabase / SQL / RLS errors leak into user toasts

Severity: **High**  
Confidence: **Proven**

#### Why this matters live

The repo already documents several backend drift cases that can happen on a live project. When they occur, the current UI path shows raw database text to the audience or operator instead of a controlled error message with recovery guidance.

#### Live trigger scenario

Any of the following is enough:

- participant join hits a contract mismatch
- White Cell operator auth hits an RPC or hashing issue
- Game Master removes a participant before the backend patch is present
- facilitator proposal/RFI writes hit an RLS or schema mismatch

#### Root cause and trace

The central mapper preserves raw backend text:

- `src/core/errors.js:264-266` returns `new DatabaseError(message, operation, supabaseError)` where `message` is the raw Supabase error message.

That message is then sent directly into toasts across the app:

- `src/roles/landing.js:354-356` participant join failure
- `src/roles/landing.js:388-392` White Cell operator auth failure
- `src/roles/whitecell.js:2694-2696` remove seat failure
- `src/roles/whitecell.js:2820-2822` create session failure
- `src/roles/whitecell.js:2844-2847` delete session failure
- `src/roles/whitecell.js:3045-3047` export failure
- `src/roles/gamemaster.js:1105-1107` participant removal failure
- `src/roles/facilitator.js:895`
- `src/roles/facilitator.js:1086`
- `src/roles/facilitator.js:1647`
- `src/roles/facilitator.js:2034`
- `src/roles/facilitator.js:2557`
- `src/roles/facilitator.js:2670`
- `src/roles/facilitator.js:3127`

The documented live backend failure modes are already concrete and user-visible:

- `README.md:179-187`
- `README.md:200`

Examples named there include:

- `function public.release_stale_session_role_seats(uuid, integer) is not unique`
- `function digest(text, unknown) does not exist`
- `column "updated_at" of relation "communications" does not exist`
- `new row violates row-level security policy for table "communications"`

#### User-visible symptom

Instead of a controlled message like "Operator login failed. Backend patch missing; contact setup owner.", users see raw SQL/RPC text in the app toast. On a projected screen, that looks like the product is half-configured or broken.

#### Spec contradiction

Indirectly, yes. The README treats these cases as operator troubleshooting conditions, but the UI is currently wired to expose them directly to end users rather than translating them into bounded live-demo guidance.

#### Clarification

This is not limited to one role. The same leak pattern exists on public join, White Cell admin, Game Master roster management, and facilitator write paths.

#### Smallest safe fix

- Keep raw backend detail in logs only.
- Add a user-safe error map keyed by operation or error code.
- Replace raw `err.message` toast usage in the live surfaces with controlled text plus operator next-step guidance where appropriate.

### F3. Research export mode defaults contradict the spec and fail open

Severity: **Medium**  
Confidence: **Proven**

#### Why this matters live

This is mainly an operator-trust and consent-posture problem. The repo documents research capture as if it has one default, while the SQL and UI runtime behavior implement another. If the team rehearses from the spec instead of the actual contract, they can misunderstand which export buttons should appear and when.

#### Live trigger scenario

1. A fresh or partially configured backend is used for rehearsal or demo.
2. Game Master or White Cell opens the export area.
3. The UI decides whether research export buttons should be enabled.
4. A runtime-config read failure or absent row falls back to `research`, not `standard`.

#### Root cause and trace

The research export specification says research capture is off by default:

- `RESEARCH_EXPORT_SPECIFICATION.md:39-44`

But the README and runbook describe the live frontend differently:

- `README.md:153-156` says both Game Master and White Cell expose research export unless mode is explicitly `standard`.
- `SUPABASE_BLANK_PROJECT_RUNBOOK.md:55-56` says research capture now defaults to `research`.

The SQL migration also seeds and defaults to `research`:

- `data/2026-06-04_research_export_capture.sql:11-13` inserts `research_capture_mode = 'research'`.
- `data/2026-06-04_research_export_capture.sql:26-37` returns `research` unless the stored value is exactly `standard`.

The browser controllers also default and fail over to `research`:

- `src/roles/gamemaster.js:207` initializes `researchCaptureMode` to `research`.
- `src/roles/gamemaster.js:312-330` falls back to `research` on config-read failure.
- `src/roles/whitecell.js:813` initializes `researchCaptureMode` to `research`.
- `src/roles/whitecell.js:2852-2870` falls back to `research` on config-read failure.

#### User-visible symptom

- Research buttons can appear enabled by default even if operators believe research mode is supposed to be off.
- A backend runtime-config read failure does not lock the feature down; it presents the more permissive research posture.

#### Spec contradiction

Yes. The spec, README, runbook, SQL, and frontend do not all agree on the default.

#### Clarification

This finding is not saying the export feature is broken end-to-end. The issue is contract inconsistency plus permissive fallback behavior. For a live demo, that creates operator confusion and makes it harder to explain why a research ZIP is or is not visible.

#### Smallest safe fix

- Decide one source-of-truth default.
- Make the SQL helper, UI defaults, and written docs all match it.
- On runtime-config read failure, fail closed to the safer posture rather than assuming `research`.

### F4. Tracked `.env.local` breaks the repo's own runtime-config contract

Severity: **Medium**  
Confidence: **Proven**

#### Why this matters live

This is less about public exposure than rehearsal integrity. The repo says local env is not the deploy source of truth and real runtime values must not be committed. The current tracked `.env.local` makes that statement false for anyone cloning the repo and running locally.

#### Live trigger scenario

1. A team member clones the repo.
2. They use the checked-in `.env.local` for local rehearsal.
3. Their browser points at the tracked Supabase project values rather than an intentionally configured local or secret-driven environment.

#### Root cause and trace

The repo's own guidance is explicit:

- `.env.example:2-4` says copy to an untracked `.env.local` and never commit real runtime values.
- `README.md:16-24` repeats that local env is not the live source of truth and Pages uses CI secrets.

The Pages workflow reinforces that CI secret path:

- `.github/workflows/deploy-pages.yml:21-24` reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from repository secrets.
- `.github/workflows/deploy-pages.yml:61-80` fails the deploy if those secrets are missing or placeholders.

But the repo contains a tracked `.env.local` with real-looking values:

- `.env.local:7-8`

And `.gitignore` excludes `.env.local`, which implies it should not be tracked:

- `.gitignore:2`

#### User-visible symptom

Operators can rehearse against a real backend without explicitly opting into that environment, and the repo's documentation no longer matches observed behavior.

#### Spec contradiction

Yes. The committed file contradicts both `.env.example` and `README.md`.

#### Clarification

This finding does not claim the anon key is a browser-secret leak by itself. The Pages build intentionally uses an anon key. The problem is that the repo says real local runtime values should not be committed, yet they are committed.

#### Smallest safe fix

- Remove `.env.local` from version control.
- Keep real values in untracked local env or CI secrets only.
- Reconfirm the docs after removal so the written setup path matches reality.

### F5. Landing screen still uses the wrong public product name

Severity: **Cosmetic**  
Confidence: **Proven**

#### Why this matters live

This is the first surface many people will see, especially if the landing page is projected before operators branch into role screens. Inconsistent branding on the opening screen looks like a staging artifact rather than a finished seminar product.

#### Live trigger scenario

1. Open the public landing page.
2. Read the title, boot label, and footer.
3. Compare that naming to the operator and team pages.

#### Root cause and trace

The landing page still uses `Statecraft Simulation Group`:

- `index.html:7-8`
- `index.html:32`
- `index.html:63`

The public product name in the repo docs is `Statecraft Sim`:

- `README.md:1-3`
- `README.md:96`

The other visible role pages already use `Statecraft Sim`:

- `whitecell.html:6-7`
- `whitecell.html:54`
- `master.html:7-8`
- `master.html:123`
- team facilitator and notetaker pages follow the same naming pattern

The current landing test locks the wrong label in place:

- `src/roles/landing.test.js:43-50`

#### User-visible symptom

The projected opening screen says `Statecraft Simulation Group`, while the rest of the app says `Statecraft Sim`.

#### Spec contradiction

Yes. The README explicitly marks `Statecraft Sim` as the public product name.

#### Clarification

This is cosmetic, not functional. It still matters because it is front-and-center and immediately visible to the audience.

#### Smallest safe fix

- Rename landing strings to `Statecraft Sim`.
- Update the test so it enforces the intended public brand rather than the legacy label.

## Checked But Not Elevated

These paths were examined and intentionally not reported as current live blockers.

### Notetaker White Cell inbox mismatch appears fixed

Older docs still describe a mismatch where White Cell can target notetakers but notetakers cannot see those messages. The current code no longer supports that finding:

- `teams/blue/notetaker.html:344-351` renders a `White Cell Inbox` section.
- `src/roles/notetaker.js:440-445` loads White Cell-scoped inbox communications from the store.
- `src/roles/notetaker.js:974-1005` renders inbox items for the seat.

That means the old mismatch note in `LIVE_DEMO_BACKEND_ALIGNMENT.md:478-482` appears stale rather than current.

### Mock backend bleed-through looks intentionally gated

The mock backend path does not appear casually reachable from a hosted live runtime:

- `src/services/supabaseMock.js:79-88` requires a webdriver context on an allowed local hostname.
- `src/services/supabaseMock.js:102-113` additionally requires session-storage bootstrap keys, not just a loose browser toggle.
- `src/services/supabaseMock.js:1841-1842` only enables the mock when `readMockBootstrapConfig()` succeeds.
- `README.md:50` explicitly says hosted or production builds ignore browser-side toggles like `localStorage.esg_e2e_mock = 'enabled'`.

This does not prove the path is perfect, but it was not strong enough to elevate as a demo blocker from source inspection alone.

### White Cell support adjudication appears properly blocked

The code path for adjudication still distinguishes lead from support:

- `src/roles/whitecell.js:1600`, `:1619`, `:1638`, and `:1659` only show adjudication affordances when `isLeadOperator()` is true.
- `src/roles/whitecell.js:1775-1777` skips binding adjudication button handlers for non-leads.
- `src/roles/whitecell.js:1856-1858` shows a warning and returns if support tries to adjudicate.

So the role-boundary failure in this audit is specifically about session admin, not adjudication.

## Rehearse This First

These are the manual paths most likely to fail or embarrass live, ordered for rehearsal value and mapped back to the current README guidance.

1. White Cell support authority check  
   Map: `README.md:196-198`  
   Path: sign into `whitecell.html` as support, open `Sessions` and `Participants`, and verify support cannot create/delete sessions or remove seats.  
   Pass should look like: the controls are absent or blocked in both UI and backend.

2. Raw error-message containment  
   Map: `README.md:179-187` and `README.md:200`  
   Path: reproduce one known backend drift condition from the README and verify the app shows a controlled operator message rather than raw SQL/RPC text.  
   Pass should look like: the screen never displays database-function names, RLS text, or column-level errors.

3. Research export gating  
   Map: `README.md:88` and `README.md:153-156`  
   Path: verify export buttons once with `research_capture_mode = 'standard'` and once with `research_capture_mode = 'research'`, then repeat with the runtime-config helper unavailable.  
   Pass should look like: the visible buttons and helper text match the declared mode, and failure to read config does not broaden access.

4. Local runtime integrity  
   Map: `README.md:16-24`  
   Path: check that the rehearsal machine is using intentionally configured env values and not inheriting a tracked `.env.local`.  
   Pass should look like: local setup follows the documented untracked-env path and Pages still depends only on CI secrets.

5. Landing-screen brand consistency  
   Map: `README.md:96` and `README.md:206`  
   Path: open the actual deployed landing page and compare the title, boot label, and footer with the operator pages.  
   Pass should look like: all public-facing surfaces use `Statecraft Sim`.

## Notes

- No build, test, or deployment command was run for this report.
- Findings are based on source inspection and contract tracing only.
- Where the repo documents a known failure mode, this report treats it as higher risk when the UI path would expose that failure directly to users.
