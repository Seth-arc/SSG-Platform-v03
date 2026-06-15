import { CONFIG } from '../../core/config.js';
import {
    formatBlueActionSelection,
    getActionSequenceNumber,
    getBlueActionViewModel,
    parseBlueActionDetails
} from '../actions/blueActionDetails.js';
import {
    PROPOSAL_ACTION_MECHANISM,
    getProposalViewModel,
    parseProposalDetails
} from '../actions/proposalDetails.js';
import {
    MOVE_RESPONSE_ACTION_MECHANISM,
    getMoveResponseViewModel,
    parseMoveResponseDetails
} from '../actions/moveResponseDetails.js';
import {
    arrayToCsv,
    exportSessionActionsCsv,
    exportSessionParticipantsCsv,
    exportSessionRequestsCsv,
    exportSessionTimelineCsv
} from './exportCsv.js';

export const RESEARCH_EXPORT_SCHEMA_VERSION = '1.2.0';
export const RESEARCH_EXPORT_FORMAT_REVISION = 3;

const HASHED_EVENT_FIELDS = [
    'event_id',
    'event_uuid',
    'session_id',
    'event_ts_utc',
    'server_received_utc',
    'client_ts_utc',
    'actor_pseudonym',
    'actor_role',
    'actor_team',
    'actor_seat_index',
    'event_type',
    'entity_type',
    'entity_id',
    'move_number',
    'action_sequence',
    'correlation_id',
    'causal_event_id',
    'before_state',
    'after_state',
    'payload',
    'phase',
    'elapsed_session_s',
    'elapsed_actor_prev_s',
    'prev_event_hash'
];

const ROLE_TO_TEAM = Object.freeze({
    game_master: 'gamemaster',
    whitecell_lead: 'whitecell',
    whitecell_support: 'whitecell'
});

const RESEARCH_EXPORT_COLUMNS = Object.freeze({
    event_log: [
        'event_id',
        'event_uuid',
        'session_id',
        'event_ts_utc',
        'server_received_utc',
        'client_ts_utc',
        'actor_pseudonym',
        'actor_role',
        'actor_team',
        'actor_seat_index',
        'event_type',
        'entity_type',
        'entity_id',
        'move_number',
        'action_sequence',
        'correlation_id',
        'causal_event_id',
        'before_state',
        'after_state',
        'payload',
        'phase',
        'elapsed_session_s',
        'elapsed_actor_prev_s',
        'prev_event_hash',
        'event_hash'
    ],
    participants: [
        'participant_pseudonym',
        'session_id',
        'auth_uid_hash',
        'team',
        'role',
        'seat_index',
        'first_seen_utc',
        'last_seen_utc',
        'active_duration_s',
        'rejoin_count'
    ],
    notes: [
        'note_id',
        'session_id',
        'author_pseudonym',
        'author_role',
        'author_team',
        'author_seat_index',
        'scope',
        'visibility',
        'move_number',
        'linked_entity_type',
        'linked_entity_id',
        'content_text',
        'content_length_chars',
        'created_utc',
        'last_edited_utc',
        'edit_count',
        'current_version'
    ],
    note_revisions: [
        'note_id',
        'version',
        'author_pseudonym',
        'content_text',
        'content_length_chars',
        'edited_utc',
        'supersedes_version'
    ],
    drafts_revisions: [
        'draft_id',
        'session_id',
        'author_pseudonym',
        'author_role',
        'author_team',
        'author_seat_index',
        'artifact_type',
        'artifact_id',
        'revision_number',
        'revision_cycle_id',
        'status',
        'move_number',
        'action_sequence',
        'wizard_page_reached',
        'content_snapshot',
        'content_diff_from_prev',
        'created_utc',
        'submitted_utc',
        'time_to_submit_s'
    ],
    state_transitions: [
        'transition_id',
        'session_id',
        'entity_type',
        'entity_id',
        'from_state',
        'to_state',
        'transition_utc',
        'actor_pseudonym',
        'actor_role',
        'actor_team',
        'recipient_team',
        'move_number',
        'dwell_in_from_s',
        'triggering_event_id'
    ],
    action_content: [
        'action_id',
        'session_id',
        'author_pseudonym',
        'author_role',
        'author_team',
        'move_number',
        'action_sequence',
        'title',
        'action_type',
        'intent_text',
        'targets',
        'instruments',
        'resources_committed',
        'full_content',
        'submitted_utc',
        'final_status'
    ],
    proposal_content: [
        'proposal_id',
        'session_id',
        'author_pseudonym',
        'author_role',
        'author_team',
        'move_number',
        'title',
        'intended_recipient_team',
        'proposal_text',
        'requested_action',
        'rationale',
        'full_content',
        'submitted_utc',
        'review_decision',
        'review_reason',
        'reviewer_pseudonym',
        'reviewed_utc',
        'forwarded_to_team',
        'final_recipient_state'
    ],
    adjudication_content: [
        'adjudication_id',
        'session_id',
        'target_entity_type',
        'target_entity_id',
        'adjudicator_pseudonym',
        'adjudicator_role',
        'move_number',
        'ruling',
        'reasoning',
        'effects',
        'adjudicated_utc'
    ],
    move_response_content: [
        'move_response_id',
        'session_id',
        'author_pseudonym',
        'author_role',
        'author_team',
        'move_number',
        'responding_to_entity_type',
        'responding_to_entity_id',
        'posture',
        'response_text',
        'rationale',
        'full_content',
        'submitted_utc',
        'review_state'
    ],
    rfi_content: [
        'rfi_id',
        'session_id',
        'requester_pseudonym',
        'requester_role',
        'requester_team',
        'move_number',
        'question_text',
        'raised_utc',
        'answer_text',
        'answered_by_pseudonym',
        'answered_utc',
        'status'
    ],
    interaction_edges: [
        'edge_id',
        'session_id',
        'source_pseudonym',
        'source_role',
        'source_team',
        'target_pseudonym',
        'target_team',
        'channel',
        'direction',
        'communication_type',
        'entity_id',
        'move_number',
        'occurred_utc',
        'latency_s'
    ],
    data_quality_events: [
        'dq_event_id',
        'session_id',
        'participant_pseudonym',
        'role',
        'team',
        'seat_index',
        'event_type',
        'occurred_utc',
        'gap_seconds',
        'detail'
    ],
    derived_participant_metrics: [
        'session_id',
        'participant_pseudonym',
        'role',
        'team',
        'seat_index',
        'events_count',
        'notes_count',
        'note_edits_count',
        'drafts_count',
        'submissions_count',
        'mean_time_to_submit_s',
        'mean_response_latency_s',
        'active_duration_s',
        'disconnect_count',
        'first_event_offset_s',
        'last_event_offset_s'
    ],
    derived_session_metrics: [
        'session_id',
        'capture_mode',
        'session_duration_s',
        'moves_count',
        'participants_active',
        'total_events',
        'actions_submitted',
        'actions_adjudicated',
        'proposals_submitted',
        'proposals_forwarded',
        'rfis_raised',
        'communications_sent',
        'mean_proposal_response_latency_s'
    ]
});

function inferTeamFromRole(role = '', explicitTeam = null) {
    if (explicitTeam) {
        return String(explicitTeam || '').trim().toLowerCase() || null;
    }

    const normalizedRole = String(role || '').trim().toLowerCase();
    if (!normalizedRole) {
        return null;
    }

    if (ROLE_TO_TEAM[normalizedRole]) {
        return ROLE_TO_TEAM[normalizedRole];
    }

    const prefixedTeam = normalizedRole.match(/^(blue|red|green)_/i)?.[1];
    return prefixedTeam || null;
}

function safeArray(value) {
    return Array.isArray(value) ? value : [];
}

function safeObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : {};
}

function asUtcIso(value) {
    if (!value) {
        return null;
    }

    const timestamp = new Date(value);
    return Number.isNaN(timestamp.getTime())
        ? null
        : timestamp.toISOString();
}

function escapeHtml(value = '') {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizeCaptureMode(mode = 'standard') {
    return String(mode || '').trim().toLowerCase() === 'research'
        ? 'research'
        : 'standard';
}

function buildIsoTimestampFragment(value = new Date().toISOString()) {
    return String(value)
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}Z$/, 'Z')
        .replace(/\.\d+Z$/, 'Z');
}

function secondsBetween(start, end) {
    const startMs = start ? new Date(start).getTime() : Number.NaN;
    const endMs = end ? new Date(end).getTime() : Number.NaN;
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
        return null;
    }

    return Math.max(0, Number(((endMs - startMs) / 1000).toFixed(3)));
}

function summarizeStructuredNote(data = {}) {
    const labelMap = {
        emergingLeaders: 'Emerging leaders',
        decisionStyle: 'Decision style',
        frictionLevel: 'Friction level',
        frictionSources: 'Friction sources',
        consensusLevel: 'Consensus level',
        dynamicsSummary: 'Dynamics summary',
        allianceNotes: 'Alliance notes',
        externalPressures: 'External pressures'
    };

    return Object.entries(safeObject(data))
        .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
        .map(([key, value]) => `${labelMap[key] || key}: ${String(value).trim()}`)
        .join('\n');
}

function encodeText(content = '') {
    return new TextEncoder().encode(String(content));
}

async function sha256Hex(content = '') {
    const subtleCrypto = globalThis.crypto?.subtle;
    if (!subtleCrypto) {
        throw new Error('Web Crypto is required to generate the research export checksums.');
    }

    const digest = await subtleCrypto.digest('SHA-256', encodeText(content));
    return [...new Uint8Array(digest)]
        .map((value) => value.toString(16).padStart(2, '0'))
        .join('');
}

async function enrichEventLogWithHashes(events = []) {
    const enrichedEvents = [];
    let previousHash = '';

    for (let index = 0; index < events.length; index += 1) {
        const currentEvent = {
            ...events[index],
            event_id: index + 1,
            prev_event_hash: previousHash || null
        };
        const hashPayload = HASHED_EVENT_FIELDS.map((field) => {
            const value = currentEvent[field];
            return `${field}:${value === undefined ? '' : JSON.stringify(value)}`;
        }).join('|');
        const eventHash = await sha256Hex(hashPayload);

        currentEvent.event_hash = eventHash;
        enrichedEvents.push(currentEvent);
        previousHash = eventHash;
    }

    return enrichedEvents;
}

function nextSyntheticId(prefix, counterRef) {
    counterRef.count += 1;
    return `${prefix}-${String(counterRef.count).padStart(4, '0')}`;
}

function buildSeatIndexes(participants = []) {
    const counters = new Map();

    return participants.map((participant) => {
        const role = String(participant?.role || '').trim().toLowerCase();
        const roleKey = role || `unknown:${participant?.id || participant?.client_id || counters.size}`;
        const nextSeatIndex = (counters.get(roleKey) || 0) + 1;
        counters.set(roleKey, nextSeatIndex);

        return {
            participant,
            seatIndex: participant?.seat_index ?? nextSeatIndex
        };
    });
}

