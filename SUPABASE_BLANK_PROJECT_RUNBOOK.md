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

Why the order matters:

- later files replace earlier RPC definitions
- `2026-04-17_white_cell_backend_alignment.sql` must run after `2026-04-16_game_master_remove_session_participant.sql` or the project will fall back to Game Master-only participant removal

## Do Not Run For A Fresh Bootstrap

These files are older point fixes and should not be run separately when you are already applying the chain above:

- `data/2026-04-07_secure_session_join_contract.sql`
- `data/2026-04-08_live_demo_role_seat_contract.sql`

Their behavior is already covered by `COMPLETE_SCHEMA.sql` plus the later migration chain above.

## Required Operator Code Setting

The hardened operator RPCs require a SHA-256 hash in a database setting. Without this, Game Master and White Cell authorization will fail even if the schema and RPCs exist.

Choose the operator code you want to use, compute its SHA-256 hash, then persist it at the database level.

Example SQL to generate the hash for a chosen access code:

```sql
select encode(extensions.digest('replace-this-code', 'sha256'), 'hex') as operator_code_sha256;
```

Then persist it:

```sql
alter database postgres
set "app.settings.live_demo_operator_code_sha256" = 'replace-with-the-generated-sha256-hash';
```

Notes:

- replace `postgres` only if your Supabase database uses a different name
- do not ship `admin2025` outside local testing
- after changing the database setting, open a new SQL Editor tab before re-checking it so the new session sees the persisted value

## Smoke Checks

Run these after all seven files and the operator-code setting are in place.

### 1. Verify the operator hash setting exists

```sql
select current_setting('app.settings.live_demo_operator_code_sha256', true) as live_demo_operator_code_sha256;
```

Pass looks like:

- one row
- value is not null
- value is not an empty string

### 2. Verify the key live-demo RPCs exist

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

### 3. Verify the seat-limit contract

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

### 4. Verify communications metadata support exists

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
