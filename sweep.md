# Pre-Demo Issue Closure Backlog
VITE_SUPABASE_URL=https://gsromgrxgrwwfywaoyme.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_pxSUKBORcLVUbQK6kP6tdg_6bysHKM7
## Recommended Order

`1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7`

This order clears environment and live-demo integrity risks before copy and UX cleanup.

## Prompt Status Table

| ID | Title | Severity | Status | Primary Area |
| --- | --- | --- | --- | --- |
| 1 | Remove committed live runtime values and restore clean config provenance | High | Not Started | Config / Deployment |
| 2 | Disable E2E mock backend activation in live builds | High | Not Started | Runtime Integrity |
| 3 | Re-establish Game Master vs White Cell admin/export boundaries | High | Not Started | Role Boundaries |
| 4 | Unify external product naming across app surfaces and docs | High | Not Started | Branding / Copy |
| 5 | Fix mojibake and normalize user-visible text encoding | High | Not Started | UI Quality |
| 6 | Correct Red Team move-response terminology drift | High | Not Started | UI Copy |
| 7 | Replace raw join/auth backend errors with participant-safe messaging | High | Not Started | Error Handling |

---

## Prompt 1: Remove Committed Live Runtime Values and Restore Clean Config Provenance

**Status:** `Not Started`  
**Severity Addressed:** `High`

**Prompt:**

Read first: `.env`, `.env.local`, `.env.example`, `src/core/config.js`, `src/services/supabase.js`, `.github/workflows/deploy-pages.yml`, `README.md`.

Goal: eliminate tracked real runtime values from local env files and make configuration provenance explicit for local dev and GitHub Pages.

Work boundaries: start in those files only. Widen scope only if a referenced doc or config contract forces it.

Deliverables: remove concrete `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` values from tracked local env files, preserve placeholder-only examples, keep fail-closed startup behavior, and align docs with the Pages secret workflow.

Tests required: add or update the narrowest config/runtime tests that prove placeholder or missing values still block startup cleanly.

Docs required: update `README.md` and any config/bootstrap note that still implies tracked env files are a valid source of truth for live runtime values.

Acceptance criteria: no real Supabase URL or anon key remains committed; local startup still blocks with the runtime notice when config is missing; Pages workflow remains secret-driven; docs reflect actual runtime truth.

Return requirements: exact files changed, exact tests added or updated, exact human verification commands, and any blocker.

---

## Prompt 2: Disable E2E Mock Backend Activation in Live Builds

**Status:** `Not Started`  
**Severity Addressed:** `High`

**Prompt:**

Read first: `src/services/supabase.js`, `src/services/supabaseMock.js`, `tests/e2e/support/mockBackend.js`, `tests/e2e/support/liveDemoHarness.js`, `README.md`.

Goal: prevent the hosted or production runtime from entering mock-backend mode through browser storage or globals while preserving E2E coverage.

Work boundaries: start in those files only. Do not introduce new dependencies or alternate test frameworks.

Deliverables: remove production-reachable mock activation by `localStorage` or ambient globals, ensure E2E has an explicit test-only activation path, and remove any shipped fallback like the mock `admin2025` operator code from live-reachable code paths.

Tests required: add or update focused unit/E2E harness tests proving mock mode is unavailable in normal runtime and still available under the deliberate test path.

Docs required: update `README.md` to explain the test-only boundary for mock backend usage.

Acceptance criteria: production/runtime build ignores `esg_e2e_mock=enabled`; test harness still enables mock backend intentionally; no mock operator credential remains reachable from live runtime code.

Return requirements: exact files changed, exact tests added or updated, exact human verification commands, and any blocker.

---

## Prompt 3: Re-Establish Game Master vs White Cell Admin/Export Boundaries

**Status:** `Not Started`  
**Severity Addressed:** `High`

**Prompt:**

Read first: `whitecell.html`, `src/roles/whitecell.js`, `master.html`, `src/roles/gamemaster.js`, `README.md`.

Goal: make session administration and export ownership unambiguous across UI, permissions, and docs.

Work boundaries: begin with those files. If role enforcement needs store or database changes, flag the dependency before widening scope.

Deliverables: choose the canonical owner for session create/delete and export actions, remove or gate conflicting White Cell controls, and make White Cell Support truly read-only for out-of-scope admin actions.

Tests required: add narrow role-scope tests that prove Lead and Support users see only the intended controls and that Game Master retains any required ownership.

Docs required: update `README.md` and any rehearsal/operator instructions that currently conflict with the implemented ownership model.

Acceptance criteria: UI ownership is consistent across Game Master and White Cell surfaces; Support cannot perform forbidden admin/export actions; docs match the actual rehearsal flow.

Return requirements: exact files changed, exact tests added or updated, exact human verification commands, and any blocker.

---

## Prompt 4: Unify External Product Naming Across App Surfaces and Docs