function buildParticipantRegistry(bundle = {}) {
    const researchParticipants = safeArray(bundle.researchParticipants);
    if (researchParticipants.length) {
        const rows = researchParticipants.map((participant) => ({
            ...participant,
            session_id: participant.session_id || bundle.session?.id || null,
            first_seen_utc: asUtcIso(participant.first_seen_utc),
            last_seen_utc: asUtcIso(participant.last_seen_utc)
        }));
        const registry = new Map();

        rows.forEach((participant) => {
            const key = `${participant.role || ''}:${participant.seat_index ?? ''}`;
            registry.set(key, participant.participant_pseudonym);
        });

        return {
            rows,
            registry,
            clientIdToPseudonym: new Map(),
            participantIdToPseudonym: new Map(),
            participantKeyToPseudonym: new Map()
        };
    }

    const seatIndexes = buildSeatIndexes(safeArray(bundle.participants));
    const rows = seatIndexes.map(({ participant, seatIndex }, index) => {
        const role = participant?.role || null;
        const team = inferTeamFromRole(role, participant?.team);
        const joinedAt = asUtcIso(participant?.joined_at || participant?.created_at || bundle.session?.created_at);
        const lastSeenAt = asUtcIso(
            participant?.heartbeat_at
            || participant?.last_seen
            || participant?.disconnected_at
            || participant?.updated_at
            || joinedAt
        );

        return {
            participant_pseudonym: `participant-${String(index + 1).padStart(3, '0')}`,
            session_id: bundle.session?.id || null,
            auth_uid_hash: participant?.client_id ? `client:${participant.client_id}` : `seat:${participant?.id || index + 1}`,
            team,
            role,
            seat_index: seatIndex,
            first_seen_utc: joinedAt,
            last_seen_utc: lastSeenAt,
            active_duration_s: secondsBetween(joinedAt, participant?.disconnected_at || lastSeenAt),
            rejoin_count: 0
        };
    });

    const registry = new Map();
    const clientIdToPseudonym = new Map();
    const participantIdToPseudonym = new Map();
    const participantKeyToPseudonym = new Map();

    seatIndexes.forEach(({ participant, seatIndex }, index) => {
        const pseudonym = rows[index].participant_pseudonym;
        const role = participant?.role || null;
        registry.set(`${role || ''}:${seatIndex ?? ''}`, pseudonym);
        if (participant?.client_id) {
            clientIdToPseudonym.set(participant.client_id, pseudonym);
        }
        if (participant?.id) {
            participantIdToPseudonym.set(participant.id, pseudonym);
            participantKeyToPseudonym.set(participant.id, pseudonym);
        }
        if (participant?.participantSessionId) {
            participantKeyToPseudonym.set(participant.participantSessionId, pseudonym);
        }
    });

    return {
        rows,
        registry,
        clientIdToPseudonym,
        participantIdToPseudonym,
        participantKeyToPseudonym
    };
}

function resolvePseudonym(participantRegistry, {
    clientId = null,
    participantId = null,
    participantKey = null,
    role = null,
    seatIndex = null
} = {}) {
    if (clientId && participantRegistry.clientIdToPseudonym.has(clientId)) {
        return participantRegistry.clientIdToPseudonym.get(clientId);
    }
    if (participantId && participantRegistry.participantIdToPseudonym.has(participantId)) {
        return participantRegistry.participantIdToPseudonym.get(participantId);
    }
    if (participantKey && participantRegistry.participantKeyToPseudonym.has(participantKey)) {
        return participantRegistry.participantKeyToPseudonym.get(participantKey);
    }
    if ((role || seatIndex !== null) && participantRegistry.registry.has(`${role || ''}:${seatIndex ?? ''}`)) {
        return participantRegistry.registry.get(`${role || ''}:${seatIndex ?? ''}`);
    }
    return null;
}

function buildSyntheticEventLog(bundle = {}, participantRegistry) {
    const events = [];
    const counterRef = { count: 0 };
    const sessionId = bundle.session?.id || null;

    safeArray(bundle.participants).forEach((participant) => {
        const actorRole = participant?.role || null;
        const actorTeam = inferTeamFromRole(actorRole, participant?.team);
        const seatIndex = participant?.seat_index ?? null;
        const actorPseudonym = resolvePseudonym(participantRegistry, {
            clientId: participant?.client_id,
            participantId: participant?.id,
            role: actorRole,
            seatIndex
        });

        if (participant?.joined_at) {
            events.push({
                event_uuid: nextSyntheticId('event', counterRef),
                session_id: sessionId,
                event_ts_utc: asUtcIso(participant.joined_at),
                server_received_utc: asUtcIso(participant.joined_at),
                client_ts_utc: asUtcIso(participant.joined_at),
                actor_pseudonym: actorPseudonym,
                actor_role: actorRole,
                actor_team: actorTeam,
                actor_seat_index: seatIndex,
                event_type: 'SEAT_CLAIMED',
                entity_type: 'seat',
                entity_id: participant?.id || null,
                move_number: null,
                action_sequence: null,
                correlation_id: null,
                causal_event_id: null,
                before_state: null,
                after_state: {
                    is_active: true
                },
                payload: {
                    display_name: participant?.display_name || null
                },
                phase: null,
                elapsed_session_s: null,
                elapsed_actor_prev_s: null
            });
        }

        if (participant?.disconnected_at) {
            events.push({
                event_uuid: nextSyntheticId('event', counterRef),
                session_id: sessionId,
                event_ts_utc: asUtcIso(participant.disconnected_at),
                server_received_utc: asUtcIso(participant.disconnected_at),
                client_ts_utc: asUtcIso(participant.disconnected_at),
                actor_pseudonym: actorPseudonym,
                actor_role: actorRole,
                actor_team: actorTeam,
                actor_seat_index: seatIndex,
                event_type: 'PARTICIPANT_DISCONNECTED',
                entity_type: 'seat',
                entity_id: participant?.id || null,
                move_number: null,
                action_sequence: null,
                correlation_id: null,
                causal_event_id: null,
                before_state: {
                    is_active: true
                },
                after_state: {
                    is_active: false
                },
                payload: {},
                phase: null,
                elapsed_session_s: null,
                elapsed_actor_prev_s: null
            });
        }
    });

    safeArray(bundle.actions).forEach((action) => {
        const isProposal = isProposalAction(action);
        const isMoveResponse = isMoveResponseAction(action);
        const actionSequence = !isProposal && !isMoveResponse
            ? getActionSequenceNumber(bundle.actions, action)
            : null;
        const actorPseudonym = resolvePseudonym(participantRegistry, {
            clientId: action?.client_id,
            role: action?.team ? `${action.team}_facilitator` : null
        });
        const actorRole = action?.team ? `${action.team}_facilitator` : null;
        const actorTeam = inferTeamFromRole(actorRole, action?.team);
        const createdTimestamp = asUtcIso(action?.created_at);
        const submittedTimestamp = asUtcIso(action?.submitted_at || action?.created_at);

        if (isProposal) {
            events.push({
                event_uuid: nextSyntheticId('event', counterRef),
                session_id: sessionId,
                event_ts_utc: createdTimestamp,
                server_received_utc: createdTimestamp,
                client_ts_utc: createdTimestamp,
                actor_pseudonym: actorPseudonym,
                actor_role: actorRole,
                actor_team: actorTeam,
                actor_seat_index: null,
                event_type: 'PROPOSAL_CREATED',
                entity_type: 'proposal',
                entity_id: action?.id || null,
                move_number: action?.move ?? null,
                action_sequence: null,
                correlation_id: action?.id || null,
                causal_event_id: null,
                before_state: null,
                after_state: {
                    status: action?.status || 'draft'
                },
                payload: {
                    title: action?.goal || null
                },
                phase: action?.phase ?? null,
                elapsed_session_s: null,
                elapsed_actor_prev_s: null
            });
        } else if (isMoveResponse) {
            events.push({
                event_uuid: nextSyntheticId('event', counterRef),
                session_id: sessionId,
                event_ts_utc: submittedTimestamp,
                server_received_utc: submittedTimestamp,
                client_ts_utc: submittedTimestamp,
                actor_pseudonym: actorPseudonym,
                actor_role: actorRole,
                actor_team: actorTeam,
                actor_seat_index: null,
                event_type: 'MOVE_RESPONSE_SUBMITTED',
                entity_type: 'move_response',
                entity_id: action?.id || null,
                move_number: action?.move ?? null,
                action_sequence: null,
                correlation_id: action?.id || null,
                causal_event_id: null,
                before_state: {
                    status: 'draft'
                },
                after_state: {
                    status: action?.status || 'submitted'
                },
                payload: {
                    title: action?.goal || null
                },
                phase: action?.phase ?? null,
                elapsed_session_s: null,
                elapsed_actor_prev_s: null
            });
        } else if (action?.status === 'draft') {
            events.push({
                event_uuid: nextSyntheticId('event', counterRef),
                session_id: sessionId,
                event_ts_utc: createdTimestamp,
                server_received_utc: createdTimestamp,
                client_ts_utc: createdTimestamp,
                actor_pseudonym: actorPseudonym,
                actor_role: actorRole,
                actor_team: actorTeam,
                actor_seat_index: null,
                event_type: 'ACTION_DRAFT_SAVED',
                entity_type: 'action',
                entity_id: action?.id || null,
                move_number: action?.move ?? null,
                action_sequence: actionSequence,
                correlation_id: action?.id || null,
                causal_event_id: null,
                before_state: null,
                after_state: {
                    status: 'draft'
                },
                payload: {
                    title: action?.goal || null
                },
                phase: action?.phase ?? null,
                elapsed_session_s: null,
                elapsed_actor_prev_s: null
            });
        }

        if (action?.submitted_at) {
            events.push({
                event_uuid: nextSyntheticId('event', counterRef),
                session_id: sessionId,
                event_ts_utc: submittedTimestamp,
                server_received_utc: submittedTimestamp,
                client_ts_utc: submittedTimestamp,
                actor_pseudonym: actorPseudonym,
                actor_role: actorRole,
                actor_team: actorTeam,
                actor_seat_index: null,
                event_type: isProposal ? 'PROPOSAL_SUBMITTED' : 'ACTION_SUBMITTED',
                entity_type: isProposal ? 'proposal' : 'action',
                entity_id: action?.id || null,
                move_number: action?.move ?? null,
                action_sequence: actionSequence,
                correlation_id: action?.id || null,
                causal_event_id: null,
                before_state: {
                    status: 'draft'
                },
                after_state: {
                    status: action?.status || 'submitted'
                },
                payload: {
                    title: action?.goal || null
                },
                phase: action?.phase ?? null,
                elapsed_session_s: null,
                elapsed_actor_prev_s: null
            });
        }

        if (action?.adjudicated_at) {
            events.push({
                event_uuid: nextSyntheticId('event', counterRef),
                session_id: sessionId,
                event_ts_utc: asUtcIso(action.adjudicated_at),
                server_received_utc: asUtcIso(action.adjudicated_at),
                client_ts_utc: asUtcIso(action.adjudicated_at),
                actor_pseudonym: 'whitecell-operator',
                actor_role: 'whitecell_lead',
                actor_team: 'whitecell',
                actor_seat_index: 1,
                event_type: isProposal
                    ? (
                        action?.outcome === 'forwarded'
                            ? 'PROPOSAL_FORWARDED'
                            : action?.outcome === 'changes_requested'
                                ? 'PROPOSAL_CHANGES_REQUESTED'
                                : 'PROPOSAL_REJECTED'
                    )
                    : 'ACTION_ADJUDICATED',
                entity_type: isProposal ? 'proposal' : 'action',
                entity_id: action?.id || null,
                move_number: action?.move ?? null,
                action_sequence: actionSequence,
                correlation_id: action?.id || null,
                causal_event_id: null,
                before_state: {
                    status: 'submitted'
                },
                after_state: {
                    status: action?.status || 'adjudicated',
                    outcome: action?.outcome || null
                },
                payload: {
                    outcome: action?.outcome || null,
                    adjudication_notes: action?.adjudication_notes || null
                },
                phase: action?.phase ?? null,
                elapsed_session_s: null,
                elapsed_actor_prev_s: null
            });
        }
    });

    safeArray(bundle.requests).forEach((request) => {
        const actorRole = request?.team ? `${request.team}_facilitator` : null;
        const actorTeam = inferTeamFromRole(actorRole, request?.team);
        const actorPseudonym = resolvePseudonym(participantRegistry, {
            clientId: request?.client_id,
            role: actorRole
        });
        const raisedTimestamp = asUtcIso(request?.created_at);

        events.push({
            event_uuid: nextSyntheticId('event', counterRef),
            session_id: sessionId,
            event_ts_utc: raisedTimestamp,
            server_received_utc: raisedTimestamp,
            client_ts_utc: raisedTimestamp,
            actor_pseudonym: actorPseudonym,
            actor_role: actorRole,
            actor_team: actorTeam,
            actor_seat_index: null,
            event_type: 'RFI_RAISED',
            entity_type: 'rfi',
            entity_id: request?.id || null,
            move_number: request?.move ?? null,
            action_sequence: null,
            correlation_id: request?.id || null,
            causal_event_id: null,
            before_state: null,
            after_state: {
                status: request?.status || 'pending'
            },
            payload: {
                question_text: request?.query || null
            },
            phase: request?.phase ?? null,
            elapsed_session_s: null,
            elapsed_actor_prev_s: null
        });

        if (request?.responded_at || request?.answered_at) {
            const answeredTimestamp = asUtcIso(request.responded_at || request.answered_at);
            events.push({
                event_uuid: nextSyntheticId('event', counterRef),
                session_id: sessionId,
                event_ts_utc: answeredTimestamp,
                server_received_utc: answeredTimestamp,
                client_ts_utc: answeredTimestamp,
                actor_pseudonym: 'whitecell-operator',
                actor_role: 'whitecell_lead',
                actor_team: 'whitecell',
                actor_seat_index: 1,
                event_type: 'RFI_ANSWERED',
                entity_type: 'rfi',
                entity_id: request?.id || null,
                move_number: request?.move ?? null,
                action_sequence: null,
                correlation_id: request?.id || null,
                causal_event_id: null,
                before_state: {
                    status: 'pending'
                },
                after_state: {
                    status: 'answered'
                },
                payload: {
                    answer_text: request?.response || null
                },
                phase: request?.phase ?? null,
                elapsed_session_s: null,
                elapsed_actor_prev_s: null
            });
        }
    });

    safeArray(bundle.communications).forEach((communication) => {
        const metadata = safeObject(communication?.metadata);
        const eventType = communication?.type === 'PROPOSAL_FORWARDED'
            ? 'PROPOSAL_FORWARDED'
            : communication?.type === 'PROPOSAL_RESPONSE'
                ? 'PROPOSAL_RESPONDED'
                : 'COMMUNICATION_SENT';

        events.push({
            event_uuid: nextSyntheticId('event', counterRef),
            session_id: sessionId,
            event_ts_utc: asUtcIso(communication?.created_at),
            server_received_utc: asUtcIso(communication?.created_at),
            client_ts_utc: asUtcIso(communication?.created_at),
            actor_pseudonym: communication?.from_role === 'white_cell'
                ? 'whitecell-operator'
                : null,
            actor_role: communication?.from_role || null,
            actor_team: inferTeamFromRole(communication?.from_role),
            actor_seat_index: null,
            event_type: eventType,
            entity_type: 'communication',
            entity_id: communication?.id || null,
            move_number: communication?.move ?? null,
            action_sequence: null,
            correlation_id: metadata.source_proposal_id || communication?.id || null,
            causal_event_id: null,
            before_state: null,
            after_state: {
                type: communication?.type || null
            },
            payload: {
                to_role: communication?.to_role || null,
                content: communication?.content || null,
                metadata
            },
            phase: communication?.phase ?? null,
            elapsed_session_s: null,
            elapsed_actor_prev_s: null
        });
    });

    safeArray(bundle.notetakerData).forEach((record) => {
        safeArray(record?.observation_timeline).forEach((entry) => {
            events.push({
                event_uuid: nextSyntheticId('event', counterRef),
                session_id: sessionId,
                event_ts_utc: asUtcIso(entry?.timestamp),
                server_received_utc: asUtcIso(entry?.timestamp),
                client_ts_utc: asUtcIso(entry?.timestamp),
                actor_pseudonym: resolvePseudonym(participantRegistry, {
                    participantKey: entry?.participant_key,
                    participantId: entry?.participant_id,
                    clientId: entry?.client_id
                }),
                actor_role: entry?.team ? `${entry.team}_notetaker` : null,
                actor_team: entry?.team || null,
                actor_seat_index: null,
                event_type: 'NOTE_CREATED',
                entity_type: 'note',
                entity_id: entry?.id || null,
                move_number: record?.move ?? null,
                action_sequence: null,
                correlation_id: record?.id || null,
                causal_event_id: null,
                before_state: null,
                after_state: {
                    type: entry?.type || null
                },
                payload: {
                    content: entry?.content || null
                },
                phase: entry?.phase ?? record?.phase ?? null,
                elapsed_session_s: null,
                elapsed_actor_prev_s: null
            });
        });
    });

    return events
        .filter((event) => event.event_ts_utc)
        .sort((left, right) => {
            const leftTime = new Date(left.event_ts_utc).getTime();
            const rightTime = new Date(right.event_ts_utc).getTime();
            if (leftTime !== rightTime) {
                return leftTime - rightTime;
            }
            return String(left.event_uuid || '').localeCompare(String(right.event_uuid || ''));
        });
}

