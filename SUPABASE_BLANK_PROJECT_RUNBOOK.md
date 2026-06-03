# Supabase Blank Project Runbook

Use this when the Supabase project is brand new and none of the SQL files in this repo have been applied yet.

## Scope

This is the safe bootstrap order for the live-demo backend contract currently used by the frontend:

- public join by session code
- facilitator / scribe / notetaker seat claims
- global White Cell lead / support operator roles
- Game Master and White Cell session administration
- White Cell communications
- backend-backed proposal recipient state

## Apply Order

Run these files in Supabase SQL Editor in this exact order. Do not skip ahead. Do not reorder them.

1. `data/COMPLETE_SCHEMA.sql`
2. `data/2026-04-08_live_demo_rls_hardening.sql`
3. `data/2026-04-08_operator_auth_digest_fix.sql`
4. `data/2026-04-08_facilitator_join_session_access_fix.sql`
5. `data/2026-04-09_global_white_cell_role_contract.sql`
6. `data/2026-04-16_game_master_remove_session_participant.sql`
7. `data/2026-04-17_white_cell_backend_alignment.sql`
8. `data/2026-04-17_seat_claim_role_input_normalization.sql`
9. `data/2026-06-02_operator_code_runtime_config_table.sql`
10. `data/2026-06-03_proposal_response_finalization_lock.sql`
11. `data/2026-06-04_research_export_capture.sql`

Why the order matters:

- later files replace earlier RPC definitions
- `2026-04-17_white_cell_backend_alignment.sql` must run after `2026-04-16_game_master_remove_session_participant.sql` or the project will fall back to Game Master-only participant removal
- the current `2026-04-17_white_cell_backend_alignment.sql` file explicitly drops any existing `communications_type_check` before re-adding it, so it is safe to reapply on projects that already carry an older communications type constraint
- `2026-04-17_seat_claim_role_input_normalization.sql` must run before step 9 so the active seat-claim RPC strips hidden whitespace and zero-width characters before the final operator-code migration is applied
- `2026-06-02_operator_code_runtime_config_table.sql` must run after the hardening chain so the final operator-code helper reads from `public.live_demo_runtime_config` instead of the unsupported `app.settings...` database setting path
- `2026-06-03_proposal_response_finalization_lock.sql` must run after `2026-04-17_white_cell_backend_alignment.sql` because it reapplies the same proposal-recipient RPC and insert policy with the final-state lock for already-provisioned projects
- `2026-06-04_research_export_capture.sql` must run last because it assumes the protected `public.live_demo_runtime_config` table already exists and extends the session-access contract onto the research export tables

## Do Not Run For A Fresh Bootstrap

These files are older point fixes and should not be run separately when you are already applying the chain above:

- `data/2026-04-07_secure_session_join_contract.sql`
- `data/2026-04-08_live_demo_role_seat_contract.sql`

Their behavior is already covered by `COMPLETE_SCHEMA.sql` plus the later migration chain above.

## Required Runtime Config Rows

The hardened operator RPCs require a SHA-256 hash row in `public.live_demo_runtime_config`. The research export path also reads `research_capture_mode` and can optionally surface `software_build_hash` in the exported manifest.

Choose the operator code you want to use, then upsert its SHA-256 hash into the protected runtime-config table. Set `research_capture_mode` to `research` only when the session is operating under that consent posture.

Example SQL:

```sql
insert into public.live_demo_runtime_config (config_key, config_value)
values (
    'operator_code_sha256',
    encode(extensions.digest('replace-this-code', 'sha256'), 'hex')
)
on conflict (config_key) do update
set config_value = excluded.config_value,
    updated_at = now();

insert into public.live_demo_runtime_config (config_key, config_value)
values (
    'research_capture_mode',
    'standard'
)
on conflict (config_key) do update
set config_value = excluded.config_value,
    updated_at = now();

insert into public.live_demo_runtime_config (config_key, config_value)
values (
    'software_build_hash',
    'replace-with-build-or-commit-hash'
)
on conflict (config_key) do update
set config_value = excluded.config_value,
    updated_at = now();
```

Notes:

- do not ship `admin2025` outside local testing
- `2026-06-02_operator_code_runtime_config_table.sql` already creates the table and migrates any legacy `app.settings.live_demo_operator_code_sha256` value forward when one exists
- `2026-06-04_research_export_capture.sql` seeds `research_capture_mode = 'standard'` and `software_build_hash = ''` when they are missing

## Smoke Checks

Run these after all eleven files and the runtime-config rows are in place.

### 1. Verify the operator hash row exists

```sql
select public.live_demo_operator_code_hash() as live_demo_operator_code_sha256;
```

Pass looks like:

- one row
- value is not null
- value is not an empty string

### 2. Verify the selected operator code matches

```sql
select public.live_demo_validate_operator_code('replace-this-code') as matches;
```

Pass looks like:

- one row
- `matches = true`

