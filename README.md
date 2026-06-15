# Statecraft Sim

Public product name: `Statecraft Sim`.

Legacy `SSG` and `esg` identifiers still appear in repository slugs, package names, deployment URLs, and browser storage keys. Those values are internal or operational identifiers only and are not the public-facing product name.

## Runtime Configuration

This build runs in `backend-required` mode.

Required environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Tracked local env files are not the source of truth for live runtime values. For local development, copy `.env.example` to an untracked `.env.local` or export the variables in your shell before starting Vite. Never commit a real Supabase URL or anon key.

If either value is missing or left as a placeholder, the app blocks startup with a configuration notice on the landing page and control panel. Create or update your untracked local env, restart the dev server, and reload the page.

If the landing page shows `Supabase Backend Unavailable`, the configured URL passed validation but the auth host could not be reached at runtime. Treat that as a fail-closed backend issue, not a participant join problem. Verify `VITE_SUPABASE_URL` points at a live Supabase project, confirm DNS/network access, rebuild if the environment changed, and reload the page.

If browser identity bootstrap fails after the backend is reachable, treat that as a Supabase Auth policy problem first. The deployed project must allow anonymous sign-ins for public participants, and it must not globally block new-user signups, because anonymous bootstrap is implemented through the Auth signup flow.

For GitHub Pages deployments, the workflow reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from repository secrets with those exact names. The deployed Pages build is produced in CI from source and does not rely on local `.env` or `.env.local` values from your machine.

## Role and Backend Alignment Spec

For the current role-by-role frontend contract and the backend behaviors that must align with it, see [LIVE_DEMO_BACKEND_ALIGNMENT.md](LIVE_DEMO_BACKEND_ALIGNMENT.md).

## E2E Readiness Gates

- `npm run test:e2e:smoke`
  - Fast single-actor smoke on the mock backend.
  - Useful for quick breakage detection.
  - Not sufficient proof of live-demo readiness on its own.
- `npm run test:e2e:live-demo`
  - Multi-actor topology suite for the real demo seat model.
  - Covers facilitator, scribe, notetaker, White Cell lead, White Cell support, seat contention, recovery paths, and a browser-level all-team role matrix.
- `npm run test:e2e:live-demo:matrix`
  - Targeted browser-level role matrix.
  - Verifies blue, red, and green facilitator, scribe, notetaker, White Cell lead, and White Cell support joins survive bootstrap, reload, and operator-roster visibility.
- `npm run test:e2e`
  - Full automated gate.
  - Run this before treating a build as demo-ready.
- `npm run test:e2e:rehearsal`
  - Alias for the full live-demo gate when you want the rehearsal command explicitly.

Playwright serves the generated `dist/` output through `npm run serve:test`. If you are validating fresh UI changes, rebuild before running the suite so `dist/` matches the current source.

The mock backend is enabled only by the local Playwright harness on `127.0.0.1` or `localhost`. Hosted or production builds ignore browser-side toggles such as `localStorage.esg_e2e_mock = 'enabled'`.

You can point the suite at an already-hosted build by setting `PLAYWRIGHT_BASE_URL`, for example:

```powershell
$env:PLAYWRIGHT_BASE_URL = 'https://<owner>.github.io/SSG_Simulation-Platform/'
npm run test:e2e:smoke
```

When `PLAYWRIGHT_BASE_URL` targets a hosted build, the mock backend bootstrap is intentionally unavailable and the suite exercises that deployed runtime as-is.

The local automated E2E suite uses the mock backend contract through the harness-only bootstrap. Real Supabase verification is listed below.

## One-Team Rehearsal Workflow

Target staffing for the final one-team live demo:

- 1 facilitator
- 1 scribe
- 2 notetakers
- 2 White Cell operators
- No public observer seats

Suggested rehearsal order:

1. Run `npm run test:e2e:smoke`.
2. Run `npm run test:e2e:live-demo`.
   - This now includes the all-team role matrix in addition to the one-team topology flow.
