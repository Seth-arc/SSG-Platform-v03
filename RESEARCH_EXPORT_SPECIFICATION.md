# Research Export Specification

Schema version: 1.0.0

## Purpose

This document specifies a research-grade export for the SSG Simulation Platform. The current Game Master export captures outcomes and a display feed: session metadata, game state, actions, RFIs, timeline, and participants. That bundle is adequate for a live demo. It is not adequate as a research dataset, because it records terminal states rather than the process that produced them, and it excludes the two most process-rich artifacts the platform holds: notetaker data and the audit trail.

This specification defines an export whose center of gravity is participant activity over time: who did what, when, in what order, with what latency, through how many revisions, and in coordination with whom. It is designed to support the platform's "train the decision, not the outcome" framing, where the object of study is the deliberative process rather than the final adjudication.

## Scope

The specification covers:

1. A capture model and a research-capture mode toggle.
2. Pseudonymous participant identity suitable for de-identified analysis and IRB review.
3. A concrete Postgres schema for the captured tables and the exported bundle.
4. The bundle file layout, including backward-compatible legacy files.
5. Integrity, versioning, and reproducibility requirements.
6. Implementation notes mapping the schema onto the existing Supabase backend and Game Master export surface.

It does not change any demo behavior. Research capture is additive and gated behind an explicit mode.

## Design Principles

1. Event-sourced spine. An append-only audit event log is the canonical record. Every other research table is a projection derived from it at export time. This resolves the current exclusion of the audit trail by making it the foundation rather than an afterthought.
2. Process over terminal state. Lifecycle transitions are recorded as discrete, timestamped rows. A proposal that was ignored for eight minutes and then responded to is a different behavioral datum from one answered instantly, and the export must preserve that difference.
3. Authored artifacts. Notes, drafts, and revisions are retained with author, role, seat, team, and timestamps, because they are the most interpretable qualitative evidence of reasoning.
4. Analysis-ready outputs. JSON for fidelity, plus tidy long-format CSV and newline-delimited JSON that load directly into R, pandas, or Stata. Fields every analyst would otherwise re-derive are precomputed.
5. De-identified by default. The exported bundle carries pseudonyms only. Any link to real identity lives in a separate, access-controlled table and is never included without explicit consent and access control.
6. Reproducible and tamper-evident. Every bundle declares its schema version, software build, session configuration snapshot, and timezone, and the event log is hash-chained so the record can be trusted as faithful.

## Capture Mode

Research capture is controlled by a single runtime flag and is off by default.

- Key `research_capture_mode` is stored in `public.live_demo_runtime_config` alongside the existing operator-code hash row.
- Allowed values: `standard` (default) and `research`.
- In `standard` mode the platform writes only the audit events already needed for normal operation. Draft-level, edit-level, and data-quality capture are not written.
- In `research` mode the platform additionally writes draft and revision rows, note edit history, interaction edges, and data-quality events.
- The active mode is recorded in the export manifest, so a consumer can tell whether a dataset is full-fidelity or operational-only.

Research mode increases write volume, storage, and consent obligations. It must be disclosed to participants before a session is captured. See Privacy and Consent.

## Identity and Pseudonymization

The platform uses Supabase anonymous authentication. Each browser identity receives a stable auth UID that persists across reload and rejoin within the same browser. The research identity model is built on this.

- `participant_pseudonym` is the stable analysis identifier. It is computed as a keyed hash of the auth UID and a per-session salt: `encode(extensions.digest(auth_uid || session_salt, 'sha256'), 'hex')`, truncated to a fixed length. The salt is stored on the session row and is never included in the de-identified bundle.
- The pseudonym is stable for a given browser identity across reload and rejoin. A participant who moves to a different device or clears browser state receives a new auth UID and therefore a new pseudonym. This limit is inherent to anonymous auth and must be documented in the codebook, not hidden. Where a single human must be tracked across devices, that link is recorded manually in the gated identity map.
- The de-identified bundle contains no display names, no raw auth UIDs, and no operator access codes. Display names and raw UIDs exist only in `research_identity_map`, which is excluded from the default export.

## Schema

All tables live in the `public` schema. Types are Postgres. Enumerated values are expressed as `CHECK` constraints rather than native enums so that the contract can evolve through migrations without type-alter friction, consistent with the repo's existing migration style.

