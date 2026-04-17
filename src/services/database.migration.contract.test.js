import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const GLOBAL_WHITE_CELL_ROLE_CONTRACT_PATH = new URL(
    '../../data/2026-04-09_global_white_cell_role_contract.sql',
    import.meta.url
);
const LIVE_DEMO_RLS_HARDENING_PATH = new URL(
    '../../data/2026-04-08_live_demo_rls_hardening.sql',
    import.meta.url
);
const GAME_MASTER_REMOVE_PARTICIPANT_CONTRACT_PATH = new URL(
    '../../data/2026-04-16_game_master_remove_session_participant.sql',
    import.meta.url
);

function extractFunctionBody(sql, functionName) {
    const functionPattern = new RegExp(
        `CREATE OR REPLACE FUNCTION public\\.${functionName}\\([\\s\\S]*?AS \\\$\\$([\\s\\S]*?)\\$\\$;`,
        'm'
    );
    const match = sql.match(functionPattern);

    expect(match, `Expected SQL contract for ${functionName} to exist.`).not.toBeNull();

    return match[1];
}

describe('database migration contracts', () => {
    it('keeps first-time public seat claims on the internal stale-seat cleanup helper', () => {
        const sql = readFileSync(GLOBAL_WHITE_CELL_ROLE_CONTRACT_PATH, 'utf8');
        const claimSessionRoleSeatBody = extractFunctionBody(sql, 'claim_session_role_seat');

        expect(claimSessionRoleSeatBody).toContain('release_stale_session_role_seats_internal');
        expect(claimSessionRoleSeatBody).not.toContain(
            'release_stale_session_role_seats(requested_session_id, normalized_timeout_seconds)'
        );
    });

    it('ships the facilitator, scribe, and notetaker seat limits in the current role contract', () => {
        const sql = readFileSync(GLOBAL_WHITE_CELL_ROLE_CONTRACT_PATH, 'utf8');
        const seatLimitBody = extractFunctionBody(sql, 'get_session_role_seat_limit');

        expect(seatLimitBody).toContain("requested_role ~ '^(blue|red|green)_facilitator$' THEN 1");
        expect(seatLimitBody).toContain("requested_role ~ '^(blue|red|green)_scribe$' THEN 1");
        expect(seatLimitBody).toContain("requested_role ~ '^(blue|red|green)_notetaker$' THEN 2");
        expect(seatLimitBody).not.toContain("requested_role = 'viewer'");
    });

    it('allows White Cell communications to target facilitator, scribe, and notetaker seats', () => {
        const sql = readFileSync(LIVE_DEMO_RLS_HARDENING_PATH, 'utf8');
        const sendCommunicationBody = extractFunctionBody(sql, 'operator_send_communication');

        expect(sendCommunicationBody).toContain("'blue_facilitator'");
        expect(sendCommunicationBody).toContain("'blue_scribe'");
        expect(sendCommunicationBody).toContain("'blue_notetaker'");
    });

    it('adds a Game Master-only participant removal RPC that revokes linked White Cell grants', () => {
        const sql = readFileSync(GAME_MASTER_REMOVE_PARTICIPANT_CONTRACT_PATH, 'utf8');
        const removeParticipantBody = extractFunctionBody(sql, 'operator_remove_session_participant');

        expect(removeParticipantBody).toContain("live_demo_has_operator_grant('gamemaster')");
        expect(removeParticipantBody).toContain('DELETE FROM public.session_participants');
        expect(removeParticipantBody).toContain('DELETE FROM public.operator_grants');
        expect(removeParticipantBody).toContain("og.surface = 'whitecell'");
    });
});
