# Initial Demo Feedback Improvement Handbook

This handbook turns the first demo feedback round into an ordered implementation backlog for the current live-demo repo.

Use it the same way as `sweep.md`: one numbered prompt at a time, with code + tests + docs in the same change.

## Recommended Order

`1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8`

This order clears session-model and workflow-integrity issues before widening the authoring model, then finishes with narrative-loop integration and regression hardening.

## Decision Log Before Coding

These items are still ambiguous in the raw feedback. Resolve them before changing the contract they touch.

| Item | Current Interpretation | Decision Needed |
| --- | --- | --- |
| Strategic Orientation before Move 1 | Prefer a dedicated pre-Move-1 orientation state, not a global renumbering of all moves, unless the team explicitly wants `Move 0`. | Confirm whether orientation is a new phase/state under Move 1 or a separate move/session mode. |
| `BRICS+ as a target country` | Treat `BRICS+` as a bloc-level target option, not a literal country. | Confirm whether the UI should show one aggregate `BRICS+` option or separate member options. |
| `Allow the timeline options to have other as well` | Most likely refers to Blue Team enforcement timeline options in the action wizard. | Confirm whether this applies to Blue action timeline, Green timing/conditions, or both. |
| `Be able to save actions when someone ...` | Most likely means draft-save resilience across refresh/disconnect or seat handoff. | Confirm whether the requirement is reload recovery, facilitator/scribe handoff, disconnect recovery, or concurrent editing. |
| `Red Facilitator: Action Plan Options` | Feedback implies a missing or weak Red-specific option set. | Confirm the exact option list Red should choose from before changing the data model. |

## Prompt Status Table

| ID | Title | Severity | Status | Primary Area |
| --- | --- | --- | --- | --- |
| 1 | Add the Blue Team Strategic Orientation flow and realign move/phase/timer language | High | Not Started | Session Flow |
| 2 | Close the Blue to White Cell submission and notification loop | High | Not Started | Workflow Integrity |
| 3 | Expand Blue Team action authoring to multi-select, richer targeting, and resilient drafts | High | Not Started | Blue Facilitator UX / Data Contract |
| 4 | Add policy and legislation branching to the proposal draft flow | High | Not Started | Green Proposal Model |
| 5 | Repair Red Team response UX and add a preemptive forecast path | High | Not Started | Red Team Workflow |
| 6 | Make the scribe role explicitly interactive and testable | Medium | Not Started | Role Contract |
| 7 | Link White Cell outcomes into Tribe Street Journal and indicator updates | High | Not Started | Narrative Feedback Loop |
| 8 | Add regression coverage and rehearsal guidance for the new demo contract | High | Not Started | QA / Operator Docs |

---

## Prompt 1: Add the Blue Team Strategic Orientation Flow and Realign Move/Phase/Timer Language

**Status:** `Not Started`  
**Severity Addressed:** `High`

**Prompt:**

Read first: `SSG_Strategic_Orientation_Modal_v2.html`, `src/core/enums.js`, `src/stores/gameState.js`, `src/features/gameControls/MoveControl.js`, `src/features/gameControls/PhaseControl.js`, `src/features/gameControls/TimerControl.js`, `whitecell.html`, `src/roles/whitecell.js`, `src/main.js`, `README.md`.

Goal: implement the pre-Move-1 Blue Team Strategic Orientation flow described in `SSG_Strategic_Orientation_Modal_v2.html`, and make the live clock and move/phase language internally consistent across White Cell, participant headers, and docs.

Work boundaries: start in those files only. Treat `SSG_Strategic_Orientation_Modal_v2.html` as the source UI contract for the Blue Team options and flow. Do not widen into exports or database shape unless the chosen orientation model requires persisted state beyond the current `move`/`phase` contract.

Recommended implementation direction: prefer a dedicated pre-Move-1 orientation state over renumbering all moves globally. The current repo hardcodes moves `1-3` in several places, so adding a true `Move 0` is a broader contract change than adding an orientation state layered ahead of Move 1.

Deliverables:

- Add an operator-visible Blue Team Strategic Orientation flow before normal Move 1 play begins.
- Implement the modal as a two-step flow:
  - Step 1: choose one mutually exclusive orientation doctrine.
  - Step 2: configure orientation-specific primary levers, accepted costs, one posture, and an optional team rationale.
- Support the three doctrine choices shown in the modal:
  - `Pressure`
  - `Stabilization`
  - `Reframe`
- Preserve the doctrine-specific option sets from the modal for:
  - primary levers
  - accepted costs
  - posture