function isProposalAction(action = {}) {
    return action?.mechanism === PROPOSAL_ACTION_MECHANISM || Boolean(parseProposalDetails(action?.ally_contingencies));
}

function isMoveResponseAction(action = {}) {
    return action?.mechanism === MOVE_RESPONSE_ACTION_MECHANISM || Boolean(parseMoveResponseDetails(action?.ally_contingencies));
}

function findForwardedProposalCommunication(communications = [], proposalId) {
    return safeArray(communications)
        .filter((communication) => communication?.type === 'PROPOSAL_FORWARDED')
        .find((communication) => safeObject(communication?.metadata).source_proposal_id === proposalId) || null;
}

function findProposalResponseCommunication(communications = [], proposalId) {
    return safeArray(communications)
        .filter((communication) => communication?.type === 'PROPOSAL_RESPONSE')
        .find((communication) => safeObject(communication?.metadata).source_proposal_id === proposalId) || null;
}

function buildNotesTables(bundle = {}, participantRegistry) {
    const explicitNotes = safeArray(bundle.researchNotes);
    const explicitNoteRevisions = safeArray(bundle.researchNoteRevisions);
    if (explicitNotes.length || explicitNoteRevisions.length) {
        return {
            notes: explicitNotes,
            noteRevisions: explicitNoteRevisions
        };
    }

    const notes = [];
    const noteRevisions = [];
    const counterRef = { count: 0 };

    safeArray(bundle.notetakerData).forEach((record) => {
        const team = record?.team || null;
        const sections = [
            {
                name: 'dynamics_analysis',
                scope: 'seat_scoped',
                visibility: 'team',
                content: safeObject(record?.dynamics_analysis)?.team_entries || {}
            },
            {
                name: 'external_factors',
                scope: 'seat_scoped',
                visibility: 'team',
                content: safeObject(record?.external_factors)?.team_entries || {}
            }
        ];

        sections.forEach((section) => {
            Object.entries(section.content).forEach(([sectionTeamId, teamEntry]) => {
                const participantEntries = safeObject(teamEntry)?.participant_entries || {};
                Object.entries(participantEntries).forEach(([participantKey, participantEntry]) => {
                    const contentText = summarizeStructuredNote(participantEntry?.data);
                    if (!contentText) {
                        return;
                    }

                    const noteId = nextSyntheticId(`note-${section.name}`, counterRef);
                    const role = sectionTeamId ? `${sectionTeamId}_notetaker` : (team ? `${team}_notetaker` : null);
                    const authorPseudonym = resolvePseudonym(participantRegistry, {
                        participantKey,
                        participantId: participantEntry?.participant_id,
                        clientId: participantEntry?.client_id,
                        role
                    });
                    const noteRow = {
                        note_id: noteId,
                        session_id: bundle.session?.id || null,
                        author_pseudonym: authorPseudonym || 'notetaker',
                        author_role: role,
                        author_team: sectionTeamId || team || null,
                        author_seat_index: null,
                        scope: section.scope,
                        visibility: section.visibility,
                        move_number: record?.move ?? null,
                        linked_entity_type: null,
                        linked_entity_id: null,
                        content_text: contentText,
                        content_length_chars: contentText.length,
                        created_utc: asUtcIso(participantEntry?.updated_at || record?.created_at || record?.updated_at),
                        last_edited_utc: asUtcIso(participantEntry?.updated_at || record?.updated_at),
                        edit_count: 0,
                        current_version: 1
                    };

                    notes.push(noteRow);
                    noteRevisions.push({
                        note_id: noteId,
                        version: 1,
                        author_pseudonym: noteRow.author_pseudonym,
                        content_text: contentText,
                        content_length_chars: contentText.length,
                        edited_utc: noteRow.last_edited_utc,
                        supersedes_version: null
                    });
                });
            });
        });

        safeArray(record?.observation_timeline).forEach((entry) => {
            const contentText = String(entry?.content || '').trim();
            if (!contentText) {
                return;
            }

            const noteId = entry?.id || nextSyntheticId('note-observation', counterRef);
            const role = entry?.team ? `${entry.team}_notetaker` : (team ? `${team}_notetaker` : null);
            const authorPseudonym = resolvePseudonym(participantRegistry, {
                participantKey: entry?.participant_key,
                participantId: entry?.participant_id,
                clientId: entry?.client_id,
                role
            });
            const noteRow = {
                note_id: noteId,
                session_id: bundle.session?.id || null,
                author_pseudonym: authorPseudonym || 'notetaker',
                author_role: role,
                author_team: entry?.team || team || null,
                author_seat_index: null,
                scope: 'shared_capture',
                visibility: 'team',
                move_number: record?.move ?? null,
                linked_entity_type: null,
                linked_entity_id: null,
                content_text: contentText,
                content_length_chars: contentText.length,
                created_utc: asUtcIso(entry?.timestamp),
                last_edited_utc: asUtcIso(entry?.timestamp),
                edit_count: 0,
                current_version: 1
            };

            notes.push(noteRow);
            noteRevisions.push({
                note_id: noteId,
                version: 1,
                author_pseudonym: noteRow.author_pseudonym,
                content_text: contentText,
                content_length_chars: contentText.length,
                edited_utc: noteRow.last_edited_utc,
                supersedes_version: null
            });
        });
    });

    return { notes, noteRevisions };
}

function buildDraftRevisions(bundle = {}, participantRegistry) {
    const explicitDrafts = safeArray(bundle.researchDraftRevisions);
    if (explicitDrafts.length) {
        return explicitDrafts;
    }

    return safeArray(bundle.actions)
        .filter((action) => !isMoveResponseAction(action))
        .map((action) => {
            const isProposal = isProposalAction(action);
            const authorRole = action?.team ? `${action.team}_facilitator` : null;
            const authorTeam = inferTeamFromRole(authorRole, action?.team);
            const authorPseudonym = resolvePseudonym(participantRegistry, {
                clientId: action?.client_id,
                role: authorRole
            }) || `${authorTeam || 'team'}-lead`;
            const blueView = parseBlueActionDetails(action?.ally_contingencies)
                ? getBlueActionViewModel(action)
                : null;

            return {
                draft_id: `${action.id}-revision-1`,
                session_id: bundle.session?.id || null,
                author_pseudonym: authorPseudonym,
                author_role: authorRole,
                author_team: authorTeam,
                author_seat_index: null,
                artifact_type: isProposal ? 'proposal' : 'action',
                artifact_id: action?.id || null,
                revision_number: 1,
                revision_cycle_id: action?.id || null,
                status: action?.status === 'draft' ? 'draft_saved' : 'submitted',
                move_number: action?.move ?? null,
                action_sequence: isProposal ? null : getActionSequenceNumber(bundle.actions, action),
                wizard_page_reached: blueView ? 3 : null,
                content_snapshot: {
                    mechanism: action?.mechanism || null,
                    sector: action?.sector || null,
                    exposure_type: action?.exposure_type || null,
                    targets: safeArray(action?.targets),
                    goal: action?.goal || null,
                    expected_outcomes: action?.expected_outcomes || null,
                    ally_contingencies: action?.ally_contingencies || null
                },
                content_diff_from_prev: null,
                created_utc: asUtcIso(action?.created_at),
                submitted_utc: asUtcIso(action?.submitted_at),
                time_to_submit_s: secondsBetween(action?.created_at, action?.submitted_at)
            };
        });
}