Canonical role strings follow the existing seat contract: `blue_facilitator`, `blue_scribe`, `blue_notetaker`, `red_facilitator`, `red_scribe`, `red_notetaker`, `green_facilitator`, `green_scribe`, `green_notetaker`, `whitecell_lead`, `whitecell_support`, `game_master`. Team values are `blue`, `red`, `green`, `whitecell`, `gamemaster`.

### research_audit_event_log

The canonical, append-only spine. One row per state-changing event. No row is ever updated or deleted.

```sql
create table if not exists public.research_audit_event_log (
    event_id            bigint generated always as identity primary key, -- monotonic order within the database
    event_uuid          uuid not null default gen_random_uuid(),         -- stable global identifier
    session_id          uuid not null references public.sessions (id),
    event_ts_utc        timestamptz not null,        -- server-authoritative event time, millisecond resolution, UTC
    server_received_utc timestamptz not null default clock_timestamp(),  -- when the backend recorded the event
    client_ts_utc       timestamptz,                 -- client-reported time, for skew and latency analysis, nullable
    actor_pseudonym     text,                        -- null only for system-generated events
    actor_role          text,                        -- canonical role string, null for system events
    actor_team          text,                        -- blue|red|green|whitecell|gamemaster, null for system events
    actor_seat_index    integer,                     -- seat ordinal within a multi-seat role, null where not applicable
    event_type          text not null,               -- see event-type vocabulary below
    entity_type         text not null,               -- session|game_state|action|proposal|move_response|rfi|communication|note|seat|grant|system
    entity_id           uuid,                         -- the affected entity, null for session-level system events
    move_number         integer,                      -- simulation move/turn at time of event, null if pre-move
    action_sequence     integer,                      -- Blue action number within the move, null where not applicable
    correlation_id      uuid,                         -- groups all events in one workflow (e.g. a proposal lifecycle)
    causal_event_id     bigint references public.research_audit_event_log (event_id), -- direct cause, e.g. response -> forward
    before_state        jsonb,                        -- entity state before the event, null on create
    after_state         jsonb,                        -- entity state after the event, null on delete
    payload             jsonb not null default '{}'::jsonb, -- event-specific detail not captured by before/after
    -- precomputed analysis fields, populated at write or backfilled at export
    phase               text,                         -- session phase label at event time
    elapsed_session_s   numeric,                      -- seconds since session start
    elapsed_actor_prev_s numeric,                     -- seconds since this actor's previous event, null on first
    -- tamper-evident chain
    prev_event_hash     text,                         -- event_hash of the previous row in this session
    event_hash          text not null,                -- sha256 over canonical row fields plus prev_event_hash
    constraint research_audit_event_log_event_type_chk check (
        event_type in (
            'SESSION_CREATED','SESSION_CONFIG_UPDATED','SESSION_CLOSED',
            'GAME_STATE_INITIALIZED','GAME_STATE_UPDATED','MOVE_ADVANCED',
            'SEAT_CLAIMED','SEAT_RELEASED','SEAT_REASSIGNED',
            'OPERATOR_AUTHORIZED','GRANT_ISSUED','GRANT_REVOKED',
            'ACTION_DRAFT_SAVED','ACTION_SUBMITTED','ACTION_ADJUDICATED',
            'PROPOSAL_CREATED','PROPOSAL_SUBMITTED','PROPOSAL_FORWARDED',
            'PROPOSAL_CHANGES_REQUESTED','PROPOSAL_REJECTED',
            'PROPOSAL_ACKNOWLEDGED','PROPOSAL_DECLINED','PROPOSAL_IGNORED','PROPOSAL_RESPONDED',
            'MOVE_RESPONSE_SUBMITTED',
            'RFI_RAISED','RFI_ANSWERED',
            'COMMUNICATION_SENT',
            'NOTE_CREATED','NOTE_EDITED','NOTE_DELETED',
            'PARTICIPANT_DISCONNECTED','PARTICIPANT_RECONNECTED','STALE_SEAT_RELEASED','HEARTBEAT_TIMEOUT'
        )
    )
);

create index if not exists research_audit_event_log_session_ts_idx
    on public.research_audit_event_log (session_id, event_ts_utc, event_id);
create index if not exists research_audit_event_log_correlation_idx
    on public.research_audit_event_log (correlation_id);
create index if not exists research_audit_event_log_actor_idx
    on public.research_audit_event_log (session_id, actor_pseudonym, event_ts_utc);
```

Append-only enforcement is described in Implementation Notes. The `event_hash` chains each row to its predecessor so any post hoc edit, insertion, or deletion is detectable.