3. On the live Pages target, have the Game Master create one session and distribute the session code.
4. Join one facilitator, one scribe, and two notetakers on the same team.
5. Join White Cell Lead and White Cell Support with the operator access code.
6. On Blue Team, use the three-page `Take Action` wizard to save a draft or submit directly after the confirmation modal. Levers and sectors now support multi-select through explicit checkbox groups instead of single-select dropdowns or Ctrl/Command multi-select, `Enforcement Timeline` supports an `Other` path with a typed custom value, `Focus Countries` includes the aggregate `BRICS+` bloc option, and selecting `Implementation = Legislative` exposes legislative-route tickboxes for `Existing legislation/policy` and `Proposing new legislation/policy`. `Save Draft` and `Save Changes` stay available on every wizard page so facilitators can persist an in-progress Blue action before reaching the summary page, then reopen that draft later from the action list and continue where they left off. The Strategic Actions list now groups entries under explicit lifecycle headers such as `Draft Strategic Actions`, `Submitted to White Cell`, and `White Cell Reviewed`, making it easier to distinguish editable drafts from read-only submitted items at a glance while surfacing White Cell deliberation language on decision cards. The first sector in the persisted selection list still populates the legacy scalar `sector` field, while the full lever and sector selections stay preserved in the Blue action detail payload for White Cell review and replay. The wizard shows the Blue Team move and action number being built, and White Cell surfaces the same sequence label during review. Confirm the scribe seat lands on its dedicated support deck at `teams/<team>/scribe.html`; the `Actions` section should stay empty until facilitator decisions arrive, then render those decisions as blue action slides. In White Cell, open `Simulation Settings > Scribe Decks`, load a team-scoped `.html` deck from `decks/<team>/` into the same team scribe seat, and confirm the open scribe tab reloads that deck automatically. Submit any remaining draft to White Cell.
7. On Green Team, confirm the facilitator proposal queue uses proposal-specific language throughout the UI, including `Proposals`, `New Proposal`, and `No Proposals Yet`, so proposal review is clearly distinct from Blue Team actions.
8. On Red Team, confirm the facilitator queue uses response-specific language throughout the UI, including `Move Responses`, `New Response`, `No Responses Yet`, and `Deliberation Underway` while White Cell review is pending, so Red planning stays distinct from Blue Team action copy.
9. Have at least two notetakers save different seat-scoped notes and shared captures at the same time.
10. Adjudicate the submitted action from White Cell Lead.
11. Use Game Master `Participant Roster` to remove one occupied seat, then rejoin it from a second browser.
12. Export the session bundle from Game Master, then confirm the active White Cell seat exposes the same research path by default.
    - By default, confirm `Download Research ZIP` and `Print Report` are available in both Game Master and White Cell and produce the research archive plus `report.html`.
    - When `public.live_demo_runtime_config.research_capture_mode = 'standard'`, confirm the legacy JSON and per-table CSV downloads still work while the research archive controls stay locked.

## Operator Runbook

### Pages URL

- Project Pages format: `https://<owner>.github.io/<repo-slug>/`
- For this repository, the current repo slug is usually `SSG_Simulation-Platform`, so the URL shape is `https://<owner>.github.io/SSG_Simulation-Platform/`
- That slug is a legacy operational identifier. The public product name remains `Statecraft Sim`.

### Session Creation

1. Open the Pages URL.
2. Enter an operator display name.
3. Enter the operator access code.
4. Click `Open Game Master`.
5. In `Session Management`, create a session name and a participant-facing session code.

### Participant Onboarding

1. Share the session code with the team.
2. Tell public participants to join only through `Facilitator`, `Scribe`, or `Notetaker`.
3. For the one-team live target, fill seats in this order: facilitator, scribe, notetakers.
4. Do not tell public users to use White Cell or Game Master paths. Those are operator-only.

### Operator Login

1. White Cell operators stay on the landing page.
2. Enter the session code and operator access code. White Cell no longer uses team selection.
3. Click `Open White Cell Lead` or `Open White Cell Support`.
4. Game Master uses only `Open Game Master`.
5. On the White Cell lead timer card, `Pause` now freezes the live countdown at its current value, `Resume` restarts that paused countdown, and `Reset to 90:00` is the only control that returns the clock to the default duration.

### Proposal Review

1. White Cell Lead opens `Green Proposals` and selects `Review Proposal`.
2. Choose one of the explicit review decisions:
   - `Forward to Blue Team` or `Forward to Red Team`, based on the proposal's intended recipient
   - `Request Changes`
   - `Reject Proposal`
3. Forwarding creates the White Cell communication for the addressed team immediately. The reviewed proposal remains visible in the White Cell `Proposals` queue, the queue card now refreshes from recipient-state communication updates, and it appears for the recipient facilitator in both `Received Proposals` and the general White Cell responses feed.
4. `Request Changes` and `Reject Proposal` record the White Cell review without forwarding the current proposal. If Green Team wants to continue that line, they must submit a new proposal revision.
5. Sidebar badges are queue-specific: `Actions` counts Blue Team actions, `Proposals` counts Green Team proposals, `Move Responses` counts Red Team move responses, and `RFI` counts pending requests only.
6. Once White Cell forwards a Green proposal, the originating Green facilitator proposal card continues to reflect the recipient team's latest status, including `Acknowledged`, `Declined`, `Ignored`, and `Responded`.

### Participant Update Feeds