function buildActionContent(bundle = {}, participantRegistry) {
    const explicitRows = safeArray(bundle.researchActionContent);
    if (explicitRows.length) {
        return explicitRows;
    }

    return safeArray(bundle.actions)
        .filter((action) => !isProposalAction(action) && !isMoveResponseAction(action))
        .map((action) => {
            const viewModel = getBlueActionViewModel(action);
            const authorRole = action?.team ? `${action.team}_facilitator` : null;
            const authorTeam = inferTeamFromRole(authorRole, action?.team);

            return {
                action_id: action?.id || null,
                session_id: bundle.session?.id || null,
                author_pseudonym: resolvePseudonym(participantRegistry, {
                    clientId: action?.client_id,
                    role: authorRole
                }) || `${authorTeam || 'blue'}-lead`,
                author_role: authorRole,
                author_team: authorTeam,
                move_number: action?.move ?? null,
                action_sequence: getActionSequenceNumber(bundle.actions, action),
                title: viewModel.title,
                action_type: formatBlueActionSelection(viewModel.levers, viewModel.lever || action?.mechanism || null),
                intent_text: viewModel.objective || action?.goal || null,
                targets: safeArray(action?.targets),
                instruments: viewModel.instrumentOfPower ? [viewModel.instrumentOfPower] : [],
                resources_committed: viewModel.coordinated || [],
                full_content: {
                    goal: action?.goal || null,
                    sector: action?.sector || null,
                    exposure_type: action?.exposure_type || null,
                    expected_outcomes: action?.expected_outcomes || null,
                    targets: safeArray(action?.targets),
                    details: viewModel
                },
                submitted_utc: asUtcIso(action?.submitted_at),
                final_status: action?.status || null
            };
        });
}

function buildProposalContent(bundle = {}, participantRegistry) {
    const explicitRows = safeArray(bundle.researchProposalContent);
    if (explicitRows.length) {
        return explicitRows;
    }

    return safeArray(bundle.actions)
        .filter((action) => isProposalAction(action))
        .map((action) => {
            const viewModel = getProposalViewModel(action);
            const forwardedCommunication = findForwardedProposalCommunication(bundle.communications, action?.id);
            const responseCommunication = findProposalResponseCommunication(bundle.communications, action?.id);
            const forwardedMetadata = safeObject(forwardedCommunication?.metadata);
            const finalRecipientState = safeObject(forwardedMetadata?.proposal_recipient_state).status
                || safeObject(responseCommunication?.metadata).proposal_recipient_state?.status
                || null;
            const authorRole = action?.team ? `${action.team}_facilitator` : null;
            const authorTeam = inferTeamFromRole(authorRole, action?.team);

            return {
                proposal_id: action?.id || null,
                session_id: bundle.session?.id || null,
                author_pseudonym: resolvePseudonym(participantRegistry, {
                    clientId: action?.client_id,
                    role: authorRole
                }) || `${authorTeam || 'green'}-lead`,
                author_role: authorRole,
                author_team: authorTeam,
                move_number: action?.move ?? null,
                title: viewModel.title,
                intended_recipient_team: viewModel.recipientTeam || null,
                proposal_text: viewModel.objective || null,
                requested_action: viewModel.expectedOutcomes || null,
                rationale: viewModel.timingAndConditions || null,
                full_content: {
                    goal: action?.goal || null,
                    expected_outcomes: action?.expected_outcomes || null,
                    proposal_details: viewModel
                },
                submitted_utc: asUtcIso(action?.submitted_at),
                review_decision: action?.outcome || null,
                review_reason: action?.adjudication_notes || null,
                reviewer_pseudonym: action?.adjudicated_at ? 'whitecell-operator' : null,
                reviewed_utc: asUtcIso(action?.adjudicated_at),
                forwarded_to_team: forwardedMetadata.recipient_team || viewModel.recipientTeam || null,
                final_recipient_state: finalRecipientState || null
            };
        });
}

function buildAdjudicationContent(bundle = {}) {
    const explicitRows = safeArray(bundle.researchAdjudicationContent);
    if (explicitRows.length) {
        return explicitRows;
    }

    return safeArray(bundle.actions)
        .filter((action) => action?.adjudicated_at)
        .map((action) => ({
            adjudication_id: `${action.id}-adjudication`,
            session_id: bundle.session?.id || null,
            target_entity_type: isMoveResponseAction(action) ? 'move_response' : 'action',
            target_entity_id: action?.id || null,
            adjudicator_pseudonym: 'whitecell-operator',
            adjudicator_role: 'whitecell_lead',
            move_number: action?.move ?? null,
            ruling: action?.outcome || null,
            reasoning: action?.adjudication_notes || null,
            effects: safeObject(action?.adjudication),
            adjudicated_utc: asUtcIso(action?.adjudicated_at)
        }));
}

function buildMoveResponseContent(bundle = {}, participantRegistry) {
    const explicitRows = safeArray(bundle.researchMoveResponseContent);
    if (explicitRows.length) {
        return explicitRows;
    }

    return safeArray(bundle.actions)
        .filter((action) => isMoveResponseAction(action))
        .map((action) => {
            const viewModel = getMoveResponseViewModel(action);
            const authorRole = action?.team ? `${action.team}_facilitator` : null;
            const authorTeam = inferTeamFromRole(authorRole, action?.team);

            return {
                move_response_id: action?.id || null,
                session_id: bundle.session?.id || null,
                author_pseudonym: resolvePseudonym(participantRegistry, {
                    clientId: action?.client_id,
                    role: authorRole
                }) || `${authorTeam || 'red'}-lead`,
                author_role: authorRole,
                author_team: authorTeam,
                move_number: action?.move ?? null,
                responding_to_entity_type: 'move',
                responding_to_entity_id: null,
                posture: viewModel.responseStrategy || null,
                response_text: viewModel.keyActions || viewModel.expectedEffect || null,
                rationale: viewModel.strategicAssessment || null,
                full_content: {
                    goal: action?.goal || null,
                    expected_outcomes: action?.expected_outcomes || null,
                    details: viewModel
                },
                submitted_utc: asUtcIso(action?.submitted_at),
                review_state: action?.status || null
            };
        });
}

function buildRfiContent(bundle = {}, participantRegistry) {
    const explicitRows = safeArray(bundle.researchRfiContent);
    if (explicitRows.length) {
        return explicitRows;
    }

    return safeArray(bundle.requests).map((request) => {
        const requesterRole = request?.team ? `${request.team}_facilitator` : null;
        const requesterTeam = inferTeamFromRole(requesterRole, request?.team);

        return {
            rfi_id: request?.id || null,
            session_id: bundle.session?.id || null,
            requester_pseudonym: resolvePseudonym(participantRegistry, {
                clientId: request?.client_id,
                role: requesterRole
            }) || `${requesterTeam || 'team'}-lead`,
            requester_role: requesterRole,
            requester_team: requesterTeam,
            move_number: request?.move ?? null,
            question_text: request?.query || null,
            raised_utc: asUtcIso(request?.created_at),
            answer_text: request?.response || null,
            answered_by_pseudonym: request?.response ? 'whitecell-operator' : null,
            answered_utc: asUtcIso(request?.responded_at || request?.answered_at),
            status: request?.status || 'pending'
        };
    });
}

