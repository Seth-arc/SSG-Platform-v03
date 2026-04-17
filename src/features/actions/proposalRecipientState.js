/**
 * Proposal Recipient State
 *
 * Shared backend-backed record of what a recipient has done with each
 * forwarded proposal communication. The canonical state is stored in the
 * communication metadata so every seat sees the same chip state.
 */

export const PROPOSAL_RECIPIENT_STATUSES = Object.freeze({
    UNREAD: 'unread',
    ACKNOWLEDGED: 'acknowledged',
    RESPONDED: 'responded',
    DECLINED: 'declined',
    IGNORED: 'ignored'
});

const ACTIONED_STATUSES = new Set([
    PROPOSAL_RECIPIENT_STATUSES.ACKNOWLEDGED,
    PROPOSAL_RECIPIENT_STATUSES.RESPONDED,
    PROPOSAL_RECIPIENT_STATUSES.DECLINED,
    PROPOSAL_RECIPIENT_STATUSES.IGNORED
]);

function getCommunicationMetadata(communication = null) {
    return communication?.metadata && typeof communication.metadata === 'object'
        ? communication.metadata
        : {};
}

function normalizeProposalRecipientEntry(entry = null) {
    if (!entry || typeof entry !== 'object') {
        return null;
    }

    const status = typeof entry.status === 'string'
        ? entry.status.trim().toLowerCase()
        : '';
    if (!status || !Object.values(PROPOSAL_RECIPIENT_STATUSES).includes(status)) {
        return null;
    }

    return {
        ...entry,
        status
    };
}

export function getProposalRecipientEntry(communication = null) {
    return normalizeProposalRecipientEntry(getCommunicationMetadata(communication).proposal_recipient_state);
}

export function getProposalRecipientStatus(communication = null) {
    return getProposalRecipientEntry(communication)?.status
        || PROPOSAL_RECIPIENT_STATUSES.UNREAD;
}

export function countUnreadProposals(communications = []) {
    if (!Array.isArray(communications) || communications.length === 0) return 0;
    return communications.reduce((count, communication) => {
        const status = getProposalRecipientStatus(communication);
        return status === PROPOSAL_RECIPIENT_STATUSES.UNREAD ? count + 1 : count;
    }, 0);
}

export function isProposalActioned(communication = null) {
    const status = getProposalRecipientStatus(communication);
    return ACTIONED_STATUSES.has(status);
}

export function formatProposalRecipientStatus(status) {
    switch (status) {
        case PROPOSAL_RECIPIENT_STATUSES.ACKNOWLEDGED: return 'Acknowledged';
        case PROPOSAL_RECIPIENT_STATUSES.RESPONDED:    return 'Responded';
        case PROPOSAL_RECIPIENT_STATUSES.DECLINED:     return 'Declined';
        case PROPOSAL_RECIPIENT_STATUSES.IGNORED:      return 'Ignored';
        case PROPOSAL_RECIPIENT_STATUSES.UNREAD:
        default:                                        return 'Unread';
    }
}