### research_participant

One row per pseudonymous participant per session. Derived from seat claims and the event log.

```sql
create table if not exists public.research_participant (
    participant_pseudonym text not null,
    session_id            uuid not null references public.sessions (id),
    auth_uid_hash         text not null,    -- one-way hash of auth UID, not the UID itself
    team                  text,             -- blue|red|green|whitecell|gamemaster
    role                  text,             -- canonical role string
    seat_index            integer,          -- seat ordinal within role
    first_seen_utc        timestamptz not null,
    last_seen_utc         timestamptz not null,
    active_duration_s     numeric,          -- summed time between connect and disconnect events
    rejoin_count          integer not null default 0,
    primary key (participant_pseudonym, session_id, role, seat_index)
);
```

A single human who occupied two seats across a session appears as two rows under one pseudonym, distinguished by role and seat. This is intentional: the unit of analysis is the seat-occupancy, with the pseudonym available for participant-level rollups.

### research_note and research_note_revision

Notetaker data with authorship and full edit history. `research_note` holds the current state; `research_note_revision` holds every prior version when capture mode is `research`.

```sql
create table if not exists public.research_note (
    note_id             uuid primary key,
    session_id          uuid not null references public.sessions (id),
    author_pseudonym    text not null,
    author_role         text not null,
    author_team         text not null,
    author_seat_index   integer,
    scope               text not null,      -- seat_scoped|shared_capture
    visibility          text not null,      -- private|team|operator
    move_number         integer,
    linked_entity_type  text,               -- action|proposal|rfi|move_response, null if freestanding
    linked_entity_id    uuid,
    content_text        text not null,
    content_length_chars integer not null,
    created_utc         timestamptz not null,
    last_edited_utc     timestamptz not null,
    edit_count          integer not null default 0,
    current_version     integer not null default 1,
    constraint research_note_scope_chk check (scope in ('seat_scoped','shared_capture'))
);

create table if not exists public.research_note_revision (
    note_id             uuid not null references public.research_note (note_id),
    version             integer not null,
    author_pseudonym    text not null,      -- editor of this version
    content_text        text not null,
    content_length_chars integer not null,
    edited_utc          timestamptz not null,
    supersedes_version  integer,            -- prior version this one replaced, null for the first
    primary key (note_id, version)
);
```

### research_draft_revision

Saved drafts, abandoned drafts, and proposal revisions across Request Changes cycles. This is where deliberation time and revision count become measurable. Captured only in `research` mode.

```sql
create table if not exists public.research_draft_revision (
    draft_id            uuid primary key,
    session_id          uuid not null references public.sessions (id),
    author_pseudonym    text not null,
    author_role         text not null,
    author_team         text not null,
    author_seat_index   integer,
    artifact_type       text not null,      -- action|proposal
    artifact_id         uuid,               -- final submitted entity id, null if abandoned
    revision_number     integer not null,   -- 1-based within the artifact's revision cycle
    revision_cycle_id   uuid not null,      -- groups revisions across Request Changes loops
    status              text not null,      -- draft_saved|submitted|abandoned|superseded|changes_requested
    move_number         integer,
    action_sequence     integer,
    wizard_page_reached integer,            -- 1..3 for the Take Action wizard, null for proposals
    content_snapshot    jsonb not null,
    content_diff_from_prev jsonb,           -- structural diff against the previous revision, null on first
    created_utc         timestamptz not null,
    submitted_utc       timestamptz,        -- null unless status reached submitted
    time_to_submit_s    numeric,            -- submitted_utc minus the first draft created_utc, null if not submitted
    constraint research_draft_revision_artifact_chk check (artifact_type in ('action','proposal')),
    constraint research_draft_revision_status_chk check (
        status in ('draft_saved','submitted','abandoned','superseded','changes_requested')
    )
);

create index if not exists research_draft_revision_cycle_idx
    on public.research_draft_revision (revision_cycle_id, revision_number);
```

### research_state_transition

Lifecycle transitions for actions, proposals, RFIs, and Red move responses. Records every state change with timestamp, actor, and the dwell time spent in the prior state.