function buildStateTransitions(bundle = {}, actionContent, proposalContent, moveResponseContent, rfiContent) {
    const explicitRows = safeArray(bundle.researchStateTransitions);
    if (explicitRows.length) {
        return explicitRows;
    }

    const transitions = [];

    actionContent.forEach((action) => {
        const createdAt = safeArray(bundle.actions).find((candidate) => candidate?.id === action.action_id)?.created_at;
        transitions.push({
            transition_id: `${action.action_id}-draft`,
            session_id: action.session_id,
            entity_type: 'action',
            entity_id: action.action_id,
            from_state: null,
            to_state: 'draft',
            transition_utc: asUtcIso(createdAt),
            actor_pseudonym: action.author_pseudonym,
            actor_role: action.author_role,
            actor_team: action.author_team,
            recipient_team: null,
            move_number: action.move_number,
            dwell_in_from_s: null,
            triggering_event_id: null
        });
        if (action.submitted_utc) {
            transitions.push({
                transition_id: `${action.action_id}-submitted`,
                session_id: action.session_id,
                entity_type: 'action',
                entity_id: action.action_id,
                from_state: 'draft',
                to_state: 'submitted',
                transition_utc: action.submitted_utc,
                actor_pseudonym: action.author_pseudonym,
                actor_role: action.author_role,
                actor_team: action.author_team,
                recipient_team: null,
                move_number: action.move_number,
                dwell_in_from_s: secondsBetween(createdAt, action.submitted_utc),
                triggering_event_id: null
            });
        }
        if (action.final_status === 'adjudicated') {
            const sourceAction = safeArray(bundle.actions).find((candidate) => candidate?.id === action.action_id);
            transitions.push({
                transition_id: `${action.action_id}-adjudicated`,
                session_id: action.session_id,
                entity_type: 'action',
                entity_id: action.action_id,
                from_state: 'submitted',
                to_state: 'adjudicated',
                transition_utc: asUtcIso(sourceAction?.adjudicated_at),
                actor_pseudonym: 'whitecell-operator',
                actor_role: 'whitecell_lead',
                actor_team: 'whitecell',
                recipient_team: null,
                move_number: action.move_number,
                dwell_in_from_s: secondsBetween(action.submitted_utc, sourceAction?.adjudicated_at),
                triggering_event_id: null
            });
        }
    });

    proposalContent.forEach((proposal) => {
        const sourceProposal = safeArray(bundle.actions).find((candidate) => candidate?.id === proposal.proposal_id);
        transitions.push({
            transition_id: `${proposal.proposal_id}-created`,
            session_id: proposal.session_id,
            entity_type: 'proposal',
            entity_id: proposal.proposal_id,
            from_state: null,
            to_state: 'created',
            transition_utc: asUtcIso(sourceProposal?.created_at),
            actor_pseudonym: proposal.author_pseudonym,
            actor_role: proposal.author_role,
            actor_team: proposal.author_team,
            recipient_team: null,
            move_number: proposal.move_number,
            dwell_in_from_s: null,
            triggering_event_id: null
        });
        if (proposal.submitted_utc) {
            transitions.push({
                transition_id: `${proposal.proposal_id}-submitted`,
                session_id: proposal.session_id,
                entity_type: 'proposal',
                entity_id: proposal.proposal_id,
                from_state: 'created',
                to_state: 'submitted',
                transition_utc: proposal.submitted_utc,
                actor_pseudonym: proposal.author_pseudonym,
                actor_role: proposal.author_role,
                actor_team: proposal.author_team,
                recipient_team: proposal.intended_recipient_team,
                move_number: proposal.move_number,
                dwell_in_from_s: secondsBetween(sourceProposal?.created_at, proposal.submitted_utc),
                triggering_event_id: null
            });
        }

        const reviewState = proposal.review_decision === 'forwarded'
            ? 'forwarded'
            : proposal.review_decision === 'changes_requested'
                ? 'changes_requested'
                : proposal.review_decision === 'rejected'
                    ? 'rejected'
                    : null;
        if (reviewState && proposal.reviewed_utc) {
            transitions.push({
                transition_id: `${proposal.proposal_id}-${reviewState}`,
                session_id: proposal.session_id,
                entity_type: 'proposal',
                entity_id: proposal.proposal_id,
                from_state: 'submitted',
                to_state: reviewState,
                transition_utc: proposal.reviewed_utc,
                actor_pseudonym: proposal.reviewer_pseudonym,
                actor_role: 'whitecell_lead',
                actor_team: 'whitecell',
                recipient_team: proposal.forwarded_to_team,
                move_number: proposal.move_number,
                dwell_in_from_s: secondsBetween(proposal.submitted_utc, proposal.reviewed_utc),
                triggering_event_id: null
            });
        }

        if (proposal.final_recipient_state) {
            const forwardedCommunication = findForwardedProposalCommunication(bundle.communications, proposal.proposal_id);
            const recipientTimestamp = safeObject(forwardedCommunication?.metadata).proposal_recipient_state?.actioned_at
                || findProposalResponseCommunication(bundle.communications, proposal.proposal_id)?.created_at
                || null;
            transitions.push({
                transition_id: `${proposal.proposal_id}-${proposal.final_recipient_state}`,
                session_id: proposal.session_id,
                entity_type: 'proposal',
                entity_id: proposal.proposal_id,
                from_state: 'forwarded',
                to_state: proposal.final_recipient_state,
                transition_utc: asUtcIso(recipientTimestamp),
                actor_pseudonym: null,
                actor_role: null,
                actor_team: proposal.forwarded_to_team,
                recipient_team: proposal.forwarded_to_team,
                move_number: proposal.move_number,
                dwell_in_from_s: secondsBetween(proposal.reviewed_utc, recipientTimestamp),
                triggering_event_id: null
            });
        }
    });

    moveResponseContent.forEach((response) => {
        const sourceAction = safeArray(bundle.actions).find((candidate) => candidate?.id === response.move_response_id);
        transitions.push({
            transition_id: `${response.move_response_id}-submitted`,
            session_id: response.session_id,
            entity_type: 'move_response',
            entity_id: response.move_response_id,
            from_state: null,
            to_state: 'submitted',
            transition_utc: response.submitted_utc || asUtcIso(sourceAction?.created_at),
            actor_pseudonym: response.author_pseudonym,
            actor_role: response.author_role,
            actor_team: response.author_team,
            recipient_team: null,
            move_number: response.move_number,
            dwell_in_from_s: null,
            triggering_event_id: null
        });
        if (response.review_state === 'adjudicated' && sourceAction?.adjudicated_at) {
            transitions.push({
                transition_id: `${response.move_response_id}-reviewed`,
                session_id: response.session_id,
                entity_type: 'move_response',
                entity_id: response.move_response_id,
                from_state: 'submitted',
                to_state: 'reviewed',
                transition_utc: asUtcIso(sourceAction.adjudicated_at),
                actor_pseudonym: 'whitecell-operator',
                actor_role: 'whitecell_lead',
                actor_team: 'whitecell',
                recipient_team: null,
                move_number: response.move_number,
                dwell_in_from_s: secondsBetween(response.submitted_utc, sourceAction.adjudicated_at),
                triggering_event_id: null
            });
        }
    });

    rfiContent.forEach((rfi) => {
        transitions.push({
            transition_id: `${rfi.rfi_id}-pending`,
            session_id: rfi.session_id,
            entity_type: 'rfi',
            entity_id: rfi.rfi_id,
            from_state: null,
            to_state: 'pending',
            transition_utc: rfi.raised_utc,
            actor_pseudonym: rfi.requester_pseudonym,
            actor_role: rfi.requester_role,
            actor_team: rfi.requester_team,
            recipient_team: 'whitecell',
            move_number: rfi.move_number,
            dwell_in_from_s: null,
            triggering_event_id: null
        });
        if (rfi.answered_utc) {
            transitions.push({
                transition_id: `${rfi.rfi_id}-answered`,
                session_id: rfi.session_id,
                entity_type: 'rfi',
                entity_id: rfi.rfi_id,
                from_state: 'pending',
                to_state: 'answered',
                transition_utc: rfi.answered_utc,
                actor_pseudonym: rfi.answered_by_pseudonym,
                actor_role: 'whitecell_lead',
                actor_team: 'whitecell',
                recipient_team: rfi.requester_team,
                move_number: rfi.move_number,
                dwell_in_from_s: secondsBetween(rfi.raised_utc, rfi.answered_utc),
                triggering_event_id: null
            });
        }
    });

    return transitions.filter((transition) => transition.transition_utc);
}

function buildInteractionEdges(bundle = {}, proposalContent, rfiContent) {
    const explicitRows = safeArray(bundle.researchInteractionEdges);
    if (explicitRows.length) {
        return explicitRows;
    }

    const proposalById = new Map(proposalContent.map((proposal) => [proposal.proposal_id, proposal]));

    const communicationEdges = safeArray(bundle.communications).map((communication) => {
        const metadata = safeObject(communication?.metadata);
        const sourceProposal = proposalById.get(metadata.source_proposal_id);
        const channel = communication?.type === 'PROPOSAL_FORWARDED'
            ? 'proposal_forward'
            : communication?.type === 'PROPOSAL_RESPONSE'
                ? 'proposal_response'
                : 'communication';
        const sourceTeam = communication?.from_role === 'white_cell'
            ? 'whitecell'
            : inferTeamFromRole(communication?.from_role);
        const targetTeam = metadata.recipient_team
            || inferTeamFromRole(communication?.to_role, communication?.to_role)
            || communication?.to_role
            || null;
        const direction = sourceTeam === 'whitecell' && targetTeam && targetTeam !== 'whitecell'
            ? 'operator_to_team'
            : targetTeam === 'whitecell'
                ? 'team_to_operator'
                : sourceTeam && targetTeam && sourceTeam !== targetTeam
                    ? 'team_to_team'
                    : 'intra_team';
        const occurredUtc = asUtcIso(communication?.created_at);
        const latencyBase = sourceProposal?.reviewed_utc
            || findForwardedProposalCommunication(bundle.communications, metadata.source_proposal_id)?.created_at
            || null;

        return {
            edge_id: communication?.id || `edge-${channel}`,
            session_id: bundle.session?.id || null,
            source_pseudonym: communication?.from_role === 'white_cell' ? 'whitecell-operator' : null,
            source_role: communication?.from_role || null,
            source_team: sourceTeam,
            target_pseudonym: null,
            target_team: targetTeam,
            channel,
            direction,
            communication_type: communication?.type || null,
            entity_id: communication?.id || null,
            move_number: communication?.move ?? null,
            occurred_utc: occurredUtc,
            latency_s: channel === 'proposal_response'
                ? secondsBetween(latencyBase, occurredUtc)
                : null
        };
    });

    const rfiEdges = rfiContent
        .filter((rfi) => rfi.answered_utc)
        .map((rfi) => ({
            edge_id: `${rfi.rfi_id}-rfi`,
            session_id: rfi.session_id,
            source_pseudonym: 'whitecell-operator',
            source_role: 'whitecell_lead',
            source_team: 'whitecell',
            target_pseudonym: rfi.requester_pseudonym,
            target_team: rfi.requester_team,
            channel: 'rfi',
            direction: 'operator_to_team',
            communication_type: 'RFI_ANSWERED',
            entity_id: rfi.rfi_id,
            move_number: rfi.move_number,
            occurred_utc: rfi.answered_utc,
            latency_s: secondsBetween(rfi.raised_utc, rfi.answered_utc)
        }));

    return [...communicationEdges, ...rfiEdges].filter((edge) => edge.occurred_utc);
}

function buildDataQualityEvents(bundle = {}, participantRegistry) {
    const explicitRows = safeArray(bundle.researchDataQualityEvents);
    if (explicitRows.length) {
        return explicitRows;
    }

    const rows = [];

    safeArray(bundle.participants).forEach((participant) => {
        if (!participant?.disconnected_at) {
            return;
        }

        rows.push({
            dq_event_id: `${participant.id || participant.client_id}-disconnect`,
            session_id: bundle.session?.id || null,
            participant_pseudonym: resolvePseudonym(participantRegistry, {
                clientId: participant?.client_id,
                participantId: participant?.id,
                role: participant?.role,
                seatIndex: participant?.seat_index
            }),
            role: participant?.role || null,
            team: inferTeamFromRole(participant?.role, participant?.team),
            seat_index: participant?.seat_index ?? null,
            event_type: 'disconnect',
            occurred_utc: asUtcIso(participant.disconnected_at),
            gap_seconds: secondsBetween(participant?.heartbeat_at || participant?.last_seen || participant?.joined_at, participant?.disconnected_at),
            detail: {
                last_seen: asUtcIso(participant?.last_seen || participant?.heartbeat_at)
            }
        });
    });

    return rows;
}

function buildDerivedParticipantMetrics({
    participantRows,
    notes,
    noteRevisions,
    draftRevisions,
    eventLog,
    interactionEdges
}) {
    const noteCountByPseudonym = new Map();
    const noteEditCountByPseudonym = new Map();
    const draftCountByPseudonym = new Map();
    const submissionCountByPseudonym = new Map();
    const responseLatenciesByTargetTeam = new Map();
    const eventRowsByPseudonym = new Map();
    const disconnectCountByPseudonym = new Map();

    notes.forEach((note) => {
        const key = note.author_pseudonym || 'unknown';
        noteCountByPseudonym.set(key, (noteCountByPseudonym.get(key) || 0) + 1);
    });

    noteRevisions.forEach((revision) => {
        const key = revision.author_pseudonym || 'unknown';
        noteEditCountByPseudonym.set(key, (noteEditCountByPseudonym.get(key) || 0) + 1);
    });

    draftRevisions.forEach((draft) => {
        const key = draft.author_pseudonym || 'unknown';
        draftCountByPseudonym.set(key, (draftCountByPseudonym.get(key) || 0) + 1);
        if (draft.submitted_utc) {
            submissionCountByPseudonym.set(key, (submissionCountByPseudonym.get(key) || 0) + 1);
        }
    });

    eventLog.forEach((event) => {
        const key = event.actor_pseudonym || 'unknown';
        if (!eventRowsByPseudonym.has(key)) {
            eventRowsByPseudonym.set(key, []);
        }
        eventRowsByPseudonym.get(key).push(event);
        if (event.event_type === 'PARTICIPANT_DISCONNECTED') {
            disconnectCountByPseudonym.set(key, (disconnectCountByPseudonym.get(key) || 0) + 1);
        }
    });

    interactionEdges.forEach((edge) => {
        if (!edge.target_team || edge.latency_s === null || edge.latency_s === undefined) {
            return;
        }
        if (!responseLatenciesByTargetTeam.has(edge.target_team)) {
            responseLatenciesByTargetTeam.set(edge.target_team, []);
        }
        responseLatenciesByTargetTeam.get(edge.target_team).push(edge.latency_s);
    });

    const sessionStart = eventLog[0]?.event_ts_utc || null;

    return participantRows.map((participant) => {
        const participantEvents = eventRowsByPseudonym.get(participant.participant_pseudonym) || [];
        const eventTimestamps = participantEvents.map((event) => event.event_ts_utc).filter(Boolean);
        const matchingLatencies = responseLatenciesByTargetTeam.get(participant.team) || [];
        const meanTimeToSubmitValues = draftRevisions
            .filter((draft) => draft.author_pseudonym === participant.participant_pseudonym)
            .map((draft) => draft.time_to_submit_s)
            .filter((value) => value !== null && value !== undefined);

        return {
            session_id: participant.session_id,
            participant_pseudonym: participant.participant_pseudonym,
            role: participant.role,
            team: participant.team,
            seat_index: participant.seat_index,
            events_count: participantEvents.length,
            notes_count: noteCountByPseudonym.get(participant.participant_pseudonym) || 0,
            note_edits_count: Math.max(
                0,
                (noteEditCountByPseudonym.get(participant.participant_pseudonym) || 0)
                - (noteCountByPseudonym.get(participant.participant_pseudonym) || 0)
            ),
            drafts_count: draftCountByPseudonym.get(participant.participant_pseudonym) || 0,
            submissions_count: submissionCountByPseudonym.get(participant.participant_pseudonym) || 0,
            mean_time_to_submit_s: meanTimeToSubmitValues.length
                ? Number((meanTimeToSubmitValues.reduce((sum, value) => sum + value, 0) / meanTimeToSubmitValues.length).toFixed(3))
                : null,
            mean_response_latency_s: matchingLatencies.length
                ? Number((matchingLatencies.reduce((sum, value) => sum + value, 0) / matchingLatencies.length).toFixed(3))
                : null,
            active_duration_s: participant.active_duration_s ?? null,
            disconnect_count: disconnectCountByPseudonym.get(participant.participant_pseudonym) || 0,
            first_event_offset_s: eventTimestamps.length ? secondsBetween(sessionStart, eventTimestamps[0]) : null,
            last_event_offset_s: eventTimestamps.length ? secondsBetween(sessionStart, eventTimestamps[eventTimestamps.length - 1]) : null
        };
    });
}

