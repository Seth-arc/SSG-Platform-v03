# Live Demo Role and Backend Alignment Spec

## Purpose

This document captures the current frontend behavior that the backend must align to as-is.

It is not a redesign document. It describes the current shipped role surfaces, what each role can do, who it can send communications to, who it receives communications from, what shows on each timeline, and which behaviors are currently frontend-only or local-only.

Primary source files:

- `src/roles/facilitator.js`
- `src/roles/notetaker.js`
- `src/roles/whitecell.js`
- `src/roles/gamemaster.js`
- `teams/blue/facilitator.html`
- `teams/red/facilitator.html`
- `teams/green/facilitator.html`
- `whitecell.html`
- `master.html`
- `src/features/actions/proposalRecipientState.js`

## Current Role Contract

### Public team seats

Each of Blue, Red, and Green currently exposes:

- `Facilitator`: 1 seat
- `Scribe`: 1 seat
- `Notetaker`: 2 seats

### Operator seats

- `White Cell Lead`
- `White Cell Support`
- `Game Master`

### Observer status

- There is no longer a public observer join path.
- Legacy `viewer` support still exists in some code paths for backward compatibility, but it is not part of the intended live seat contract.

## Shared Frontend Truth

These rules are important because the backend should preserve them unless the frontend is intentionally changed.

- `Scribe` is a first-class seat and role string, but today it is an operational copy of the matching team's facilitator surface.
- Team leads do not have a freeform outbound communications composer.
- White Cell is the only role with a freeform communications composer.
- Team-lead outbound paths are limited to:
  - RFI submission to White Cell
  - action, proposal, or move-response submission to White Cell
  - proposal response back to White Cell from the `Received Proposals` inbox
- Blue, Red, and Green lead pages all show their own team timeline plus `white_cell` timeline events.
- Blue, Red, and Green notetaker pages also show their own team timeline plus `white_cell` timeline events.
- White Cell shows the full session timeline with team and role filters.
- `Received Proposals` status chips such as `Unread`, `Acknowledged`, and `Responded` are stored in browser `localStorage`, not as shared backend state.
- `Verba AI Population Sentiments` exists in page shells, but is not currently backed by controller logic.

## Role-Specific Behavior

### Blue Facilitator

Surface:

- `teams/blue/facilitator.html`
- `src/roles/facilitator.js`

Can do:

- Create, edit, delete, save, and submit Blue Team actions.
- Use the 3-page `Take Action` wizard.
- See the current Blue Team move and action number while building an action.
- Submit RFIs.
- Use Quick Capture and Tribe Street Journal, including the embedded `tribestreetjournal.com` panel.
- Read White Cell responses.
- View `Received Proposals`.
- Acknowledge, respond to, decline, ignore, or mark a forwarded proposal as read.

Can send:

- `RFI -> White Cell`
- `Blue action submission -> White Cell`
- `Proposal response -> White Cell`

Cannot send:

- Arbitrary freeform communications to other teams
- Direct messages to Red or Green

Receives communications from:

- White Cell answers to Blue RFIs
- White Cell communications addressed to:
  - `all`
  - `blue`
  - `blue_facilitator`
  - `blue_scribe`
- Approved Green proposals forwarded by White Cell to `blue`

Timeline shows:

- Timeline events where `team` is `blue`
- Timeline events where `team` is `white_cell`
- Current implementation renders the most recent 50 matching events

Backend alignment implications:

- Blue actions must support draft and submitted states.
- White Cell responses must route into Blue's response feed.
- Forwarded Green proposals must be represented as communications with `type = PROPOSAL_FORWARDED` and `to_role = blue`.
- Proposal responses back to White Cell must be accepted as communications with `type = PROPOSAL_RESPONSE`.

### Blue Scribe

Surface:

- Same page and controller as Blue Facilitator

Current behavior:

- Same permissions and same workflow as Blue Facilitator
- Same response feed
- Same `Received Proposals` inbox
- Same timeline visibility

Important note:

- `blue_scribe` is a separate seat and role identity even though it currently mirrors Blue Facilitator behavior.
- Backend permissions should preserve separate seat identity while allowing the same action and communication paths Blue Facilitator has today.