- Facilitator surfaces now show direct White Cell communications and White Cell content updates explicitly inside `White Cell Responses`, instead of relying on generic response cards alone.
- New White Cell arrivals now raise a long-lived toast and a `NEW` card marker on facilitator `White Cell Responses` or `Received Proposals`, instead of relying on the team noticing a quiet rerender.
- Sidebar badges on facilitator surfaces still track visible items in `Responses`, `Received Proposals`, `Tribe Street Journal`, and `Verba AI`, so operators can confirm the recipient team has explicit update notifications without the counts drifting from the visible lists.
- Notetaker `White Cell Inbox` now mirrors that arrival treatment with a live inbox badge plus `NEW` card markers for fresh White Cell traffic.
- Scribe surfaces now open the dedicated support deck at `teams/<team>/scribe.html`; the `Actions` section is a live facilitator-decision feed that turns team actions into individual decision slides, while the remaining sections stay tied to the support deck. Blue action slides now lead with a plain-language team brief, at-a-glance action cards, and grouped execution and White Cell status panels so the scribe can follow the move quickly without losing detail. White Cell can switch each team scribe to another team-scoped `.html` deck from `Simulation Settings > Scribe Decks`; deck paths resolve inside `decks/<team>/`, and open scribe tabs reload the latest assigned deck automatically. The slide stage stays centered, vertically pinned, and visually flat with no raised frame chrome while sidebar scrolling stays isolated to the section rail, horizontal overflow is suppressed, and `Present` switches into a deck-only layout that hides the sidebar chrome while keeping the shared navbar visible.
- `Tribe Street Journal` and `Verba AI` still keep their dedicated sections for reading the update content in context; the `White Cell Responses` section now acts as the inbox-style notification feed.

### White Cell Timeline Filters

- The White Cell `Session Timeline` now supports combined `Team`, `Role`, `Move`, and `Activity Type` filters.
- Use the filters together to isolate a specific team or operator surface within a single move instead of scanning the full event stream.
- Manual `Save Dynamics` and `Save Alliance` actions now emit structured snapshots into the White Cell journal review feed and the shared timeline, so operators can inspect the full notetaker entry without opening the underlying move-scoped note record.

### Export Modes

- Research capture mode is the default for new frontend sessions and blank-project bootstrap installs.
- Legacy downloads remain available from both Game Master and White Cell in every mode:
  - session JSON
  - actions CSV
  - RFIs CSV
  - timeline CSV
  - participants CSV
- Unless `public.live_demo_runtime_config.research_capture_mode = 'standard'`, both Game Master and White Cell expose the research export path:
  - `Download Research ZIP` creates a single archive containing `manifest.json`, `codebook.json`, `report.html`, the event log, the research table projections, and a `legacy/` directory that preserves the current bundle layout unchanged.
  - `Print Report` opens the generated `report.html` and uses the browser's native print dialog for print-to-PDF. The PDF is not stored in the archive; the reproducible source artifact is the archived `report.html`.
  - The printable report now renders as a print-first post-game analysis document with an explicit table of contents, Inter-based typography, restrained tables, and the session/game-state snapshot, participant seat activity, draft history, event-log chronology, decision-content detail, interaction flows, note-capture summary, and manifest integrity fields so operators can review the live session without dropping back to the raw CSV/JSON files first.
- Set `public.live_demo_runtime_config.research_capture_mode = 'standard'` only when you need the legacy-only consent posture for a session. That keeps the legacy downloads available and explicitly disables the research archive buttons.
- The research archive adds the process-rich artifacts that were missing from the legacy bundle:
  - notetaker-derived notes
  - audit/event log output
  - draft, transition, adjudication, interaction, and data-quality projections
- Operator grants, Supabase auth records, and the consent-gated `research_identity_map` remain outside the default de-identified archive.
- No XLSX export path or binary PDF artifact is added in this revision.

### Recovery Steps If a Seat Gets Stuck

1. Ask the participant to click `Logout` first.
2. If the seat must be cleared immediately, open Game Master `Participant Roster`, select the session, and click `Remove` on that participant row.
3. Have the participant rejoin with the session code. White Cell operators must also repeat operator login before reclaiming a White Cell seat.
4. If the browser disappeared without logging out and you do not remove the seat manually, wait for the heartbeat timeout window to expire.
   - Current backend timeout target: 90 seconds.
5. Refresh the join page and retry the same seat.
6. If the seat is still blocked after the timeout, confirm the operator used the correct team and role before recreating the session as a last resort.

## Manual Live Supabase Verification

Validate these manually against the real backend because the automated suite does not fully cover them:

- Anonymous browser identity bootstrap on the deployed Pages build.
- Public facilitator, scribe, and notetaker joins should succeed without ever returning `Session access is required.` If they do, reapply the current `data/2026-04-08_facilitator_join_session_access_fix.sql` from this repo before retrying.
- If the live backend returns `function public.release_stale_session_role_seats(uuid, integer) is not unique`, the older join hotfix created an overloaded function. Reapply the current `data/2026-04-08_facilitator_join_session_access_fix.sql`; it drops the bad overload and replaces it with the internal `release_stale_session_role_seats_internal` helper.
- If facilitator, scribe, or notetaker heartbeats fail with `heartbeat_session_role_seat` 403 / `Session access is required.`, the live backend is still running the older heartbeat/disconnect function bodies. Reapply the current `data/2026-04-08_facilitator_join_session_access_fix.sql`; the updated patch moves heartbeat and disconnect cleanup onto the internal helper as well.
- If `game_state` reads return `GameState not found` for an active session, the session was created without its `game_state` row. Reapply the current `data/2026-04-08_facilitator_join_session_access_fix.sql`; it now backfills missing `game_state` rows for existing sessions. Recreate the session only if the row still does not appear afterward.
- If Game Master or White Cell operator authorization fails with `function digest(text, unknown) does not exist`, the live backend is resolving `pgcrypto.digest()` outside the `extensions` schema search path. Apply `data/2026-04-08_operator_auth_digest_fix.sql`, then retry operator login.
- If White Cell operator authorization still expects a team-scoped role such as `blue_whitecell_lead`, apply `data/2026-04-09_global_white_cell_role_contract.sql`, then retry operator login.
- If public facilitator, scribe, or notetaker joins started failing with `claim_session_role_seat` 403 / `Session access is required.` after the White Cell role contract update, reapply the current `data/2026-04-09_global_white_cell_role_contract.sql`; the corrected version preserves the internal stale-seat cleanup helper inside `claim_session_role_seat`.
- If forwarded proposal recipient actions fail with `column "updated_at" of relation "communications" does not exist` when acknowledging/declining/ignoring, or `new row violates row-level security policy for table "communications"` when responding, reapply the current `data/2026-04-17_white_cell_backend_alignment.sql`; the updated patch removes the stale `updated_at` write and adds the hardened facilitator/scribe insert policy for `PROPOSAL_RESPONSE`.
- If Blue or Red can still overwrite a proposal response after the forwarded proposal already shows a final recipient state, apply `data/2026-06-03_proposal_response_finalization_lock.sql`; it reapplies the final-state guard in both `update_proposal_recipient_status` and `communications_live_demo_insert` for already-provisioned databases.
- Server-side RPC and RLS enforcement for:
  - operator authorization
  - join-by-code lookup
  - seat claims
  - seat rejection
  - White Cell-only actions
- Realtime propagation across separate browsers without page reloads.
- Hard disconnect handling after closing a tab or losing network, including stale seat release after 90 seconds.
- White Cell lead and support grants surviving reloads on the live backend.
- Game Master participant removals from the deployed `Participant Roster`, including immediate seat loss and required rejoin behavior.
- Export downloads from the deployed Game Master page with live backend data.
- Base-path correctness on the actual Pages deployment URL.
- If Game Master participant removal fails with `function public.operator_remove_session_participant(uuid, uuid) does not exist`, apply `data/2026-04-16_game_master_remove_session_participant.sql`, then retry the removal.

## GitHub Pages Operator Note

This build targets a GitHub Pages project site URL shaped like `https://<owner>.github.io/<repo-slug>/`.

The Pages deployment workflow sets `VITE_PUBLIC_BASE_PATH=/<repo-slug>/` from the repository name so multi-page routes resolve under the repo slug. The repo slug can still contain legacy `SSG` naming even though the public product name is `Statecraft Sim`. It also requires repository secrets named `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` so the deployed Pages build uses the intended live Supabase project. Local `.env` files and generated `dist/` output are not deployment inputs for Pages. If you deploy this build anywhere else, override `VITE_PUBLIC_BASE_PATH` to the correct base path, such as `/` for a root site or custom domain.

## GitHub Pages Bootstrap

On a brand-new repository, the first Pages deployment can fail at `actions/configure-pages` with `Get Pages site failed` if GitHub Pages has never been enabled for the repo.

Use one of these paths:

- Recommended one-time setup: in `Settings > Pages`, set the source to `GitHub Actions`, then rerun the workflow.
- Automated bootstrap: add a repository secret named `PAGES_ENABLEMENT_TOKEN` containing a token that can enable Pages for the repository. The workflow will use it to turn on Pages automatically when needed.

Without one of those, the deploy workflow cannot create the Pages site on its own with the default `GITHUB_TOKEN`.