function buildDerivedSessionMetrics({
    sessionId,
    captureMode,
    participantRows,
    eventLog,
    actionContent,
    proposalContent,
    rfiContent,
    interactionEdges
}) {
    const sessionStart = eventLog[0]?.event_ts_utc || null;
    const sessionEnd = eventLog[eventLog.length - 1]?.event_ts_utc || sessionStart;
    const proposalLatencies = interactionEdges
        .map((edge) => edge.latency_s)
        .filter((value) => value !== null && value !== undefined);

    return [
        {
            session_id: sessionId,
            capture_mode: captureMode,
            session_duration_s: secondsBetween(sessionStart, sessionEnd),
            moves_count: Math.max(
                0,
                ...safeArray(actionContent).map((row) => row.move_number || 0),
                ...safeArray(proposalContent).map((row) => row.move_number || 0),
                ...safeArray(rfiContent).map((row) => row.move_number || 0)
            ),
            participants_active: participantRows.length,
            total_events: eventLog.length,
            actions_submitted: actionContent.filter((row) => row.submitted_utc).length,
            actions_adjudicated: actionContent.filter((row) => row.final_status === 'adjudicated').length,
            proposals_submitted: proposalContent.filter((row) => row.submitted_utc).length,
            proposals_forwarded: proposalContent.filter((row) => row.review_decision === 'forwarded').length,
            rfis_raised: rfiContent.length,
            communications_sent: interactionEdges.filter((edge) => edge.channel === 'communication').length,
            mean_proposal_response_latency_s: proposalLatencies.length
                ? Number((proposalLatencies.reduce((sum, value) => sum + value, 0) / proposalLatencies.length).toFixed(3))
                : null
        }
    ];
}

function buildCodebookRows() {
    return Object.entries(RESEARCH_EXPORT_COLUMNS).flatMap(([tableName, columns]) => {
        return columns.map((columnName) => ({
            table_name: tableName,
            column_name: columnName,
            data_type: /_utc$/.test(columnName)
                ? 'timestamp_utc'
                : /(_count|_number|_index|_sequence)$/.test(columnName)
                    ? 'integer'
                    : /(duration|latency|seconds|_s)$/.test(columnName)
                        ? 'number'
                        : /(_state|_role|_team|_type|_status)$/.test(columnName)
                            ? 'string'
                            : ['payload', 'before_state', 'after_state', 'full_content', 'targets', 'instruments', 'resources_committed', 'effects', 'detail', 'content_snapshot', 'content_diff_from_prev'].includes(columnName)
                                ? 'json'
                                : 'string',
            units: /(duration|latency|seconds|_s)$/.test(columnName)
                ? 'seconds'
                : /_count$/.test(columnName)
                    ? 'count'
                    : /length_chars$/.test(columnName)
                        ? 'characters'
                        : null,
            allowed_values: null,
            nullable: !['session_id', 'participant_pseudonym', 'author_pseudonym', 'event_type', 'entity_type', 'to_state', 'occurred_utc'].includes(columnName),
            is_derived: ['derived_participant_metrics', 'derived_session_metrics'].includes(tableName),
            derivation: ['derived_participant_metrics', 'derived_session_metrics'].includes(tableName)
                ? 'Computed client-side at export time from canonical event and content tables.'
                : null,
            pii_class: /content_text|proposal_text|question_text|answer_text|response_text|reasoning|rationale|intent_text|requested_action/.test(columnName)
                ? 'pseudonymous'
                : 'none',
            description: `Research export field ${columnName.replace(/_/g, ' ')} for ${tableName.replace(/_/g, ' ')}.`
        }));
    });
}

function renderReportTable(headers = [], rows = []) {
    if (!rows.length) {
        return '<p class="report-empty">No records were captured for this section.</p>';
    }

    return `
        <div class="report-table-wrap">
            <table class="report-table">
                <thead>
                    <tr>
                        ${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${rows.map((row) => `
                        <tr>
                            ${row.map((value) => `<td>${escapeHtml(value ?? '')}</td>`).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderInteractionMatrix(interactionEdges = []) {
    const counts = new Map();

    interactionEdges.forEach((edge) => {
        const source = edge.source_team || 'unknown';
        const target = edge.target_team || 'unknown';
        const key = `${source}->${target}`;
        counts.set(key, (counts.get(key) || 0) + 1);
    });

    const rows = [...counts.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, count]) => {
            const [source, target] = key.split('->');
            return [source, target, String(count)];
        });

    return renderReportTable(['Source', 'Target', 'Count'], rows);
}

export function buildResearchReportHtml(dataset, {
    includeNotesAppendix = false
} = {}) {
    const sessionMetrics = dataset.derivedSessionMetrics[0] || {};
    const proposalRows = dataset.proposalContent.map((proposal) => [
        proposal.title || 'Untitled proposal',
        proposal.intended_recipient_team || 'N/A',
        proposal.review_decision || 'pending',
        proposal.final_recipient_state || 'none',
        proposal.review_reason || ''
    ]);
    const actionRows = dataset.actionContent.map((action) => {
        const adjudication = dataset.adjudicationContent.find((entry) => entry.target_entity_id === action.action_id);
        return [
            action.title || 'Untitled action',
            action.action_type || 'N/A',
            action.intent_text || '',
            adjudication?.ruling || 'pending',
            adjudication?.reasoning || ''
        ];
    });
    const moveResponseRows = dataset.moveResponseContent.map((response) => [
        response.posture || 'N/A',
        response.response_text || '',
        response.rationale || '',
        response.review_state || 'submitted'
    ]);
    const rfiRows = dataset.rfiContent.map((rfi) => [
        rfi.requester_team || 'team',
        rfi.question_text || '',
        rfi.answer_text || '',
        rfi.status || 'pending'
    ]);
    const dataQualityRows = dataset.dataQualityEvents.map((event) => [
        event.team || 'unknown',
        event.event_type || 'event',
        event.occurred_utc || '',
        event.gap_seconds === null || event.gap_seconds === undefined ? '' : String(event.gap_seconds)
    ]);
    const participantRows = dataset.derivedParticipantMetrics.map((participant) => [
        participant.participant_pseudonym,
        participant.role || '',
        participant.team || '',
        String(participant.events_count || 0),
        String(participant.notes_count || 0),
        String(participant.drafts_count || 0),
        participant.mean_time_to_submit_s === null || participant.mean_time_to_submit_s === undefined
            ? ''
            : String(participant.mean_time_to_submit_s),
        participant.active_duration_s === null || participant.active_duration_s === undefined
            ? ''
            : String(participant.active_duration_s)
    ]);
    const timelineRows = dataset.stateTransitions
        .slice()
        .sort((left, right) => new Date(left.transition_utc).getTime() - new Date(right.transition_utc).getTime())
        .map((transition) => [
            transition.transition_utc || '',
            transition.entity_type || '',
            transition.to_state || '',
            transition.recipient_team || '',
            transition.move_number === null || transition.move_number === undefined
                ? ''
                : String(transition.move_number)
        ]);
    const notesRows = dataset.notes.map((note) => [
        note.author_pseudonym || '',
        note.author_role || '',
        note.author_team || '',
        note.created_utc || '',
        note.content_text || ''
    ]);

    return `
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(dataset.session?.name || dataset.session?.id || 'Research Export Report')}</title>
    <style>
        @page {
            size: A4;
            margin: 16mm;
        }

        :root {
            --report-ink: #111111;
            --report-rule: #333333;
            --report-muted: #555555;
            --report-bg: #ffffff;
        }

        * {
            box-sizing: border-box;
        }

        html, body {
            margin: 0;
            padding: 0;
            background: var(--report-bg);
            color: var(--report-ink);
            font-family: Georgia, "Times New Roman", serif;
            line-height: 1.5;
        }

        body {
            padding: 24px;
        }

        .no-print {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 14px;
            border: 1px solid var(--report-rule);
            background: #f5f5f5;
            color: var(--report-ink);
            cursor: pointer;
            font: inherit;
        }

        .report-root {
            max-width: 960px;
            margin: 0 auto;
        }

        .report-cover,
        .report-section {
            page-break-inside: avoid;
        }

        .report-section {
            margin-top: 28px;
            padding-top: 20px;
            border-top: 1px solid var(--report-rule);
        }

        .report-title {
            margin: 0 0 8px;
            font-size: 30px;
            line-height: 1.15;
        }

        .report-subtitle,
        .report-muted,
        .report-empty {
            color: var(--report-muted);
        }

        .report-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
        }

        .report-card {
            border: 1px solid var(--report-rule);
            padding: 12px;
        }

        .report-kpi {
            font-size: 22px;
            font-weight: 700;
        }

        .report-section-title {
            margin: 0 0 10px;
            font-size: 22px;
        }

        .report-table-wrap {
            overflow-x: auto;
        }

        .report-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
        }

        .report-table th,
        .report-table td {
            border: 1px solid var(--report-rule);
            padding: 8px 10px;
            vertical-align: top;
            text-align: left;
            font-size: 13px;
        }

        .report-list {
            margin: 12px 0 0;
            padding-left: 18px;
        }

        .report-list li + li {
            margin-top: 8px;
        }

        @media print {
            body {
                padding: 0;
            }

            .no-print {
                display: none !important;
            }

            .report-section {
                break-before: page;
            }

            .report-section:first-of-type {
                break-before: auto;
            }
        }
    </style>
</head>
<body>
    <div class="report-root">
        <button type="button" class="no-print" onclick="window.print()">Print Report</button>

        <section class="report-cover">
            <p class="report-subtitle">Research Export Report</p>
            <h1 class="report-title">${escapeHtml(dataset.session?.name || 'Session report')}</h1>
            <p class="report-muted">Session ID: ${escapeHtml(dataset.session?.id || '')}</p>
            <div class="report-grid">
                <div class="report-card">
                    <strong>Capture mode</strong><br>
                    ${escapeHtml(dataset.manifest.capture_mode)}
                </div>
                <div class="report-card">
                    <strong>Generated at (UTC)</strong><br>
                    ${escapeHtml(dataset.manifest.generated_at_utc)}
                </div>
                <div class="report-card">
                    <strong>Schema version</strong><br>
                    ${escapeHtml(dataset.manifest.schema_version)}
                </div>
                <div class="report-card">
                    <strong>Software build hash</strong><br>
                    ${escapeHtml(dataset.manifest.software_build_hash || 'unknown')}
                </div>
                <div class="report-card">
                    <strong>Generated by pseudonym</strong><br>
                    ${escapeHtml(dataset.manifest.generated_by_pseudonym)}
                </div>
                <div class="report-card">
                    <strong>Session checksum</strong><br>
                    ${escapeHtml(dataset.manifest.event_log_chain.session_checksum)}
                </div>
            </div>
        </section>

        <section class="report-section">
            <h2 class="report-section-title">Session Overview</h2>
            <div class="report-grid">
                <div class="report-card">
                    <div class="report-kpi">${escapeHtml(sessionMetrics.session_duration_s ?? '0')}</div>
                    <div class="report-muted">Session duration (seconds)</div>
                </div>
                <div class="report-card">
                    <div class="report-kpi">${escapeHtml(sessionMetrics.moves_count ?? '0')}</div>
                    <div class="report-muted">Moves captured</div>
                </div>
                <div class="report-card">
                    <div class="report-kpi">${escapeHtml(sessionMetrics.participants_active ?? '0')}</div>
                    <div class="report-muted">Active participants</div>
                </div>
                <div class="report-card">
                    <div class="report-kpi">${escapeHtml(sessionMetrics.actions_submitted ?? '0')}</div>
                    <div class="report-muted">Actions submitted</div>
                </div>
                <div class="report-card">
                    <div class="report-kpi">${escapeHtml(sessionMetrics.proposals_submitted ?? '0')}</div>
                    <div class="report-muted">Proposals submitted</div>
                </div>
                <div class="report-card">
                    <div class="report-kpi">${escapeHtml(sessionMetrics.rfis_raised ?? '0')}</div>
                    <div class="report-muted">RFIs raised</div>
                </div>
            </div>
        </section>

        <section class="report-section">
            <h2 class="report-section-title">Participant Activity</h2>
            ${renderReportTable(
                ['Pseudonym', 'Role', 'Team', 'Events', 'Notes', 'Drafts', 'Mean submit s', 'Active s'],
                participantRows
            )}
        </section>

        <section class="report-section">
            <h2 class="report-section-title">Decision Process Timeline</h2>
            ${renderReportTable(['UTC', 'Entity', 'State', 'Recipient', 'Move'], timelineRows)}
        </section>

        <section class="report-section">
            <h2 class="report-section-title">Proposals: Content and Review</h2>
            ${renderReportTable(['Title', 'Recipient', 'Review', 'Recipient state', 'Review reason'], proposalRows)}
        </section>

        <section class="report-section">
            <h2 class="report-section-title">Actions and Adjudications</h2>
            ${renderReportTable(['Title', 'Type', 'Intent', 'Ruling', 'Reasoning'], actionRows)}
        </section>

        <section class="report-section">
            <h2 class="report-section-title">Move Responses</h2>
            ${renderReportTable(['Posture', 'Response', 'Rationale', 'Review state'], moveResponseRows)}
        </section>

        <section class="report-section">
            <h2 class="report-section-title">Requests for Information</h2>
            ${renderReportTable(['Requester team', 'Question', 'Answer', 'Status'], rfiRows)}
        </section>

        <section class="report-section">
            <h2 class="report-section-title">Interaction Summary</h2>
            ${renderInteractionMatrix(dataset.interactionEdges)}
        </section>

        <section class="report-section">
            <h2 class="report-section-title">Data Quality</h2>
            ${renderReportTable(['Team', 'Event', 'Occurred UTC', 'Gap seconds'], dataQualityRows)}
        </section>

        <section class="report-section">
            <h2 class="report-section-title">Notes Appendix</h2>
            ${includeNotesAppendix
                ? renderReportTable(['Author', 'Role', 'Team', 'Created UTC', 'Content'], notesRows)
                : '<p class="report-muted">Notes appendix withheld at report-generation time. The machine-readable notes remain in notes.csv and notes.json.</p>'}
        </section>
    </div>
</body>
</html>
    `.trim();
}