### Blue Notetaker

Surface:

- Blue notetaker page through `src/roles/notetaker.js`

Can do:

- Submit shared Quick Capture entries as `NOTE`, `MOMENT`, or `QUOTE`
- Save move-scoped `Team Dynamics`
- Save move-scoped `Alliance Tracking`
- View Blue actions read-only
- View Blue timeline activity

Storage behavior:

- Shared captures append into timeline
- Team dynamics and alliance notes are stored per notetaker seat and do not overwrite another Blue notetaker

Can send:

- Timeline capture events
- Notetaker data saves

Cannot send:

- RFIs
- Freeform communications
- Action submissions

Receives communications from:

- No dedicated communications inbox is rendered on the notetaker page

Timeline shows:

- Timeline events where `team` is `blue`
- Timeline events where `team` is `white_cell`

Backend alignment implications:

- `notetaker_data` must remain participant-scoped for move notes.
- Shared captures and participant-scoped notes are separate behaviors and should not be collapsed.
- White Cell can currently target notetaker roles in the communications composer, but the notetaker UI does not show an inbox for those messages.

### Red Facilitator

Surface:

- `teams/red/facilitator.html`
- `src/roles/facilitator.js`

Can do:

- Submit Red Team move responses
- Submit RFIs
- Use Quick Capture and Tribe Street Journal, including the embedded `tribestreetjournal.com` panel
- Read White Cell responses
- View `Received Proposals`
- Acknowledge, respond to, decline, ignore, or mark a forwarded proposal as read

Current response behavior:

- Red uses the actions area as a `Move Responses` surface rather than the Blue action planner.
- New Red responses are submitted directly to White Cell review.
- Red does not start with the Blue draft-save pattern on first creation.

Can send:

- `RFI -> White Cell`
- `Move response submission -> White Cell`
- `Proposal response -> White Cell`

Receives communications from:

- White Cell answers to Red RFIs
- White Cell communications addressed to:
  - `all`
  - `red`
  - `red_facilitator`
  - `red_scribe`
- Blue action shares from White Cell to Red using `GUIDANCE`
- Approved Green proposals forwarded by White Cell to `red`

Timeline shows:

- Timeline events where `team` is `red`
- Timeline events where `team` is `white_cell`
- Current implementation renders the most recent 50 matching events

Backend alignment implications:

- Red responses still persist through the shared actions flow, but frontend copy and workflow treat them as move responses.
- `GUIDANCE` communications from White Cell to Red are a real part of the current surface.

### Red Scribe

Current behavior:

- Same page, same permissions, same response feed, same `Received Proposals` inbox, and same timeline as Red Facilitator
- Separate seat and role identity: `red_scribe`

### Red Notetaker

Current behavior:

- Same notetaker model as Blue Notetaker, scoped to Red
- Shared captures append to timeline
- Move-scoped dynamics and alliance notes are participant-scoped
- No communications inbox
- Read-only actions view
- Timeline shows `red` and `white_cell` events

### Green Facilitator

Surface:

- `teams/green/facilitator.html`
- `src/roles/facilitator.js`

Can do:

- Submit Green proposals for White Cell review
- Submit RFIs
- Use Quick Capture and Tribe Street Journal, including the embedded `tribestreetjournal.com` panel
- Read White Cell responses

Current proposal behavior:

- Green uses the actions area as a `Proposals` surface.
- New proposals are sent to White Cell review immediately.
- Green specifies intended recipients such as Blue or Red inside the proposal flow.
- Green does not directly message Blue or Red.
- Green does not have a `Received Proposals` section on its page.

Can send:

- `RFI -> White Cell`
- `Proposal submission -> White Cell`

Cannot send:

- Direct communications to Blue or Red
- Proposal responses from a recipient inbox, because Green is the originator role in this flow

Receives communications from:

- White Cell answers to Green RFIs
- White Cell communications addressed to:
  - `all`
  - `green`
  - `green_facilitator`
  - `green_scribe`

Timeline shows:

- Timeline events where `team` is `green`
- Timeline events where `team` is `white_cell`
- Current implementation renders the most recent 50 matching events

Backend alignment implications:

- Green proposals do not require a separate table in the current build; they are serialized through the existing action and communication flow.
- White Cell remains the gatekeeper that approves and forwards Green proposals onward.

### Green Scribe

Current behavior:

- Same page, same permissions, same proposal workflow, same response feed, and same timeline as Green Facilitator
- Separate seat and role identity: `green_scribe`

### Green Notetaker

Current behavior:

- Same notetaker model as Blue and Red Notetaker, scoped to Green
- Shared captures append to timeline
- Move-scoped dynamics and alliance notes are participant-scoped
- No communications inbox
- Read-only actions view
- Timeline shows `green` and `white_cell` events

### White Cell Lead

Surface:

- `whitecell.html`
- `src/roles/whitecell.js`

Can do:

- Start, pause, and reset the timer
- Advance and regress move and phase
- Review submitted actions
- Adjudicate submitted actions
- Answer pending RFIs
- Send White Cell communications
- Share Blue actions to Red as `GUIDANCE`
- View session participants
- View session-wide communications history
- View session-wide timeline with filters
- Use the Tribe Street Journal review section, including the embedded `tribestreetjournal.com` panel
- Use session and export tabs exposed on the White Cell page shell

Can send communications to:

- `all`
- `blue`
- `red`
- `green`
- `blue_facilitator`
- `blue_scribe`
- `blue_notetaker`
- `red_facilitator`
- `red_scribe`
- `red_notetaker`
- `green_facilitator`
- `green_scribe`
- `green_notetaker`

Receives communications from:

- Team RFIs, through the White Cell RFI queue
- Team proposal responses, through the communications history feed
- General session communications already persisted in the session

Timeline shows:

- Full session timeline
- Optional team and role filters

Current queue behavior:

- Actions queue is currently the submitted pending queue, not full history
- RFI queue is currently the pending queue, not answered history
- Communications history currently loads all session communications

Backend alignment implications:

- White Cell roles are global operator roles, not team-scoped White Cell roles.
- Adjudication and RFI answer flows must remain White Cell accessible.
- Communication recipient targeting must support whole-team and specific-seat delivery.
- Blue-to-Red `GUIDANCE` and Green proposal forwarding are current White Cell behaviors that the backend must preserve.

### White Cell Support

Surface:

- Same page shell and controller family as White Cell Lead

Can do today:

- View the same action queue
- View the same RFI queue
- View the same communications history
- View the same participant roster
- View the same timeline
- Answer pending RFIs
- Send White Cell communications
- Share Blue actions to Red as `GUIDANCE`
- Use the Tribe Street Journal review section, including the embedded `tribestreetjournal.com` panel

Cannot do today:

- Adjudicate actions
- Operate timer controls
- Advance or regress move and phase

Important note:

- The current restriction on White Cell Support is primarily a frontend behavior split.
- If the backend is meant to align exactly with the current frontend, Support should remain able to send communications and answer RFIs, while adjudication and game-state controls stay Lead-only.

### Game Master

Surface:

- `master.html`
- `src/roles/gamemaster.js`

Can do:

- Create sessions
- Delete sessions
- View session dashboard stats
- View recent activity across sessions
- View connected participants across sessions
- Select a session and inspect its roster
- Remove participants from sessions
- Export selected-session data as JSON and CSV

Cannot do:

- Send team communications
- Answer RFIs
- Adjudicate actions
- Act as a team seat

Timeline behavior:

- Game Master does not have a dedicated interactive session timeline page
- It sees activity through dashboard rollups and export bundles

Backend alignment implications:

- Session create and delete remain Game Master protected operations.
- Participant removal remains a Game Master protected operation.
- Export paths should continue to work off session bundle reads.

## Communication Matrix

| Role | Outbound paths | Intended recipients |
| --- | --- | --- |
| Blue Facilitator / Scribe | RFI, Blue action submission, proposal response | White Cell |
| Red Facilitator / Scribe | RFI, move response submission, proposal response | White Cell |
| Green Facilitator / Scribe | RFI, proposal submission | White Cell |
| Blue / Red / Green Notetaker | Timeline captures, participant-scoped note saves | Stored to backend, not delivered as inbox communications |
| White Cell Lead | Freeform communications, RFI answers, action adjudication, Blue guidance shares, Green proposal forwarding | All teams, whole teams, or specific facilitator / scribe / notetaker seats |
| White Cell Support | Freeform communications, RFI answers, Blue guidance shares | All teams, whole teams, or specific facilitator / scribe / notetaker seats |
| Game Master | Session control and exports only | Not a communications sender |