- Keep the orientation selection locked to a single doctrine for the session stage it governs, and make the confirmation state explicit to the team and White Cell.
- Carry the selected doctrine, configured levers, accepted costs, posture, and rationale forward as structured session context that White Cell can inspect when reading later Blue actions.
- Keep White Cell and participant-facing headers aligned on the same move/phase labels.
- Reconcile the phase descriptions in `src/core/enums.js` with the alternate naming currently embedded in `src/features/gameControls/PhaseControl.js`.
- Align timer controls and labels so the UI makes a clear distinction between pause, reset, and any stop/end-session behavior.
- Update any copy that still implies the session always starts immediately at Move 1 / Phase 1 with no briefing state or orientation selection.

Implementation notes:

- The orientation contract in `SSG_Strategic_Orientation_Modal_v2.html` is Blue-specific, not a generic all-team preface. Do not silently generalize the doctrine choices to Red or Green unless product asks for that explicitly.
- Preserve the modal's core semantics:
  - orientations are mutually exclusive
  - Step 2 option sets are scoped by the chosen doctrine
  - at least one lever and at least one accepted cost must be selected
  - exactly one posture must be selected
  - rationale is optional but recorded with the selection
- Prefer structured persistence for the orientation result rather than flattening it into a display-only string that White Cell cannot reliably replay.

Tests required:

- Add focused game-state coverage for the chosen orientation-state transition.
- Add UI/controller coverage for:
  - mutual exclusivity of the three doctrine choices
  - doctrine-scoped Step 2 option rendering
  - validation of lever, accepted-cost, and posture selection
  - confirmation / locked-state rendering
- Add White Cell rendering coverage for the new header / control labels and for visibility of the saved Blue Team orientation context.
- Add or update timer control tests if button visibility or semantics change.

Docs required:

- Update `README.md` rehearsal flow and operator instructions to include:
  - the Blue Team Strategic Orientation step before Move 1
  - the three doctrine choices
  - the fact that the doctrine drives a second-step configuration of levers, accepted costs, posture, and rationale
  - the revised timer terminology

Acceptance criteria:

- Operators can enter the session, run the Blue Team Strategic Orientation flow, and then transition cleanly into Move 1.
- Blue Team users can choose exactly one of `Pressure`, `Stabilization`, or `Reframe`, then configure the doctrine-specific options shown in the modal.
- White Cell can inspect the saved Blue Team orientation context when evaluating later Blue actions.
- White Cell and participant surfaces show the same current-state language.
- Timer controls no longer leave ambiguity between pause and stop/reset behavior.
- Tests would fail if the doctrine choices, Step 2 option contract, orientation-state transition, or label alignment regressed.

Return requirements: exact files changed, exact tests added or updated, exact human verification commands, and any blocker.

---

## Prompt 2: Close the Blue to White Cell Submission and Notification Loop

**Status:** `Not Started`  
**Severity Addressed:** `High`

**Prompt:**

Read first: `src/roles/facilitator.js`, `src/roles/whitecell.js`, `src/stores/actions.js`, `src/stores/communications.js`, `src/features/communications/targeting.js`, `src/components/ui/Toast.js`, `teams/blue/facilitator.html`, `whitecell.html`, `README.md`.

Goal: make Blue submissions and White Cell messages impossible to miss, and make queue arrival behavior obvious on both sides of the workflow.

Work boundaries: begin with the facilitator/White Cell controllers and the shared notification targeting code. Do not widen into backend schema unless the current client contract is missing the metadata needed to identify new arrivals deterministically.

Deliverables:

- Add a high-visibility arrival cue for new White Cell messages on facilitator and scribe surfaces.
- Ensure Blue Team action submission creates an immediate, visible arrival state in White Cell without requiring manual refresh.
- Ensure White Cell can clearly see newly approved / forwarded proposal items in the correct review queue and response history.
- Keep badge counts, toast/banner behavior, and inbox/feed placement consistent instead of duplicating contradictory cues.
- If needed, add explicit "new item" metadata rather than inferring arrival purely from list length.

Tests required:

- Update `src/roles/facilitator.test.js` for White Cell arrival cues and inbox rendering.
- Update `src/roles/whitecell.test.js` for Blue action arrival and approved-proposal visibility.
- Update `src/features/communications/targeting.test.js` if recipient metadata rules change.

Docs required:

- Update the `Participant Update Feeds` and proposal-review notes in `README.md` so the operator runbook matches the actual arrival behavior.

Acceptance criteria:

- A newly delivered White Cell message is visibly surfaced on the recipient team page when it arrives.
- A Blue action submitted to White Cell becomes visible in the White Cell review flow without reload.
- White Cell can see approved/forwarded proposal state clearly enough to confirm where a proposal went and what happened next.
- Queue badges and visible lists stay in sync.

Return requirements: exact files changed, exact tests added or updated, exact human verification commands, and any blocker.

---

## Prompt 3: Expand Blue Team Action Authoring to Multi-Select, Richer Targeting, and Resilient Drafts

**Status:** `Not Started`  
**Severity Addressed:** `High`

**Prompt:**

Read first: `src/features/actions/blueActionDetails.js`, `src/roles/facilitator.js`, `teams/blue/facilitator.html`, `src/services/database.js`, `src/services/supabaseMock.js`, `src/features/export/researchExport.js`, `src/features/actions/blueActionDetails.test.js`, `src/services/database.action-write.test.js`, `README.md`.

Goal: upgrade the Blue Team `Take Action` wizard so it can capture the feedback about multiple levers, multiple sectors, BRICS+, custom timeline options, better final review presentation, and safer draft-save behavior.

Work boundaries: start in those files only. Because `sector` is currently a single persisted field and Blue action details are serialized into a text blob, define the deterministic storage contract first before changing the wizard UI.

Required design constraint: do not solve multi-select levers or sectors with lossy display-only formatting. White Cell review, replay, and research export must be able to reconstruct the same selections the facilitator made.

Deliverables:

- Allow Blue facilitators to select more than one lever.
- Allow Blue facilitators to select more than one sector.
- Add `BRICS+` as a selectable target option, subject to the decision log note above.
- Add an `Other` path for the timeline field if the feedback is confirmed to refer to Blue action timing.
- Redesign the final wizard page into a clearer slide-style review summary instead of a dense text block.
- Harden draft-save behavior so a saved draft can be resumed reliably under the agreed contract.

Implementation notes:

- If the top-level `sector` field must stay scalar for backward compatibility, explicitly document how primary sector vs full sector list are persisted and replayed.
- If levers and sectors move to arrays, update serialization, parsing, review cards, and export projections together.
- Treat the truncated feedback `Be able to save actions when someone ...` as a blocker for any concurrent-edit model. Draft reload/recovery is safe to implement; collaborative editing should not be inferred without confirmation.

Tests required:

- Update `src/features/actions/blueActionDetails.test.js` for multi-value serialization and parsing.
- Update `src/roles/facilitator.test.js` for wizard validation, final-page rendering, and submission payloads.
- Update `src/services/database.action-write.test.js` if the persisted payload shape changes.
- Update `src/features/export/researchExport.js` tests if export rows need to carry multi-value fields explicitly.

Docs required:

- Update the Blue Team action workflow in `README.md`, including new field behavior and any revised draft-resume expectations.

Acceptance criteria:

- A Blue action can persist and replay multi-select levers and sectors without ambiguity.
- White Cell review surfaces show the same selections the Blue Team chose.
- `BRICS+` and `Other` timeline behavior are visible and functional if approved by product.
- The final page reads as a clear review slide, not a raw dump.
- Draft-save behavior is explicit, reproducible, and documented.

Return requirements: exact files changed, exact tests added or updated, exact human verification commands, and any blocker.

---

## Prompt 4: Add Policy and Legislation Branching to the Proposal Draft Flow

**Status:** `Not Started`  
**Severity Addressed:** `High`

**Prompt:**

Read first: `src/features/actions/proposalDetails.js`, `src/roles/facilitator.js`, `teams/green/facilitator.html`, `src/roles/whitecell.js`, `src/services/database.js`, `src/features/export/researchExport.js`, `src/services/database.action-write.test.js`, `README.md`.

Goal: let proposal authors distinguish between working from existing policy / legislation and proposing new policy / legislation, while also capturing the legislative vs corporate branch requested in the feedback.

Work boundaries: begin with the proposal details helper and the Green facilitator modal. Widen only if White Cell review, export, or proposal-response logic needs the new fields surfaced to stay coherent.

Deliverables:

- Add an explicit branch in the draft flow for `existing policy / legislation` versus `new policy / legislation`.
- Add the requested `legislation / corporate` yes-no or branch decision in a way that can be replayed by White Cell later.
- Surface the chosen branch clearly in White Cell review so approved proposals carry the same context forward.
- Preserve current proposal forwarding / response behavior while making the new branch data visible in cards, review flows, and research export.

Implementation notes:

- Extend `serializeProposalDetails()` / `parseProposalDetails()` instead of creating a one-off field mapping hidden only inside the UI.
- Keep the new proposal metadata thin, structured, and deterministic.

Tests required:

- Update proposal serialization tests.
- Update `src/roles/facilitator.test.js` for Green proposal form behavior and validation.
- Update `src/roles/whitecell.test.js` if review cards or proposal forwarding must render the new branch fields.
- Update export tests if the research bundle should include the new proposal-branch metadata.

Docs required:

- Update the Green proposal instructions in `README.md` so operators understand the new draft path and White Cell review context.

Acceptance criteria:

- Proposal authors can tell the system whether they are invoking existing policy or proposing new policy.
- The legislative/corporate distinction is visible and preserved through White Cell review.
- The new fields do not break current proposal forwarding or recipient-response flows.

Return requirements: exact files changed, exact tests added or updated, exact human verification commands, and any blocker.

---

## Prompt 5: Repair Red Team Response UX and Add a Preemptive Forecast Path

**Status:** `Not Started`  
**Severity Addressed:** `High`

**Prompt:**

Read first: `teams/red/facilitator.html`, `src/roles/facilitator.js`, `src/features/actions/moveResponseDetails.js`, `src/components/ui/Badge.js`, `src/core/enums.js`, `src/services/database.js`, `README.md`.

Goal: fix the Red facilitator response issues, create the requested preemptive forecast view, and stop showing Red work through Blue-style adjudication language where that language no longer fits.

Work boundaries: keep the change Red-specific unless a shared helper absolutely requires a scoped branch. Do not rewrite Blue or Green flows as collateral cleanup.

Deliverables:

- Fix the current Red facilitator response problems in the existing move-response flow.
- Add a preemptive forecast view so Red can record what they think Blue will do before or alongside their response planning.
- Define and implement the Red-specific `Action Plan Options` requested in the feedback once the exact option set is confirmed.
- Replace user-facing `Adjudicated` language with `Deliberation Underway` anywhere the product decision is that Red is waiting on White Cell review rather than seeing a final result.

Implementation notes:

- If forecast data is a new subtype, store it through the same deterministic helper pattern used for Blue action details and Green proposal details.
- Avoid reusing generic action-card copy if it causes Red surfaces to read like Blue Team action cards.

Tests required:

- Update `src/roles/facilitator.test.js` for Red-specific empty states, labels, and response branches.
- Add serialization tests if forecast data gets its own details helper.
- Update any badge/status tests that cover the renamed `Deliberation Underway` display state.

Docs required:

- Update `README.md` so the Red workflow uses Red-specific terminology throughout.

Acceptance criteria:

- Red can create and review the intended response artifacts without running into Blue-centric copy or broken controls.
- The forecast view exists and is clearly distinct from the final move-response submission path.
- Pending Red review states use the approved language consistently.

Return requirements: exact files changed, exact tests added or updated, exact human verification commands, and any blocker.

---

## Prompt 6: Make the Scribe Role Explicitly Interactive and Testable

**Status:** `Not Started`  
**Severity Addressed:** `Medium`

**Prompt:**

Read first: `src/roles/facilitator.js`, `teams/blue/facilitator.html`, `teams/red/facilitator.html`, `teams/green/facilitator.html`, `src/features/communications/targeting.js`, `src/features/participants/ParticipantList.js`, `README.md`.

Goal: turn the feedback `Scribe is interactive in the session` into an explicit, documented seat contract rather than an implicit side effect of current facilitator code sharing.

Work boundaries: start with the current facilitator/scribe shared controller. Do not add a separate scribe app unless the existing shared surface cannot express the intended permissions cleanly.

Deliverables:

- Audit the current scribe behavior and remove any mismatches between actual write permissions and user-facing copy.
- Make the scribe surface explicitly interactive where intended: action/proposal visibility, White Cell responses, proposal recipient actions, and any approved draft/edit/submit path.
- If any controls remain facilitator-only, make that restriction explicit in the UI rather than silently hiding or failing the action.
- Ensure operator roster / participant labels continue to represent the scribe as a first-class seat.

Tests required:

- Update `src/roles/facilitator.test.js` for scribe-specific interaction paths.
- Update `src/features/participants/ParticipantList.test.js` if role labels or roster presentation change.
- Add or update browser-level role-matrix coverage if the scribe seat contract changes materially.

Docs required:

- Update the participant onboarding and rehearsal notes in `README.md` so scribe expectations match the implemented control set.

Acceptance criteria:

- A user on a scribe seat can perform the agreed interactive tasks without falling into observer-style dead ends.
- Any remaining non-scribe actions are clearly explained.
- Tests pin the scribe behavior so it cannot drift back into ambiguous partial access.

Return requirements: exact files changed, exact tests added or updated, exact human verification commands, and any blocker.

---

## Prompt 7: Link White Cell Outcomes into Tribe Street Journal and Indicator Updates

**Status:** `Not Started`  
**Severity Addressed:** `High`

**Prompt:**

Read first: `src/roles/whitecell.js`, `src/roles/facilitator.js`, `src/features/communications/targeting.js`, `src/features/tribeStreetJournalEmbed.js`, `src/features/export/researchExport.js`, `whitecell.html`, `README.md`.

Goal: close the narrative loop between Blue moves, White Cell adjudication / approval, and the downstream Tribe Street Journal or indicator-style updates that teams use to interpret what happened.

Work boundaries: start with the White Cell controller and the communication-targeting helpers. Widen only if export or timeline metadata must change to keep source linkage deterministic.

Deliverables:

- Let White Cell publish a Tribe Street Journal update from an approved proposal or adjudicated action, not just from a notetaker capture.
- Add a parallel path for economic-indicator or Verba-style updates if the product wants both news-style and indicator-style feedback.
- Attach source metadata so each published update can be traced back to the originating move, action, or proposal.
- Ensure recipient teams can see the resulting update in both the narrative surface (`Tribe Street Journal` / `Verba AI`) and the explicit White Cell response feed.
- Ensure White Cell can see which proposals were approved and which updates were actually published downstream.

Implementation notes:

- Prefer metadata that records source action/proposal IDs, move number, and content kind instead of inferring linkage from free text.
- Keep the link model compatible with current research export tables so the feedback loop can be audited later.

Tests required:

- Update `src/roles/whitecell.test.js` for publish-from-source workflows.
- Update `src/roles/facilitator.test.js` for recipient visibility of the published update.
- Update `src/features/communications/targeting.test.js` if new content kinds or audience rules are introduced.
- Update export tests if source linkage becomes part of the research bundle.

Docs required:

- Update `README.md` sections covering White Cell update feeds, Tribe Street Journal, and Verba AI population sentiment updates.

Acceptance criteria:

- White Cell can publish TSJ or indicator updates directly from approved/adjudicated work.
- Teams can see the update in the right inbox and narrative surface without losing source context.
- White Cell can verify that an approved proposal or adjudicated action resulted in a published downstream update.

Return requirements: exact files changed, exact tests added or updated, exact human verification commands, and any blocker.

---

## Prompt 8: Add Regression Coverage and Rehearsal Guidance for the New Demo Contract

**Status:** `Not Started`  
**Severity Addressed:** `High`

**Prompt:**

Read first: `README.md`, `tests/e2e/session-smoke.e2e.js`, `tests/e2e/live-demo-topology.e2e.js`, `tests/e2e/live-demo-role-matrix.e2e.js`, `tests/e2e/support/liveDemoHarness.js`, plus every unit test file touched by Prompts 1-7.

Goal: turn the demo-feedback fixes into a stable rehearsal contract rather than a one-off UI pass.

Work boundaries: do not write new broad E2E suites unless the current tests cannot express the changed flow. Prefer narrow extensions to the existing topology and role-matrix coverage.

Deliverables:

- Add or update the narrowest automated checks for:
  - Strategic Orientation before Move 1
  - White Cell arrival notifications
  - Blue multi-select action authoring
  - policy / legislation proposal branching
  - Red forecast / deliberation terminology
  - scribe interaction
  - TSJ / indicator publication from White Cell
- Update the one-team rehearsal instructions in `README.md` so operators know exactly how to validate the revised flow manually.
- Add a short manual verification checklist for any remaining live-backend-only behaviors that the automated suite still cannot cover.

Acceptance criteria:

- The changed flows are covered by targeted regression checks instead of relying on memory from the demo.
- Operator documentation describes the new contract in the same order the team is expected to rehearse it.
- Any remaining gaps are called out explicitly as manual-only verification items.

Return requirements: exact files changed, exact tests added or updated, exact human verification commands, and any blocker.

---

## Definition of Done for Each Prompt

- The prompt closes one coherent feedback cluster rather than scattering small unrelated fixes.
- Tests are added or updated for the narrowest useful contract.
- `README.md` or the relevant operator instructions reflect the new runtime truth.
- The response cites exact files changed.
- The response cites exact tests added or updated.
- The response includes exact human verification commands.
- The response does not claim a command or test passed unless it was actually run.