### 3. Verify the research export runtime helpers exist

```sql
select
    public.live_demo_research_capture_mode() as research_capture_mode,
    public.live_demo_software_build_hash() as software_build_hash;
```

Pass looks like:

- one row
- `research_capture_mode` is either `standard` or `research`
- `software_build_hash` is either null/empty by choice or the expected build identifier

### 4. Verify the key live-demo RPCs exist

```sql
select
    p.proname,
    pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n
    on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
      'lookup_joinable_session_by_code',
      'authorize_demo_operator',
      'create_live_demo_session',
      'claim_session_role_seat',
      'operator_remove_session_participant',
      'operator_send_communication',
      'update_proposal_recipient_status'
  )
order by p.proname, args;
```

Pass looks like these functions are present:

- `lookup_joinable_session_by_code(text)`
- `authorize_demo_operator(text, text, uuid, text, text, text)`
- `create_live_demo_session(text, text, text)`
- `claim_session_role_seat(uuid, text, text, text, integer)`
- `operator_remove_session_participant(uuid, uuid)`
- `operator_send_communication(uuid, text, text, text, text, uuid, jsonb)`
- `update_proposal_recipient_status(uuid, text, jsonb)`

### 5. Verify the seat-limit contract

```sql
select
    public.get_session_role_seat_limit('blue_facilitator') as blue_facilitator_limit,
    public.get_session_role_seat_limit('blue_scribe') as blue_scribe_limit,
    public.get_session_role_seat_limit('blue_notetaker') as blue_notetaker_limit,
    public.get_session_role_seat_limit('whitecell_lead') as whitecell_lead_limit,
    public.get_session_role_seat_limit('whitecell_support') as whitecell_support_limit;
```

Pass looks like:

- `blue_facilitator_limit = 1`
- `blue_scribe_limit = 1`
- `blue_notetaker_limit = 2`
- `whitecell_lead_limit = 1`
- `whitecell_support_limit = 1`

If the UI still shows the toast `This role cannot be claimed in the live demo.` when joining as a scribe, treat that as a contract mismatch signal:

- the current frontend should be submitting a canonical role like `blue_scribe`, not bare `scribe`
- the connected Supabase project should return `1` for `public.get_session_role_seat_limit('blue_scribe')`
- if that query returns `null`, the project is still on an outdated seat-claim contract
- if that query returns `1` but joins still fail, the active `claim_session_role_seat` RPC likely still needs the input-normalization patch in step 8

### 6. Verify communications metadata support exists

```sql
select
    column_name,
    data_type,
    is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'communications'
  and column_name = 'metadata';
```

Pass looks like:

- one row
- `data_type = jsonb`
- `is_nullable = NO`

## Failure Rule

If any file in the chain errors, stop there. Do not continue with later files until that failure is resolved, because the later migrations assume the earlier contract is already present.

## Proposal Recipient Action Symptom

If a forwarded proposal recipient action fails on a hardened live-demo project:

- `column "updated_at" of relation "communications" does not exist` when acknowledging, declining, or ignoring
- `new row violates row-level security policy for table "communications"` when responding

Reapply the current `data/2026-04-17_white_cell_backend_alignment.sql`. The current file removes the stale `updated_at` write from `update_proposal_recipient_status` and adds the facilitator/scribe `communications_live_demo_insert` policy required for `PROPOSAL_RESPONSE` writes back to White Cell.

If teams can still submit a second `PROPOSAL_RESPONSE` after the forwarded proposal already shows `responded`, `declined`, or `ignored`, apply `data/2026-06-03_proposal_response_finalization_lock.sql`. That follow-up patch reapplies the final-state guard in both `update_proposal_recipient_status` and `communications_live_demo_insert` without depending on re-running the older April file.

## Landing Page Reachability Symptom

If the landing page blocks with `Supabase Backend Unavailable`, the frontend is configured with a syntactically valid Supabase URL, but the auth host could not be reached. Typical causes are:

- the Pages build still points at an old or deleted project ref
- the GitHub Pages workflow is missing the `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` repository secrets
- DNS cannot resolve the configured `*.supabase.co` host
- the operator machine is offline or behind a network policy blocking Supabase

Fix the reachability issue first. Do not treat it as a session-code or seat-claim defect.

## Landing Page Auth Policy Symptom

If the landing page reports that browser identity bootstrap failed after the backend is reachable, check Supabase Auth policy before debugging join RPCs:

- `Anonymous sign-ins` must be enabled for the project
- `Allow new users to sign up` must remain enabled, because anonymous bootstrap uses the Auth signup flow

If either setting is off, public facilitator, scribe, notetaker, and White Cell operator bootstrap will fail before session lookup.

## GitHub Pages Secret Wiring

The GitHub Pages deployment workflow expects repository secrets named:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

If either secret is missing, the Pages build should fail before publishing. Do not rely on local `.env` or `.env.local` files to supply production Pages values.