## Timeline Visibility Matrix

| Role | Timeline contents |
| --- | --- |
| Blue Facilitator / Scribe | `blue` events plus `white_cell` events |
| Red Facilitator / Scribe | `red` events plus `white_cell` events |
| Green Facilitator / Scribe | `green` events plus `white_cell` events |
| Blue Notetaker | `blue` events plus `white_cell` events |
| Red Notetaker | `red` events plus `white_cell` events |
| Green Notetaker | `green` events plus `white_cell` events |
| White Cell Lead / Support | Full session timeline with filters |
| Game Master | No dedicated timeline surface; dashboard recent-activity summary and exports only |

## Known Frontend and Backend Mismatches

These are important because they affect what "align to the frontend as-is" really means.

### Notetaker communication targeting mismatch

- White Cell can target notetaker seats in the communications composer.
- Notetaker pages do not render a communications inbox.
- Result: backend can store and deliver those messages, but the current notetaker frontend does not surface them.

### White Cell shell exposes Game Master-like tabs

- `whitecell.html` includes session, participants, and export tabs.
- Session creation, session deletion, and participant removal are Game Master protected backend operations.
- Result: the White Cell page shell visibly includes controls that may fail unless the authenticated user also holds a Game Master grant.

### Team timelines are broader than direct messaging

- Team lead and notetaker timelines show all `white_cell` team events, not only events addressed directly to that team or seat.
- Result: timeline visibility is broader than communications targeting.

### Proposal recipient status is not shared server state

- `Unread`, `Acknowledged`, `Responded`, `Declined`, and `Ignored` are stored in browser `localStorage`.
- Result: the backend is not currently the source of truth for proposal recipient state chips.

### White Cell placeholder sections are not wired

- `Proposals`
- `Move Responses`
- `Verba AI Population Sentiments`

These exist in the White Cell page shell, but are not populated by the current controller.

### Observer contract is transitional

- Legacy `viewer` behavior still appears in some code branches.
- The live join contract no longer offers observer as a public seat.

## Backend Alignment Requirements

If the backend is being aligned to the current frontend without redesigning the UI, it should preserve the following:

- Public seat limits:
  - 1 facilitator per Blue, Red, Green
  - 1 scribe per Blue, Red, Green
  - 2 notetakers per Blue, Red, Green
- Global White Cell operator roles:
  - `whitecell_lead`
  - `whitecell_support`
- Game Master-only session control:
  - create session
  - delete session
  - remove participant
- Team-lead action workflow support:
  - Blue draft and submit
  - Red move response submit
  - Green proposal submit
- Team RFI workflow support
- White Cell communications with seat-specific and whole-team recipients
- White Cell adjudication flow
- White Cell Blue-to-Red guidance flow
- White Cell forwarding of approved Green proposals to Blue or Red
- Team and notetaker timeline visibility that includes `white_cell` events
- Participant-scoped notetaker move data plus shared capture timeline events

The backend does not need to invent new entities for proposal recipient status if the plan is to preserve frontend behavior exactly as it works today. That state is currently local-only.

## Blank Supabase Migration Order

For a brand-new Supabase project, the current blank-project migration order is:

1. `data/COMPLETE_SCHEMA.sql`
2. `data/2026-04-08_live_demo_rls_hardening.sql`
3. `data/2026-04-08_operator_auth_digest_fix.sql`
4. `data/2026-04-08_facilitator_join_session_access_fix.sql`
5. `data/2026-04-09_global_white_cell_role_contract.sql`
6. `data/2026-04-16_game_master_remove_session_participant.sql`

This chain covers the current backend contract needed for:

- public facilitator, scribe, and notetaker seat claims
- global White Cell operator roles
- White Cell action and communications flows
- Game Master participant removal

It does not replace frontend-only behavior such as local proposal status chips or unwired placeholder sections.