```sql
create table if not exists public.research_state_transition (
    transition_id       uuid primary key,
    session_id          uuid not null references public.sessions (id),
    entity_type         text not null,      -- action|proposal|rfi|move_response
    entity_id           uuid not null,
    from_state          text,               -- null for the initial transition into existence
    to_state            text not null,
    transition_utc      timestamptz not null,
    actor_pseudonym     text,               -- null for system or timeout transitions
    actor_role          text,
    actor_team          text,
    recipient_team      text,               -- target team for a forwarded proposal, else null
    move_number         integer,
    dwell_in_from_s     numeric,            -- seconds spent in from_state before this transition, null on first
    triggering_event_id bigint references public.research_audit_event_log (event_id),
    constraint research_state_transition_entity_chk check (
        entity_type in ('action','proposal','rfi','move_response')
    )
);

create index if not exists research_state_transition_entity_idx
    on public.research_state_transition (entity_type, entity_id, transition_utc);
```

State vocabularies, aligned to the existing platform contract:

- Action: `draft`, `submitted`, `adjudicated`.
- Proposal: `created`, `submitted`, `forwarded`, `changes_requested`, `rejected`, `acknowledged`, `declined`, `ignored`, `responded`. The final-state lock that prevents a second `PROPOSAL_RESPONSE` is reflected here as the absence of any transition out of `acknowledged`, `declined`, `ignored`, or `responded`.
- RFI: `pending`, `answered`.
- Move response: `submitted`, `reviewed`.

### research_interaction_edge

The session as an interaction network. One row per directed communicative act. Captured in `research` mode; in `standard` mode it can be reconstructed from communications at export time at coarser granularity.

```sql
create table if not exists public.research_interaction_edge (
    edge_id             uuid primary key,
    session_id          uuid not null references public.sessions (id),
    source_pseudonym    text,               -- null where the source is a team-level or operator-level act
    source_role         text,
    source_team         text,
    target_pseudonym    text,               -- null where the target is a whole team
    target_team         text,
    channel             text not null,      -- communication|proposal_forward|proposal_response|adjudication|rfi
    direction           text not null,      -- operator_to_team|team_to_operator|team_to_team|intra_team
    communication_type  text,               -- canonical communications type where channel = communication
    entity_id           uuid,               -- the communication, proposal, action, or rfi involved
    move_number         integer,
    occurred_utc        timestamptz not null,
    latency_s           numeric,            -- response latency against the prompting act, null if not a response
    constraint research_interaction_edge_channel_chk check (
        channel in ('communication','proposal_forward','proposal_response','adjudication','rfi')
    )
);

create index if not exists research_interaction_edge_session_idx
    on public.research_interaction_edge (session_id, occurred_utc);
```

### research_data_quality_event

Connectivity and seat-integrity events, so an analyst sees data gaps rather than inferring them. Captured in `research` mode.

```sql
create table if not exists public.research_data_quality_event (
    dq_event_id         uuid primary key,
    session_id          uuid not null references public.sessions (id),
    participant_pseudonym text,             -- null where the event is seat-level without a known occupant
    role                text,
    team                text,
    seat_index          integer,
    event_type          text not null,      -- disconnect|reconnect|stale_seat_release|seat_reassignment|heartbeat_gap|heartbeat_timeout
    occurred_utc        timestamptz not null,
    gap_seconds         numeric,            -- duration of the gap where applicable
    detail              jsonb not null default '{}'::jsonb,
    constraint research_data_quality_event_type_chk check (
        event_type in ('disconnect','reconnect','stale_seat_release','seat_reassignment','heartbeat_gap','heartbeat_timeout')
    )
);
```

The platform's documented 90 second stale-seat window is captured here as the `gap_seconds` on a `heartbeat_timeout` followed by a `stale_seat_release`.

### research_derived_participant_metrics and research_derived_session_metrics

Precomputed convenience tables so analysts do not re-derive common measures. Both are generated at export time from the tables above.

```sql
create table if not exists public.research_derived_participant_metrics (
    session_id              uuid not null,
    participant_pseudonym   text not null,
    role                    text,
    team                    text,
    seat_index              integer,
    events_count            integer not null default 0,
    notes_count             integer not null default 0,
    note_edits_count        integer not null default 0,
    drafts_count            integer not null default 0,
    submissions_count       integer not null default 0,
    mean_time_to_submit_s   numeric,
    mean_response_latency_s numeric,
    active_duration_s       numeric,
    disconnect_count        integer not null default 0,
    first_event_offset_s    numeric,        -- seconds from session start to first event
    last_event_offset_s     numeric,
    primary key (session_id, participant_pseudonym, role, seat_index)
);

create table if not exists public.research_derived_session_metrics (
    session_id              uuid primary key,
    capture_mode            text not null,
    session_duration_s      numeric,
    moves_count             integer not null default 0,
    participants_active     integer not null default 0,
    total_events            integer not null default 0,
    actions_submitted       integer not null default 0,
    actions_adjudicated     integer not null default 0,
    proposals_submitted     integer not null default 0,
    proposals_forwarded     integer not null default 0,
    rfis_raised             integer not null default 0,
    communications_sent     integer not null default 0,
    mean_proposal_response_latency_s numeric
);
```