function buildLegacyFiles(bundle = {}, generatedAtUtc) {
    const sessionMetadataPayload = {
        exportedAt: generatedAtUtc,
        version: CONFIG.VERSION,
        session: bundle.session || null
    };

    return [
        {
            path: 'legacy/session_metadata.json',
            content: JSON.stringify(sessionMetadataPayload, null, 2),
            mimeType: 'application/json'
        },
        {
            path: 'legacy/game_state.json',
            content: JSON.stringify(bundle.gameState || null, null, 2),
            mimeType: 'application/json'
        },
        {
            path: 'legacy/actions.csv',
            content: exportSessionActionsCsv(safeArray(bundle.actions)),
            mimeType: 'text/csv'
        },
        {
            path: 'legacy/rfis.csv',
            content: exportSessionRequestsCsv(safeArray(bundle.requests)),
            mimeType: 'text/csv'
        },
        {
            path: 'legacy/timeline.csv',
            content: exportSessionTimelineCsv(safeArray(bundle.timeline)),
            mimeType: 'text/csv'
        },
        {
            path: 'legacy/participants.csv',
            content: exportSessionParticipantsCsv(safeArray(bundle.participants)),
            mimeType: 'text/csv'
        }
    ];
}

function toJsonFileContent(value) {
    return JSON.stringify(value, null, 2);
}

function toJsonLines(rows = []) {
    return rows.map((row) => JSON.stringify(row)).join('\n');
}

async function buildEventLogChain(events = []) {
    const firstEventHash = events[0]?.event_hash || '';
    const lastEventHash = events[events.length - 1]?.event_hash || '';
    const sessionChecksum = await sha256Hex(events.map((event) => event.event_hash || '').join('\n'));

    return {
        first_event_hash: firstEventHash,
        last_event_hash: lastEventHash,
        session_checksum: sessionChecksum
    };
}

function buildFileDefinitions({
    manifest,
    codebook,
    reportHtml,
    eventLog,
    participantRows,
    notes,
    noteRevisions,
    draftRevisions,
    stateTransitions,
    actionContent,
    proposalContent,
    adjudicationContent,
    moveResponseContent,
    rfiContent,
    interactionEdges,
    dataQualityEvents,
    derivedParticipantMetrics,
    derivedSessionMetrics,
    legacyFiles
}) {
    return [
        {
            path: 'manifest.json',
            content: toJsonFileContent(manifest),
            mimeType: 'application/json'
        },
        {
            path: 'codebook.json',
            content: toJsonFileContent(codebook),
            mimeType: 'application/json'
        },
        {
            path: 'report.html',
            content: reportHtml,
            mimeType: 'text/html'
        },
        {
            path: 'event_log.jsonl',
            content: toJsonLines(eventLog),
            mimeType: 'application/x-ndjson'
        },
        {
            path: 'event_log.csv',
            content: arrayToCsv(eventLog, RESEARCH_EXPORT_COLUMNS.event_log),
            mimeType: 'text/csv'
        },
        {
            path: 'participants.csv',
            content: arrayToCsv(participantRows, RESEARCH_EXPORT_COLUMNS.participants),
            mimeType: 'text/csv'
        },
        {
            path: 'participants.json',
            content: toJsonFileContent(participantRows),
            mimeType: 'application/json'
        },
        {
            path: 'notes.csv',
            content: arrayToCsv(notes, RESEARCH_EXPORT_COLUMNS.notes),
            mimeType: 'text/csv'
        },
        {
            path: 'notes.json',
            content: toJsonFileContent(notes),
            mimeType: 'application/json'
        },
        {
            path: 'note_revisions.csv',
            content: arrayToCsv(noteRevisions, RESEARCH_EXPORT_COLUMNS.note_revisions),
            mimeType: 'text/csv'
        },
        {
            path: 'note_revisions.json',
            content: toJsonFileContent(noteRevisions),
            mimeType: 'application/json'
        },
        {
            path: 'drafts_revisions.csv',
            content: arrayToCsv(draftRevisions, RESEARCH_EXPORT_COLUMNS.drafts_revisions),
            mimeType: 'text/csv'
        },
        {
            path: 'drafts_revisions.json',
            content: toJsonFileContent(draftRevisions),
            mimeType: 'application/json'
        },
        {
            path: 'state_transitions.csv',
            content: arrayToCsv(stateTransitions, RESEARCH_EXPORT_COLUMNS.state_transitions),
            mimeType: 'text/csv'
        },
        {
            path: 'state_transitions.json',
            content: toJsonFileContent(stateTransitions),
            mimeType: 'application/json'
        },
        {
            path: 'action_content.csv',
            content: arrayToCsv(actionContent, RESEARCH_EXPORT_COLUMNS.action_content),
            mimeType: 'text/csv'
        },
        {
            path: 'action_content.json',
            content: toJsonFileContent(actionContent),
            mimeType: 'application/json'
        },
        {
            path: 'proposal_content.csv',
            content: arrayToCsv(proposalContent, RESEARCH_EXPORT_COLUMNS.proposal_content),
            mimeType: 'text/csv'
        },
        {
            path: 'proposal_content.json',
            content: toJsonFileContent(proposalContent),
            mimeType: 'application/json'
        },
        {
            path: 'adjudication_content.csv',
            content: arrayToCsv(adjudicationContent, RESEARCH_EXPORT_COLUMNS.adjudication_content),
            mimeType: 'text/csv'
        },
        {
            path: 'adjudication_content.json',
            content: toJsonFileContent(adjudicationContent),
            mimeType: 'application/json'
        },
        {
            path: 'move_response_content.csv',
            content: arrayToCsv(moveResponseContent, RESEARCH_EXPORT_COLUMNS.move_response_content),
            mimeType: 'text/csv'
        },
        {
            path: 'move_response_content.json',
            content: toJsonFileContent(moveResponseContent),
            mimeType: 'application/json'
        },
        {
            path: 'rfi_content.csv',
            content: arrayToCsv(rfiContent, RESEARCH_EXPORT_COLUMNS.rfi_content),
            mimeType: 'text/csv'
        },
        {
            path: 'rfi_content.json',
            content: toJsonFileContent(rfiContent),
            mimeType: 'application/json'
        },
        {
            path: 'interaction_edges.csv',
            content: arrayToCsv(interactionEdges, RESEARCH_EXPORT_COLUMNS.interaction_edges),
            mimeType: 'text/csv'
        },
        {
            path: 'interaction_edges.json',
            content: toJsonFileContent(interactionEdges),
            mimeType: 'application/json'
        },
        {
            path: 'data_quality_events.csv',
            content: arrayToCsv(dataQualityEvents, RESEARCH_EXPORT_COLUMNS.data_quality_events),
            mimeType: 'text/csv'
        },
        {
            path: 'data_quality_events.json',
            content: toJsonFileContent(dataQualityEvents),
            mimeType: 'application/json'
        },
        {
            path: 'derived_participant_metrics.csv',
            content: arrayToCsv(derivedParticipantMetrics, RESEARCH_EXPORT_COLUMNS.derived_participant_metrics),
            mimeType: 'text/csv'
        },
        {
            path: 'derived_session_metrics.csv',
            content: arrayToCsv(derivedSessionMetrics, RESEARCH_EXPORT_COLUMNS.derived_session_metrics),
            mimeType: 'text/csv'
        },
        ...legacyFiles
    ];
}

async function buildChecksumsFile(fileDefinitions = []) {
    const checksumLines = [];

    for (const fileDefinition of fileDefinitions) {
        const hash = await sha256Hex(fileDefinition.content);
        checksumLines.push(`${hash}  ${fileDefinition.path}`);
    }

    return {
        path: 'checksums.sha256',
        content: checksumLines.join('\n'),
        mimeType: 'text/plain'
    };
}

