/**
 * Proposal Recipient State
 *
 * Per-browser record of what a recipient has done with each forwarded
 * proposal communication: acknowledged / responded / declined / ignored / read.
 * Default state is "unread" — used to power the sidebar unread badge and the
 * status chip shown on each Received Proposals card.
 *
 * Stored in localStorage so it persists across reloads without requiring a
 * DB schema change during the UI / flow development phase.
 */

const STORAGE_KEY = 'esg:proposal-recipient-state';

export const PROPOSAL_RECIPIENT_STATUSES = Object.freeze({
    UNREAD: 'unread',
    ACKNOWLEDGED: 'acknowledged',
    RESPONDED: 'responded',
    DECLINED: 'declined',
    IGNORED: 'ignored',
    READ: 'read'
});

const ACTIONED_STATUSES = new Set([
    PROPOSAL_RECIPIENT_STATUSES.ACKNOWLEDGED,
    PROPOSAL_RECIPIENT_STATUSES.RESPONDED,
    PROPOSAL_RECIPIENT_STATUSES.DECLINED,
    PROPOSAL_RECIPIENT_STATUSES.IGNORED,
    PROPOSAL_RECIPIENT_STATUSES.READ
]);

function readStore() {
    try {
        const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
        return raw ? JSON.parse(raw) : {};
    } catch (_err) {
        return {};
    }
}

function writeStore(store) {
    try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (_err) {
        // Swallow quota / private-mode errors — recipient state is best-effort.
    }
}

function keyFor(sessionId, communicationId) {
    return `${sessionId || 'no-session'}::${communicationId}`;
}

export function getProposalRecipientEntry(sessionId, communicationId) {
    if (!communicationId) return null;
    const store = readStore();
    return store[keyFor(sessionId, communicationId)] || null;
}

export function getProposalRecipientStatus(sessionId, communicationId) {
    return getProposalRecipientEntry(sessionId, communicationId)?.status
        || PROPOSAL_RECIPIENT_STATUSES.UNREAD;
}

export function setProposalRecipientStatus(sessionId, communicationId, status, extra = {}) {
    if (!communicationId || !status) return;
    const store = readStore();
    store[keyFor(sessionId, communicationId)] = {
        status,
        actionedAt: new Date().toISOString(),
        ...extra
    };
    writeStore(store);
}

export function countUnreadProposals(sessionId, communications = []) {
    if (!Array.isArray(communications) || communications.length === 0) return 0;
    const store = readStore();
    return communications.reduce((count, communication) => {
        const entry = store[keyFor(sessionId, communication?.id)];
        const status = entry?.status || PROPOSAL_RECIPIENT_STATUSES.UNREAD;
        return status === PROPOSAL_RECIPIENT_STATUSES.UNREAD ? count + 1 : count;
    }, 0);
}

export function isProposalActioned(sessionId, communicationId) {
    const status = getProposalRecipientStatus(sessionId, communicationId);
    return ACTIONED_STATUSES.has(status);
}

export function formatProposalRecipientStatus(status) {
    switch (status) {
        case PROPOSAL_RECIPIENT_STATUSES.ACKNOWLEDGED: return 'Acknowledged';
        case PROPOSAL_RECIPIENT_STATUSES.RESPONDED:    return 'Responded';
        case PROPOSAL_RECIPIENT_STATUSES.DECLINED:     return 'Declined';
        case PROPOSAL_RECIPIENT_STATUSES.IGNORED:      return 'Ignored';
        case PROPOSAL_RECIPIENT_STATUSES.READ:         return 'Read';
        case PROPOSAL_RECIPIENT_STATUSES.UNREAD:
        default:                                        return 'Unread';
    }
}