### research_identity_map (excluded from the default export)

The only table linking pseudonyms to real identity. It is never written to the de-identified bundle and is exported only under explicit consent and access control.

```sql
create table if not exists public.research_identity_map (
    participant_pseudonym text not null,
    session_id            uuid not null references public.sessions (id),
    auth_uid              text not null,    -- raw Supabase auth UID
    display_name          text,
    consent_status        text not null default 'unknown', -- granted|withheld|unknown
    consent_recorded_utc  timestamptz,
    primary key (participant_pseudonym, session_id)
);
```

## Codebook

Every bundle ships a machine-readable codebook describing each exported column. The codebook is generated from a single source table so it cannot drift from the schema.

```sql
create table if not exists public.research_export_codebook (
    table_name      text not null,
    column_name     text not null,
    data_type       text not null,      -- export type: string|integer|number|boolean|timestamp_utc|json
    units           text,               -- e.g. seconds, characters, count, null if not applicable
    allowed_values  text,               -- enumerated values where the column is constrained
    nullable        boolean not null,
    is_derived      boolean not null,   -- true if computed rather than directly recorded
    derivation      text,               -- formula or source description for derived columns
    pii_class       text not null,      -- none|pseudonymous|sensitive_excluded
    description     text not null,
    primary key (table_name, column_name)
);
```

`pii_class` lets a downstream consumer filter or treat columns appropriately. No column in the de-identified bundle is classed `sensitive_excluded`; that class exists to document, in the codebook, the fields that were deliberately withheld.

## Bundle File Layout

The export produces a single archive. JSON preserves fidelity, CSV provides tidy long-format tables, and the event log is additionally provided as newline-delimited JSON for streaming loads into pandas or R. The legacy directory reproduces the current bundle unchanged so existing consumers do not break.

```
research_export_<session_id>_<YYYYMMDDTHHMMSSZ>/
    manifest.json                         # see Manifest
    codebook.json                         # research_export_codebook as JSON
    event_log.jsonl                       # canonical spine, one JSON object per line, ordered by event_id
    event_log.csv                         # same rows, tidy long format
    participants.csv
    participants.json
    notes.csv
    notes.json
    note_revisions.csv
    note_revisions.json
    drafts_revisions.csv
    drafts_revisions.json
    state_transitions.csv
    state_transitions.json
    interaction_edges.csv
    interaction_edges.json
    data_quality_events.csv
    data_quality_events.json
    derived_participant_metrics.csv
    derived_session_metrics.csv
    legacy/                               # the current Game Master bundle, unchanged
        session_metadata.json
        game_state.json
        actions.csv
        rfis.csv
        timeline.csv
        participants.csv
    checksums.sha256                      # one sha256 line per file in the bundle
```

`research_identity_map` is never included in this archive. When a consented identity export is authorized separately, it is produced as its own access-controlled file outside the de-identified bundle.

## Manifest

`manifest.json` makes each dataset reproducible and comparable across sessions and across software versions. Required fields:

```json
{
  "schema_version": "1.0.0",
  "export_format_revision": 1,
  "export_version": "<incrementing integer per generation of this session>",
  "software_build_hash": "<git commit or build hash of the platform>",
  "generated_at_utc": "<ISO 8601 UTC>",
  "generated_by_pseudonym": "<game master pseudonym>",
  "timezone_declared": "UTC",
  "session_id": "<uuid>",
  "capture_mode": "research",
  "session_config_snapshot": { },
  "row_counts": {
    "event_log": 0,
    "participants": 0,
    "notes": 0,
    "note_revisions": 0,
    "drafts_revisions": 0,
    "state_transitions": 0,
    "interaction_edges": 0,
    "data_quality_events": 0
  },
  "event_log_chain": {
    "first_event_hash": "<hash>",
    "last_event_hash": "<hash>",
    "session_checksum": "<sha256 over the ordered event_hash sequence>"
  },
  "codebook_ref": "codebook.json"
}
```