export async function buildResearchExportBundle(bundle = {}, {
    generatedAtUtc = new Date().toISOString(),
    generatedByPseudonym = 'game_master_operator',
    captureMode = bundle.captureMode || 'research',
    exportVersion = 1,
    includeNotesAppendix = false,
    softwareBuildHash = bundle.softwareBuildHash || CONFIG.VERSION
} = {}) {
    const normalizedCaptureMode = normalizeCaptureMode(captureMode);
    const participantRegistry = buildParticipantRegistry(bundle);
    participantRegistry.rows = await Promise.all(
        participantRegistry.rows.map(async (participant) => ({
            ...participant,
            auth_uid_hash: await sha256Hex(participant.auth_uid_hash || `${participant.participant_pseudonym}:${participant.session_id || ''}`)
        }))
    );
    const rawEventLog = safeArray(bundle.researchAuditEventLog).length
        ? safeArray(bundle.researchAuditEventLog).map((event) => ({
            ...event,
            event_ts_utc: asUtcIso(event.event_ts_utc),
            server_received_utc: asUtcIso(event.server_received_utc),
            client_ts_utc: asUtcIso(event.client_ts_utc)
        }))
        : buildSyntheticEventLog(bundle, participantRegistry);
    const eventLog = await enrichEventLogWithHashes(
        rawEventLog
            .slice()
            .sort((left, right) => new Date(left.event_ts_utc).getTime() - new Date(right.event_ts_utc).getTime())
    );
    const eventLogChain = await buildEventLogChain(eventLog);
    const { notes, noteRevisions } = buildNotesTables(bundle, participantRegistry);
    const draftRevisions = buildDraftRevisions(bundle, participantRegistry);
    const actionContent = buildActionContent(bundle, participantRegistry);
    const proposalContent = buildProposalContent(bundle, participantRegistry);
    const adjudicationContent = buildAdjudicationContent(bundle);
    const moveResponseContent = buildMoveResponseContent(bundle, participantRegistry);
    const rfiContent = buildRfiContent(bundle, participantRegistry);
    const stateTransitions = buildStateTransitions(
        bundle,
        actionContent,
        proposalContent,
        moveResponseContent,
        rfiContent
    );
    const interactionEdges = buildInteractionEdges(bundle, proposalContent, rfiContent);
    const dataQualityEvents = buildDataQualityEvents(bundle, participantRegistry);
    const derivedParticipantMetrics = safeArray(bundle.researchDerivedParticipantMetrics).length
        ? safeArray(bundle.researchDerivedParticipantMetrics)
        : buildDerivedParticipantMetrics({
            participantRows: participantRegistry.rows,
            notes,
            noteRevisions,
            draftRevisions,
            eventLog,
            interactionEdges
        });
    const derivedSessionMetrics = safeArray(bundle.researchDerivedSessionMetrics).length
        ? safeArray(bundle.researchDerivedSessionMetrics)
        : buildDerivedSessionMetrics({
            sessionId: bundle.session?.id || null,
            captureMode: normalizedCaptureMode,
            participantRows: participantRegistry.rows,
            eventLog,
            actionContent,
            proposalContent,
            rfiContent,
            interactionEdges
        });
    const rowCounts = {
        event_log: eventLog.length,
        participants: participantRegistry.rows.length,
        notes: notes.length,
        note_revisions: noteRevisions.length,
        drafts_revisions: draftRevisions.length,
        state_transitions: stateTransitions.length,
        action_content: actionContent.length,
        proposal_content: proposalContent.length,
        adjudication_content: adjudicationContent.length,
        move_response_content: moveResponseContent.length,
        rfi_content: rfiContent.length,
        interaction_edges: interactionEdges.length,
        data_quality_events: dataQualityEvents.length
    };
    const manifest = {
        schema_version: RESEARCH_EXPORT_SCHEMA_VERSION,
        export_format_revision: RESEARCH_EXPORT_FORMAT_REVISION,
        export_version: exportVersion,
        software_build_hash: softwareBuildHash || 'unknown',
        generated_at_utc: asUtcIso(generatedAtUtc),
        generated_by_pseudonym: generatedByPseudonym,
        timezone_declared: 'UTC',
        session_id: bundle.session?.id || null,
        capture_mode: normalizedCaptureMode,
        session_config_snapshot: {
            session_name: bundle.session?.name || null,
            session_code: bundle.session?.metadata?.session_code || null,
            game_state: bundle.gameState || null
        },
        row_counts: rowCounts,
        event_log_chain: eventLogChain,
        codebook_ref: 'codebook.json',
        report_ref: 'report.html'
    };
    const codebook = safeArray(bundle.researchCodebook).length
        ? {
            schema_version: RESEARCH_EXPORT_SCHEMA_VERSION,
            generated_at_utc: manifest.generated_at_utc,
            tables: safeArray(bundle.researchCodebook)
        }
        : {
            schema_version: RESEARCH_EXPORT_SCHEMA_VERSION,
            generated_at_utc: manifest.generated_at_utc,
            tables: buildCodebookRows()
        };
    const dataset = {
        session: bundle.session || null,
        manifest,
        codebook,
        eventLog,
        participants: participantRegistry.rows,
        notes,
        noteRevisions,
        draftRevisions,
        stateTransitions,
        actionContent,
        proposalContent,
        adjudicationContent,
        moveResponseContent,
        rfiContent,
        interactionEdges,
        dataQualityEvents,
        derivedParticipantMetrics,
        derivedSessionMetrics
    };
    const reportHtml = buildResearchReportHtml(dataset, {
        includeNotesAppendix
    });
    const legacyFiles = buildLegacyFiles(bundle, manifest.generated_at_utc);
    const fileDefinitions = buildFileDefinitions({
        manifest,
        codebook,
        reportHtml,
        eventLog,
        participantRows: participantRegistry.rows,
        notes,
        noteRevisions,
        draftRevisions,
        stateTransitions,
        actionContent,
        proposalContent,
        adjudicationContent,
        moveResponseContent,
        rfiContent,
        interactionEdges,
        dataQualityEvents,
        derivedParticipantMetrics,
        derivedSessionMetrics,
        legacyFiles
    });
    const checksumsFile = await buildChecksumsFile(fileDefinitions);
    const rootFolderName = `research_export_${bundle.session?.id || 'session'}_${buildIsoTimestampFragment(manifest.generated_at_utc)}`;

    return {
        ...dataset,
        reportHtml,
        rootFolderName,
        files: [...fileDefinitions, checksumsFile]
    };
}

let crcTable = null;

function getCrcTable() {
    if (crcTable) {
        return crcTable;
    }

    crcTable = new Uint32Array(256);
    for (let index = 0; index < 256; index += 1) {
        let current = index;
        for (let bit = 0; bit < 8; bit += 1) {
            current = (current & 1) ? (0xedb88320 ^ (current >>> 1)) : (current >>> 1);
        }
        crcTable[index] = current >>> 0;
    }
    return crcTable;
}

function crc32(bytes) {
    const table = getCrcTable();
    let crc = 0xffffffff;

    for (let index = 0; index < bytes.length; index += 1) {
        crc = table[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
    }

    return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(view, offset, value) {
    view.setUint16(offset, value, true);
}

function writeUint32(view, offset, value) {
    view.setUint32(offset, value, true);
}

function concatUint8Arrays(chunks = []) {
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const output = new Uint8Array(totalLength);
    let offset = 0;

    chunks.forEach((chunk) => {
        output.set(chunk, offset);
        offset += chunk.length;
    });

    return output;
}

export async function createResearchExportArchiveBlob(researchExportBundle) {
    const files = safeArray(researchExportBundle?.files);
    const rootFolderName = researchExportBundle?.rootFolderName || 'research_export';
    const localFileParts = [];
    const centralDirectoryParts = [];
    let offset = 0;

    files.forEach((fileDefinition) => {
        const filename = `${rootFolderName}/${fileDefinition.path}`;
        const filenameBytes = encodeText(filename);
        const contentBytes = encodeText(fileDefinition.content || '');
        const fileCrc32 = crc32(contentBytes);

        const localHeader = new Uint8Array(30 + filenameBytes.length);
        const localHeaderView = new DataView(localHeader.buffer);
        writeUint32(localHeaderView, 0, 0x04034b50);
        writeUint16(localHeaderView, 4, 20);
        writeUint16(localHeaderView, 6, 0);
        writeUint16(localHeaderView, 8, 0);
        writeUint16(localHeaderView, 10, 0);
        writeUint16(localHeaderView, 12, 0);
        writeUint32(localHeaderView, 14, fileCrc32);
        writeUint32(localHeaderView, 18, contentBytes.length);
        writeUint32(localHeaderView, 22, contentBytes.length);
        writeUint16(localHeaderView, 26, filenameBytes.length);
        writeUint16(localHeaderView, 28, 0);
        localHeader.set(filenameBytes, 30);

        const centralHeader = new Uint8Array(46 + filenameBytes.length);
        const centralHeaderView = new DataView(centralHeader.buffer);
        writeUint32(centralHeaderView, 0, 0x02014b50);
        writeUint16(centralHeaderView, 4, 20);
        writeUint16(centralHeaderView, 6, 20);
        writeUint16(centralHeaderView, 8, 0);
        writeUint16(centralHeaderView, 10, 0);
        writeUint16(centralHeaderView, 12, 0);
        writeUint16(centralHeaderView, 14, 0);
        writeUint32(centralHeaderView, 16, fileCrc32);
        writeUint32(centralHeaderView, 20, contentBytes.length);
        writeUint32(centralHeaderView, 24, contentBytes.length);
        writeUint16(centralHeaderView, 28, filenameBytes.length);
        writeUint16(centralHeaderView, 30, 0);
        writeUint16(centralHeaderView, 32, 0);
        writeUint16(centralHeaderView, 34, 0);
        writeUint16(centralHeaderView, 36, 0);
        writeUint32(centralHeaderView, 38, 0);
        writeUint32(centralHeaderView, 42, offset);
        centralHeader.set(filenameBytes, 46);

        localFileParts.push(localHeader, contentBytes);
        centralDirectoryParts.push(centralHeader);
        offset += localHeader.length + contentBytes.length;
    });

    const centralDirectory = concatUint8Arrays(centralDirectoryParts);
    const endOfCentralDirectory = new Uint8Array(22);
    const endView = new DataView(endOfCentralDirectory.buffer);
    writeUint32(endView, 0, 0x06054b50);
    writeUint16(endView, 4, 0);
    writeUint16(endView, 6, 0);
    writeUint16(endView, 8, files.length);
    writeUint16(endView, 10, files.length);
    writeUint32(endView, 12, centralDirectory.length);
    writeUint32(endView, 16, offset);
    writeUint16(endView, 20, 0);

    return new Blob(
        [...localFileParts, centralDirectory, endOfCentralDirectory],
        { type: 'application/zip' }
    );
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export async function downloadResearchExportArchive(researchExportBundle, filename = null) {
    const archiveBlob = await createResearchExportArchiveBlob(researchExportBundle);
    const resolvedFilename = filename || `${researchExportBundle.rootFolderName}.zip`;
    downloadBlob(archiveBlob, resolvedFilename);
    return archiveBlob;
}

export async function openResearchPrintWindow(reportHtml, {
    title = 'Research Report'
} = {}) {
    if (typeof window === 'undefined') {
        throw new Error('Printing is only available in the browser.');
    }

    const htmlBlob = new Blob([reportHtml], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(htmlBlob);
    const printWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer');

    if (!printWindow) {
        URL.revokeObjectURL(blobUrl);
        throw new Error('The browser blocked the report window.');
    }

    try {
        printWindow.document.title = title;
    } catch (_error) {
        // Ignore cross-window title failures for blob URLs.
    }

    const finalizePrint = () => {
        try {
            printWindow.focus?.();
            printWindow.print?.();
        } finally {
            window.setTimeout(() => {
                URL.revokeObjectURL(blobUrl);
            }, 60000);
        }
    };

    try {
        printWindow.addEventListener('load', finalizePrint, { once: true });
    } catch (_error) {
        window.setTimeout(finalizePrint, 300);
    }

    return blobUrl;
}
