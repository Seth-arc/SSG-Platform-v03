import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const GLOBAL_WHITE_CELL_ROLE_CONTRACT_PATH = new URL(
    '../../data/2026-04-09_global_white_cell_role_contract.sql',
    import.meta.url
);
const WHITE_CELL_BACKEND_ALIGNMENT_PATH = new URL(
    '../../data/2026-04-17_white_cell_backend_alignment.sql',
    import.meta.url
);
const SEAT_CLAIM_ROLE_NORMALIZATION_PATH = new URL(
    '../../data/2026-04-17_seat_claim_role_input_normalization.sql',
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
        const sql = readFileSync(WHITE_CELL_BACKEND_ALIGNMENT_PATH, 'utf8');
        const sendCommunicationBody = extractFunctionBody(sql, 'operator_send_communication');

        expect(sendCommunicationBody).toContain("'blue_facilitator'");
        expect(sendCommunicationBody).toContain("'blue_scribe'");
        expect(sendCommunicationBody).toContain("'blue_notetaker'");
        expect(sendCommunicationBody).toContain('requested_metadata');
    });

    it('ships a backend proposal recipient status RPC with the canonical inbox states', () => {
        const sql = readFileSync(WHITE_CELL_BACKEND_ALIGNMENT_PATH, 'utf8');
        const proposalStatusBody = extractFunctionBody(sql, 'update_proposal_recipient_status');

        expect(proposalStatusBody).toContain("'unread'");
        expect(proposalStatusBody).toContain("'acknowledged'");
        expect(proposalStatusBody).toContain("'responded'");
        expect(proposalStatusBody).toContain("'declined'");
        expect(proposalStatusBody).toContain("'ignored'");
        expect(proposalStatusBody).toContain("participant_surface NOT IN ('facilitator', 'scribe')");
    });

    it('extends participant removal to White Cell while still revoking linked White Cell grants', () => {
        const sql = readFileSync(WHITE_CELL_BACKEND_ALIGNMENT_PATH, 'utf8');
        const removeParticipantBody = extractFunctionBody(sql, 'operator_remove_session_participant');

        expect(removeParticipantBody).toContain("live_demo_has_operator_grant('gamemaster')");
        expect(removeParticipantBody).toContain("live_demo_has_operator_grant('whitecell')");
        expect(removeParticipantBody).toContain('DELETE FROM public.session_participants');
        expect(removeParticipantBody).toContain('DELETE FROM public.operator_grants');
        expect(removeParticipantBody).toContain("og.surface = 'whitecell'");
    });

    it('normalizes seat-claim role input before seat-limit evaluation', () => {
        const sql = readFileSync(SEAT_CLAIM_ROLE_NORMALIZATION_PATH, 'utf8');
        const seatLimitBody = extractFunctionBody(sql, 'get_session_role_seat_limit');
        const claimSeatBody = extractFunctionBody(sql, 'claim_session_role_seat');

        expect(seatLimitBody).toContain("regexp_replace(COALESCE(requested_role, ''), '[[:space:]]+', '', 'g')");
        expect(seatLimitBody).toContain('chr(8203)');
        expect(claimSeatBody).toContain("regexp_replace(COALESCE(requested_role, ''), '[[:space:]]+', '', 'g')");
        expect(claimSeatBody).toContain('sanitized_requested_role');
        expect(claimSeatBody).toContain('public.get_session_role_seat_limit(normalized_role)');
    });
});