All timestamps in every file are ISO 8601 in UTC with explicit offset, and the manifest declares the timezone so there is no ambiguity when sessions are run in different locations.

## Integrity and Reproducibility

1. Append-only spine. `research_audit_event_log` accepts inserts only. Updates and deletes are not permitted at the role used by the application.
2. Hash chain. Each event row stores `prev_event_hash` and an `event_hash` computed over the canonical concatenation of its own fields plus `prev_event_hash`. The manifest records the first and last hashes and a session-level checksum over the ordered hash sequence. Recomputing the chain from `event_log.jsonl` and comparing against the manifest detects any tampering, insertion, deletion, or reordering.
3. File checksums. `checksums.sha256` lists a digest for every file in the bundle so transfer corruption is detectable.
4. Derivation transparency. Every derived column is flagged in the codebook with its derivation, so a consumer can reproduce or audit it from the raw event log and entity tables.

## Privacy and Consent

1. De-identified by default. The standard research bundle contains pseudonyms only. Real identity lives solely in `research_identity_map`, which is excluded from the bundle.
2. Disclosure. Research mode records drafts, edits, and connectivity events that standard mode does not. Participants must be informed before a session is captured in research mode. The active mode is recorded in the manifest so a dataset's capture posture is self-documenting.
3. Data minimization. No display names, raw auth UIDs, operator access codes, or Supabase auth records appear in the de-identified bundle.
4. Retention and access. The identity map and any consented identity export are held under access control separate from the de-identified datasets, with retention governed by the study's approved protocol.

## Implementation Notes

These notes map the specification onto the existing Supabase backend and Game Master export surface. They follow the repo's established conventions: SQL applied through dated migration files, RPCs in `public`, and `extensions.digest` for hashing.

### Migration

Add one migration following the existing naming pattern, for example `data/2026-06-04_research_export_capture.sql`, applied after the current chain in `SUPABASE_BLANK_PROJECT_RUNBOOK.md`. It creates the tables above, the codebook source table, the `research_capture_mode` config key, and the write-path RPCs.

### Append-only enforcement

Enforce insert-only on `research_audit_event_log` rather than relying on application discipline:

- Grant `insert` and `select` on the table to the application role; do not grant `update` or `delete`.
- Add a trigger that raises on `UPDATE` or `DELETE` so even a privileged path cannot silently alter history.
- Compute `prev_event_hash` and `event_hash` inside a `SECURITY DEFINER` write RPC, `record_research_event(...)`, so the chain cannot be set by the client. The RPC reads the current last hash for the session, computes the new hash, and inserts atomically.

### Capture wiring

Each existing state-changing RPC (`claim_session_role_seat`, `operator_send_communication`, `update_proposal_recipient_status`, action submission and adjudication, RFI handling, the heartbeat and stale-seat helpers) calls `record_research_event(...)` after its primary write. In `standard` mode the RPC records only the operational events already needed; in `research` mode it additionally records draft, note-edit, interaction, and data-quality events. Gate the additional writes on the `research_capture_mode` value so the demo path is unaffected when the flag is `standard`.

### Projection and export generation

The projection tables (`research_participant`, `research_state_transition`, `research_interaction_edge`, both derived-metric tables) are computed at export time from the event log and the existing operational tables, then serialized. Generating them at export rather than maintaining them live keeps the write path lean during a session and guarantees the projections are consistent with the canonical log.

### Game Master surface

Extend the existing Game Master export action with a research bundle option, available only when `research_capture_mode` is `research`. Keep the current export available unchanged. The research action produces the archive described in Bundle File Layout, including the `legacy/` directory so the present bundle remains a subset of the new one. Output formats stay within JSON and CSV as the repo currently specifies; `event_log.jsonl` is newline-delimited JSON and introduces no new dependency or format family.

### Pseudonym derivation

Compute `participant_pseudonym` once at first seat claim using `extensions.digest(auth_uid || session_salt, 'sha256')`, store the per-session salt on the session row, and reuse the pseudonym for all subsequent events from that auth identity in that session. Store the reverse link in `research_identity_map` only, and only when an identity export is authorized.

## Out of Scope for This Revision

The following are deliberately excluded from version 1.0.0 and noted so they are not mistaken for omissions:

- PDF or print-ready research exports.
- Real-time streaming of events to an external research store during a live session.
- Cross-session participant linkage across devices without a manually recorded identity link.
- Video, audio, or screen capture of participants.