**Status:** `Not Started`  
**Severity Addressed:** `High`

**Prompt:**

Read first: `index.html`, `master.html`, `whitecell.html`, `teams/blue/facilitator.html`, `teams/red/facilitator.html`, `teams/green/facilitator.html`, `README.md`, `package.json`.

Goal: remove visible name drift between `SSG`, `ESG`, and `Statecraft Sim` across projected and participant-facing surfaces.

Work boundaries: change only public-facing naming and directly related metadata first. Do not do drive-by refactors of internal identifiers unless required.

Deliverables: choose one canonical public product name and update titles, meta descriptions, visible headers, footer labels, and docs to match.

Tests required: add the narrowest regression coverage available for title, meta, or header strings where tests already exist or can be added cheaply.

Docs required: update `README.md` and any operator-facing references that still use divergent naming.

Acceptance criteria: projected operator surfaces, landing page, and repo-facing docs all present one coherent product name; any remaining mixed naming is explicitly intentional and internal-only.

Return requirements: exact files changed, exact tests added or updated, exact human verification commands, and any blocker.

---

## Prompt 5: Fix Mojibake and Normalize User-Visible Text Encoding

**Status:** `Not Started`  
**Severity Addressed:** `High`

**Prompt:**

Read first: `index.html`, `src/roles/whitecell.js`, and any directly related shared render helper those strings pass through.

Goal: remove all visible garbled characters from landing and White Cell surfaces without destabilizing file encoding.

Work boundaries: keep the fix targeted to affected strings and encoding-safe save behavior.

Deliverables: replace garbled sequences like `â€”` and `Â·` with correct characters or ASCII-safe separators, and confirm the repo stays in a stable encoding format.

Tests required: add narrow regression coverage for the affected rendered strings if the current test layer can assert them.

Docs required: update docs only if they also contain visible mojibake.

Acceptance criteria: no user-facing mojibake remains on landing or White Cell screens; files remain readable and stable in the repo; tests pin the corrected text where practical.

Return requirements: exact files changed, exact tests added or updated, exact human verification commands, and any blocker.

---

## Prompt 6: Correct Red Team Move-Response Terminology Drift

**Status:** `Not Started`  
**Severity Addressed:** `High`

**Prompt:**

Read first: `teams/red/facilitator.html`, `src/roles/facilitator.js`, and any facilitator tests that cover queue rendering or empty states.

Goal: make Red Team’s queue, empty state, and action language consistently use move-response terminology.

Work boundaries: keep Blue and Green terminology unchanged unless a shared helper requires a scoped conditional change.

Deliverables: update Red-specific titles, helper text, empty states, modal labels, and related toasts so Red always reads as `Move Responses` rather than generic `Actions`.

Tests required: add a focused regression test covering the Red facilitator empty state and any Red-specific modal or label branch touched.

Docs required: update any operator or user-facing doc that still describes Red’s queue with generic action language.

Acceptance criteria: Red facilitator surface is terminology-consistent in empty and populated states; Blue and Green wording remains correct; regression coverage would fail without the fix.

Return requirements: exact files changed, exact tests added or updated, exact human verification commands, and any blocker.

---

## Prompt 7: Replace Raw Join/Auth Backend Errors with Participant-Safe Messaging

**Status:** `Not Started`  
**Severity Addressed:** `High`

**Prompt:**

Read first: `src/core/errors.js`, `src/roles/landing.js`, `src/services/database.js`, `src/services/supabase.js`, `src/roles/landing.join.test.js`, plus any directly related join/auth tests.

Goal: stop raw Supabase, SQL, and RLS text from reaching participant or operator toasts during join and authorization flows.

Work boundaries: preserve the existing distinct runtime notices for missing config, unreachable backend, offline browser, and disabled anonymous auth. Only normalize participant-visible toasts for unexpected backend failures.

Deliverables: add a focused join/auth error-mapping layer that logs raw backend detail but presents human-readable, role-appropriate messages in the UI.

Tests required: add or update narrow tests for join failure, operator authorization failure, and unexpected backend error mapping.

Docs required: update any troubleshooting or runtime-behavior doc that currently implies raw backend messages surface to end users.

Acceptance criteria: join/auth flows show clean participant-safe messages; raw backend text remains available only in logs/dev diagnostics; distinct fail-closed runtime notices still behave as they do now.

Return requirements: exact files changed, exact tests added or updated, exact human verification commands, and any blocker.

---

## Definition of Done for Each Prompt

- Code is changed only where needed for the named issue.
- Tests are added or updated to pin the exact behavior.
- Docs are updated anywhere runtime truth changed.
- The response includes exact files changed.
- The response includes exact tests added or updated.
- The response includes exact human verification commands.
- The response does not claim commands or tests were run unless explicitly run.

If you want, I can also turn this into a **`docs/dev/prompts/` handbook-style file** with a `Prompt Status` table at the top and copy-ready numbered sections.