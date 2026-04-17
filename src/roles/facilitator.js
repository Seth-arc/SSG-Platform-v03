/**
 * Facilitator Role Controller
 * ESG Economic Statecraft Simulation Platform v2.0
 */

import { sessionStore } from '../stores/session.js';
import { gameStateStore } from '../stores/gameState.js';
import { actionsStore } from '../stores/actions.js';
import { requestsStore } from '../stores/requests.js';
import { timelineStore } from '../stores/timeline.js';
import { communicationsStore } from '../stores/communications.js';
import { database } from '../services/database.js';
import { syncService } from '../services/sync.js';
import { createLogger } from '../utils/logger.js';
import { showToast } from '../components/ui/Toast.js';
import { showLoader, hideLoader } from '../components/ui/Loader.js';
import { showModal, confirmModal } from '../components/ui/Modal.js';
import {
    createBadge,
    createOutcomeBadge,
    createPriorityBadge,
    createStatusBadge
} from '../components/ui/Badge.js';
import {
    BLUE_ACTION_COORDINATED_OPTIONS,
    BLUE_ACTION_COUNTRIES,
    BLUE_ACTION_ENFORCEMENT_TIMELINES,
    BLUE_ACTION_IMPLEMENTATIONS,
    BLUE_ACTION_INFORMED_OPTIONS,
    BLUE_ACTION_INSTRUMENTS,
    BLUE_ACTION_LEVERS,
    BLUE_ACTION_SECTORS,
    BLUE_ACTION_SUPPLY_CHAIN_FOCUS,
    formatActionSequenceLabel,
    formatBlueActionSelection,
    getActionSequenceNumber,
    getBlueActionViewModel,
    getNextActionSequenceNumber,
    serializeBlueActionDetails
} from '../features/actions/blueActionDetails.js';
import {
    PROPOSAL_ORIGINATORS,
    PROPOSAL_CATEGORIES,
    PROPOSAL_SECTORS,
    PROPOSAL_DELIVERIES,
    serializeProposalDetails,
    getProposalViewModel
} from '../features/actions/proposalDetails.js';
import {
    serializeMoveResponseDetails,
    getMoveResponseViewModel
} from '../features/actions/moveResponseDetails.js';
import {
    PROPOSAL_RECIPIENT_STATUSES,
    countUnreadProposals,
    formatProposalRecipientStatus,
    getProposalRecipientStatus
} from '../features/actions/proposalRecipientState.js';
import {
    WHITE_CELL_UPDATE_KINDS,
    getWhiteCellCommunicationUpdateKind,
    isWhiteCellCommunicationVisibleToLead,
    isWhiteCellSectionUpdate,
    isWhiteCellTimelineEventVisibleToLead
} from '../features/communications/targeting.js';
import { formatDateTime, formatRelativeTime } from '../utils/formatting.js';
import { validateAction } from '../utils/validation.js';
import {
    ENUMS,
    canDeleteAction,
    canEditAction,
    canSubmitAction,
    isAdjudicatedAction,
    isSubmittedAction
} from '../core/enums.js';
import { getRoleRoute, resolveTeamContext } from '../core/teamContext.js';
import { navigateToApp } from '../core/navigation.js';

const logger = createLogger('Facilitator');
const TRIBE_STREET_JOURNAL_EVENT_TYPES = new Set(['NOTE', 'MOMENT', 'QUOTE']);
const TRIBE_STREET_JOURNAL_LIMIT = 20;
const BLUE_ACTION_WIZARD_PAGE_TOTAL = 3;

function getEventTimestamp(event = {}) {
    return event?.created_at || event?.updated_at || event?.timestamp || null;
}

function getSortableEventTime(event = {}) {
    const timestamp = getEventTimestamp(event);
    if (!timestamp) {
        return 0;
    }

    const parsedTime = new Date(timestamp).getTime();
    return Number.isFinite(parsedTime) ? parsedTime : 0;
}

export function isTribeStreetJournalEntry(event = {}, teamId = null) {
    const eventType = event?.type ?? event?.event_type ?? null;

    return Boolean(teamId)
        && event?.team === teamId
        && TRIBE_STREET_JOURNAL_EVENT_TYPES.has(eventType)
        && event?.metadata?.source !== 'notetaker_save';
}

export function buildTribeStreetJournalEntries(events = [], teamId = null) {
    return [...(events || [])]
        .filter((event) => isTribeStreetJournalEntry(event, teamId))
        .sort((a, b) => getSortableEventTime(b) - getSortableEventTime(a))
        .slice(0, TRIBE_STREET_JOURNAL_LIMIT);
}

export function getFacilitatorAccessState({
    role,
    teamContext,
    observerTeamId = null
}) {
    if (role === teamContext.facilitatorRole) {
        return {
            allowed: true,
            readOnly: false,
            reason: null,
            roleSurface: 'facilitator'
        };
    }

    if (role === teamContext.scribeRole) {
        return {
            allowed: true,
            readOnly: false,
            reason: null,
            roleSurface: 'scribe'
        };
    }

    if (role === ENUMS.ROLES.VIEWER && observerTeamId === teamContext.teamId) {
        return {
            allowed: true,
            readOnly: true,
            reason: null,
            roleSurface: 'viewer'
        };
    }

    if (role === ENUMS.ROLES.VIEWER) {
        return {
            allowed: false,
            readOnly: true,
            reason: 'observer-team-mismatch',
            observerTeamId
        };
    }

    return {
        allowed: false,
        readOnly: false,
        reason: 'role-mismatch'
    };
}

export class FacilitatorController {
    constructor() {
        this.actions = [];
        this.rfis = [];
        this.responses = [];
        this.receivedProposals = [];
        this.journalEntries = [];
        this.journalUpdates = [];
        this.verbaAiUpdates = [];
        this.timelineEvents = [];
        this.storeUnsubscribers = [];
        this.role = sessionStore.getRole();
        this.roleSurface = null;
        this.isReadOnly = false;
        this.teamContext = resolveTeamContext();
        this.teamId = this.teamContext.teamId;
        this.teamLabel = this.teamContext.teamLabel;
    }

    async init() {
        logger.info('Initializing Facilitator interface');

        const sessionId = sessionStore.getSessionId();
        if (!sessionId) {
            showToast({
                message: 'No session found. Please join a session first.',
                type: 'error'
            });
            setTimeout(() => {
                navigateToApp('');
            }, 2000);
            return;
        }

        this.role = sessionStore.getRole() || sessionStore.getSessionData()?.role;
        const observerTeamId = sessionStore.getSessionData()?.team || null;
        const accessState = getFacilitatorAccessState({
            role: this.role,
            teamContext: this.teamContext,
            observerTeamId
        });

        if (!accessState.allowed) {
            const redirectPath = accessState.reason === 'observer-team-mismatch' && accessState.observerTeamId
                ? getRoleRoute(ENUMS.ROLES.VIEWER, { observerTeamId: accessState.observerTeamId })
                : '';
            showToast({
                message: accessState.reason === 'observer-team-mismatch'
                    ? 'Observer access is limited to the team selected when you joined the session.'
                    : `This page is only available to the ${this.teamLabel} Facilitator or Scribe role.`,
                type: 'error'
            });
            navigateToApp(redirectPath || '', { replace: true });
            return;
        }

        this.isReadOnly = accessState.readOnly;
        this.roleSurface = accessState.roleSurface || null;

        await syncService.initialize(sessionId, {
            participantId: sessionStore.getSessionParticipantId?.() || null
        });
        this.configureAccessMode();
        this.bindEventListeners();
        this.subscribeToLiveData();
        this.syncActionsFromStore();
        this.syncRfisFromStore();
        this.syncResponsesFromStores();
        this.syncReceivedProposalsFromStore();
        this.syncWhiteCellUpdateSectionsFromStore();
        this.syncTimelineFromStore();

        logger.info('Facilitator interface initialized');
    }

    isAllowedRole(role) {
        return (
            role === this.teamContext.facilitatorRole
            || role === this.teamContext.scribeRole
            || role === ENUMS.ROLES.VIEWER
        );
    }

    isScribeSeat() {
        return (this.role || sessionStore.getRole()) === this.teamContext.scribeRole;
    }

    getCurrentLeadRole() {
        return this.isScribeSeat()
            ? this.teamContext.scribeRole
            : this.teamContext.facilitatorRole;
    }

    getCurrentLeadLabel() {
        return this.isScribeSeat()
            ? this.teamContext.scribeLabel
            : this.teamContext.facilitatorLabel;
    }

    getCurrentLeadSurfaceLabel() {
        return this.isScribeSeat() ? 'Scribe' : 'Facilitator';
    }

    configureAccessMode() {
        const roleLabel = document.getElementById('sessionRoleLabel');
        const notice = document.getElementById('facilitatorModeNotice');
        const writeControls = document.querySelectorAll('[data-write-control="true"]');
        const headerTitle = document.querySelector('.header-title');
        const captureNavItem = document.getElementById('captureNavItem');
        const captureSection = document.getElementById('captureSection');
        const actionsDescription = document.querySelector('#actionsSection .section-description');
        const requestsDescription = document.querySelector('#requestsSection .section-description');
        const responsesDescription = document.querySelector('#responsesSection .section-description');
        const journalDescription = document.querySelector('#tribeStreetJournalSection .section-description');
        const verbaAiDescription = document.querySelector('#verbaAiSection .section-description');
        const timelineDescription = document.querySelector('#timelineSection .section-description');

        document.body.dataset.facilitatorMode = this.isReadOnly
            ? 'observer'
            : (this.isScribeSeat() ? 'scribe' : 'facilitator');

        if (roleLabel) {
            roleLabel.textContent = this.isReadOnly ? 'Observer' : this.getCurrentLeadSurfaceLabel();
        }

        if (headerTitle) {
            headerTitle.textContent = this.isReadOnly
                ? this.teamContext.observerLabel
                : this.getCurrentLeadLabel();
        }

        writeControls.forEach((element) => {
            element.hidden = this.isReadOnly;
            element.toggleAttribute('aria-hidden', this.isReadOnly);

            element.querySelectorAll?.('button, input, select, textarea').forEach((control) => {
                control.disabled = this.isReadOnly;
                control.toggleAttribute('aria-disabled', this.isReadOnly);
            });
        });

        if (captureNavItem) {
            captureNavItem.hidden = this.isReadOnly;
        }

        if (captureSection && this.isReadOnly) {
            captureSection.style.display = 'none';
        }

        if (actionsDescription) {
            const isGreenProposalFlow = this.teamId === 'green';
            const isRedResponseFlow = this.teamId === 'red';
            if (this.isReadOnly) {
                if (isGreenProposalFlow) {
                    actionsDescription.textContent = 'Passive observer view of team proposals. Drafts are visible but cannot be created, edited, sent, or deleted.';
                } else if (isRedResponseFlow) {
                    actionsDescription.textContent = 'Passive observer view of move responses. Entries are visible but cannot be created, edited, submitted, or deleted.';
                } else {
                    actionsDescription.textContent = 'Passive observer view of facilitator actions. Drafts are visible but cannot be created, edited, submitted, or deleted.';
                }
            } else if (isGreenProposalFlow) {
                actionsDescription.textContent = 'Draft proposals and send them to the Blue or Red team.';
            } else if (isRedResponseFlow) {
                actionsDescription.textContent = 'Respond to Blue Team moves. White Cell reviews each response before it takes effect.';
            } else {
                actionsDescription.textContent = 'Draft actions, submit them to White Cell, and track adjudication results.';
            }
        }

        if (requestsDescription) {
            requestsDescription.textContent = this.isReadOnly
                ? 'Passive observer view of RFIs and responses. Request submission is disabled in observer mode.'
                : 'Submit questions to White Cell and monitor the response status.';
        }

        if (responsesDescription) {
            responsesDescription.textContent = this.isReadOnly
                ? 'Passive feed of White Cell responses to this team.'
                : 'View responses to your RFIs and communications';
        }

        if (journalDescription) {
            journalDescription.textContent = this.isReadOnly
                ? 'Passive feed of White Cell journal updates plus the latest team notes, moments, and quotes captured during the exercise.'
                : 'Review White Cell journal updates plus the latest team notes, moments, and quotes captured during the exercise.';
        }

        if (verbaAiDescription) {
            verbaAiDescription.textContent = this.isReadOnly
                ? 'Passive feed of White Cell Verba AI population sentiment updates.'
                : 'Review White Cell Verba AI population sentiment updates.';
        }

        if (timelineDescription) {
            timelineDescription.textContent = this.isReadOnly
                ? 'Passive session activity feed for the selected team.'
                : 'Chronological view of all events';
        }

        if (notice) {
            if (this.isReadOnly) {
                notice.style.display = 'block';
                notice.innerHTML = `
                    <h2 class="font-semibold mb-2">Observer Mode</h2>
                    <p class="text-sm text-gray-600">
                        This page is passive for the observer role. You can review facilitator actions,
                        White Cell responses, RFIs, and the timeline, but create, edit, submit, delete,
                        and capture paths are blocked in code and hidden in the interface.
                    </p>
                `;
            } else {
                notice.style.display = 'none';
                notice.innerHTML = '';
            }
        }
    }

    bindEventListeners() {
        const newActionBtn = document.getElementById('newActionBtn');
        const newRfiBtn = document.getElementById('newRfiBtn');
        const captureForm = document.getElementById('captureForm');

        if (this.isReadOnly) {
            newActionBtn?.setAttribute('aria-disabled', 'true');
            newRfiBtn?.setAttribute('aria-disabled', 'true');
            captureForm?.querySelectorAll?.('button, input, select, textarea').forEach((control) => {
                control.disabled = true;
                control.setAttribute('aria-disabled', 'true');
            });
            return;
        }

        newActionBtn?.addEventListener('click', () => this.showCreateActionModal());
        newRfiBtn?.addEventListener('click', () => this.showCreateRfiModal());
        captureForm?.addEventListener('submit', (event) => this.handleCaptureSubmit(event));

        const receivedProposalsList = document.getElementById('receivedProposalsList');
        receivedProposalsList?.addEventListener('click', (event) => {
            const button = event.target.closest('button[data-proposal-action]');
            if (!button || button.disabled) return;
            const action = button.dataset.proposalAction;
            const commId = button.dataset.proposalCommId;
            if (!action || !commId) return;
            const communication = this.receivedProposals.find((comm) => comm.id === commId);
            if (!communication) return;
            const result = this.handleReceivedProposalAction(action, communication);
            if (result && typeof result.catch === 'function') {
                result.catch((err) => {
                    logger.error('Failed to handle received proposal action:', err);
                });
            }
        });
    }

    requireWriteAccess() {
        if (!this.isReadOnly) {
            return true;
        }

        showToast({
            message: 'Observer mode is read-only on the facilitator page.',
            type: 'error'
        });
        return false;
    }

    getCurrentGameState() {
        return gameStateStore.getState() || sessionStore.getSessionData()?.gameState || {
            move: 1,
            phase: 1
        };
    }

    getBlueActionSequenceContext(action = null) {
        const gameState = this.getCurrentGameState();
        const move = action?.move || gameState.move || 1;
        const actionNumber = action?.id
            ? getActionSequenceNumber(this.actions, action)
            : getNextActionSequenceNumber(this.actions, this.teamId, move);

        return {
            move,
            actionNumber,
            label: formatActionSequenceLabel({
                teamLabel: this.teamLabel,
                move,
                actionNumber
            })
        };
    }

    subscribeToLiveData() {
        this.storeUnsubscribers.push(
            actionsStore.subscribe(() => {
                this.syncActionsFromStore();
            })
        );

        this.storeUnsubscribers.push(
            requestsStore.subscribe(() => {
                this.syncRfisFromStore();
                this.syncResponsesFromStores();
            })
        );

        this.storeUnsubscribers.push(
            communicationsStore.subscribe(() => {
                this.syncResponsesFromStores();
                this.syncReceivedProposalsFromStore();
                this.syncWhiteCellUpdateSectionsFromStore();
            })
        );

        this.storeUnsubscribers.push(
            timelineStore.subscribe(() => {
                this.syncTimelineFromStore();
            })
        );
    }

    syncActionsFromStore() {
        this.actions = actionsStore.getByTeam(this.teamId);
        this.renderActionsList();

        const badge = document.getElementById('actionsBadge');
        if (badge) {
            badge.textContent = this.actions.length.toString();
        }
    }

    syncRfisFromStore() {
        this.rfis = requestsStore.getByTeam(this.teamId);
        this.renderRfiList();

        const badge = document.getElementById('rfiBadge');
        if (badge) {
            badge.textContent = this.rfis.filter((request) => request.status === 'pending').length.toString();
        }
    }

    syncResponsesFromStores() {
        const answeredRfis = requestsStore.getByTeam(this.teamId)
            .filter((request) => request.status === 'answered' && request.response)
            .map((request) => ({
                id: request.id,
                kind: 'rfi',
                created_at: request.responded_at || request.updated_at || request.created_at,
                title: request.query || request.question || 'RFI response',
                content: request.response,
                status: request.status,
                priority: request.priority
            }));

        const directResponses = communicationsStore.getAll()
            .filter((communication) =>
                isWhiteCellCommunicationVisibleToLead(communication, this.teamContext)
                && communication?.type !== 'PROPOSAL_FORWARDED'
                && !getWhiteCellCommunicationUpdateKind(communication)
            )
            .map((communication) => ({
                id: communication.id,
                kind: 'communication',
                created_at: communication.created_at,
                title: this.formatCommunicationTarget(communication.to_role),
                content: communication.content,
                type: communication.type || 'MESSAGE'
            }));

        this.responses = [...answeredRfis, ...directResponses].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );

        this.renderResponsesList();
    }

    syncReceivedProposalsFromStore() {
        this.receivedProposals = communicationsStore.getAll()
            .filter((communication) => (
                communication?.type === 'PROPOSAL_FORWARDED'
                && isWhiteCellCommunicationVisibleToLead(communication, this.teamContext)
            ))
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        this.renderReceivedProposals();
    }

    syncWhiteCellUpdateSectionsFromStore() {
        const visibleWhiteCellCommunications = communicationsStore.getAll()
            .filter((communication) => isWhiteCellCommunicationVisibleToLead(communication, this.teamContext))
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        this.journalUpdates = visibleWhiteCellCommunications.filter((communication) => (
            isWhiteCellSectionUpdate(communication, WHITE_CELL_UPDATE_KINDS.TRIBE_STREET_JOURNAL)
        ));
        this.verbaAiUpdates = visibleWhiteCellCommunications.filter((communication) => (
            isWhiteCellSectionUpdate(communication, WHITE_CELL_UPDATE_KINDS.VERBA_AI_POPULATION_SENTIMENT)
        ));

        this.renderTribeStreetJournalList();
        this.renderVerbaAiList();
    }

    renderReceivedProposals() {
        const container = document.getElementById('receivedProposalsList');
        const badge = document.getElementById('receivedProposalsBadge');

        if (badge) {
            const unreadCount = countUnreadProposals(this.receivedProposals);
            badge.textContent = unreadCount;
            badge.hidden = unreadCount === 0;
        }

        if (!container) return;

        if (this.receivedProposals.length === 0) {
            container.innerHTML = '<p class="text-sm text-gray-500">No proposals received yet.</p>';
            return;
        }

        const escape = (value) => this.escapeHtml(value);
        const formatList = (values) => Array.isArray(values) && values.length
            ? values.join(', ')
            : 'Not specified';
        const statusChipColor = (status) => {
            switch (status) {
                case PROPOSAL_RECIPIENT_STATUSES.ACKNOWLEDGED: return 'var(--color-success)';
                case PROPOSAL_RECIPIENT_STATUSES.RESPONDED:    return 'var(--color-primary-500)';
                case PROPOSAL_RECIPIENT_STATUSES.DECLINED:     return 'var(--color-error)';
                case PROPOSAL_RECIPIENT_STATUSES.IGNORED:      return 'var(--color-text-muted)';
                case PROPOSAL_RECIPIENT_STATUSES.UNREAD:
                default:                                        return 'var(--color-info-600)';
            }
        };

        container.innerHTML = this.receivedProposals.map((communication) => {
            const metadata = communication?.metadata && typeof communication.metadata === 'object'
                ? communication.metadata
                : {};
            const snapshot = metadata.proposal && typeof metadata.proposal === 'object'
                ? metadata.proposal
                : {};
            const title = snapshot.title || 'Untitled proposal';
            const sourceTeam = metadata.source_team || 'green';
            const sourceLabel = sourceTeam === 'green' ? 'Green Team'
                : sourceTeam === 'blue' ? 'Blue Team'
                : sourceTeam === 'red' ? 'Red Team'
                : sourceTeam;
            const outcome = metadata.outcome || 'APPROVED';
            const receivedAt = communication.created_at;
            const status = getProposalRecipientStatus(communication);
            const statusLabel = formatProposalRecipientStatus(status);
            const isUnread = status === PROPOSAL_RECIPIENT_STATUSES.UNREAD;
            const cardId = escape(communication.id);

            return `
                <div class="card card-bordered" style="padding: var(--space-4); margin-bottom: var(--space-3); ${isUnread ? 'border-left: 3px solid var(--color-info-600);' : ''}">
                    <div style="display: flex; justify-content: space-between; gap: var(--space-3); align-items: flex-start; margin-bottom: var(--space-2);">
                        <div>
                            <p class="text-xs text-gray-500" style="margin: 0 0 2px; text-transform: uppercase; letter-spacing: 0.05em;">Forwarded from ${escape(sourceLabel)} · ${escape(outcome)}</p>
                            <h3 class="font-semibold" style="margin: 0;">${escape(title)}</h3>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0;">
                            <span style="font-size: var(--text-xs); font-weight: var(--font-semibold); text-transform: uppercase; letter-spacing: 0.05em; color: ${statusChipColor(status)};">${escape(statusLabel)}</span>
                            <span class="text-xs text-gray-400">${escape(formatRelativeTime(receivedAt))}</span>
                        </div>
                    </div>
                    <dl style="display: grid; grid-template-columns: auto 1fr; column-gap: var(--space-3); row-gap: 4px; margin: var(--space-3) 0; font-size: var(--text-sm);">
                        <dt style="color: var(--color-text-muted); font-weight: var(--font-semibold);">Originators</dt>
                        <dd style="margin: 0;">${escape(formatList(snapshot.originators))}</dd>
                        <dt style="color: var(--color-text-muted); font-weight: var(--font-semibold);">Category</dt>
                        <dd style="margin: 0;">${escape(snapshot.category || 'Not specified')}</dd>
                        <dt style="color: var(--color-text-muted); font-weight: var(--font-semibold);">Intended Partners</dt>
                        <dd style="margin: 0;">${escape(snapshot.intendedPartners || 'Not specified')}</dd>
                        <dt style="color: var(--color-text-muted); font-weight: var(--font-semibold);">Focus Sector</dt>
                        <dd style="margin: 0;">${escape(snapshot.focusSector || 'Not specified')}</dd>
                        <dt style="color: var(--color-text-muted); font-weight: var(--font-semibold);">Delivery</dt>
                        <dd style="margin: 0;">${escape(snapshot.delivery || 'Not specified')}</dd>
                    </dl>
                    ${snapshot.objective ? `
                        <p class="text-sm" style="margin: 0 0 var(--space-2);"><strong>Objective:</strong> ${escape(snapshot.objective)}</p>
                    ` : ''}
                    ${snapshot.timingAndConditions ? `
                        <p class="text-sm" style="margin: 0 0 var(--space-2);"><strong>Timing &amp; Conditions:</strong> ${escape(snapshot.timingAndConditions)}</p>
                    ` : ''}
                    ${snapshot.expectedOutcomes ? `
                        <p class="text-sm" style="margin: 0 0 var(--space-3);"><strong>Expected Outcomes:</strong> ${escape(snapshot.expectedOutcomes)}</p>
                    ` : ''}
                    <div style="display: flex; gap: var(--space-2); flex-wrap: wrap; padding-top: var(--space-3); border-top: 1px solid var(--color-border-light);">
                        <button type="button" class="btn btn-secondary btn-sm" data-proposal-action="acknowledge" data-proposal-comm-id="${cardId}">Acknowledge</button>
                        <button type="button" class="btn btn-primary btn-sm" data-proposal-action="respond" data-proposal-comm-id="${cardId}">Respond</button>
                        <button type="button" class="btn btn-secondary btn-sm" data-proposal-action="decline" data-proposal-comm-id="${cardId}">Decline</button>
                        <button type="button" class="btn btn-secondary btn-sm" data-proposal-action="ignore" data-proposal-comm-id="${cardId}">Ignore</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    async persistProposalRecipientStatus(communication, status, {
        timelineType,
        toastMessage,
        extraMetadata = {},
        successMessage = null
    } = {}) {
        if (!this.requireWriteAccess()) return false;
        if (!communication?.id) {
            showToast({ message: 'Proposal not found.', type: 'error' });
            return false;
        }

        let updatedCommunication = null;
        try {
            updatedCommunication = await database.updateProposalRecipientStatus(
                communication.id,
                status,
                extraMetadata
            );
            communicationsStore.updateFromServer('UPDATE', updatedCommunication);
        } catch (err) {
            logger.error('Failed to persist proposal recipient status:', err);
            showToast({ message: err.message || 'Failed to update proposal status', type: 'error' });
            return false;
        }

        if (timelineType) {
            try {
                const sessionId = sessionStore.getSessionId();
                const gameState = this.getCurrentGameState();
                const proposalTitle = updatedCommunication?.metadata?.proposal?.title
                    || communication?.metadata?.proposal?.title
                    || 'Untitled proposal';
                const timelineEvent = await database.createTimelineEvent({
                    session_id: sessionId,
                    type: timelineType,
                    content: `${successMessage || toastMessage || 'Proposal status updated'}: ${proposalTitle}`,
                    metadata: {
                        related_id: updatedCommunication?.metadata?.source_proposal_id
                            || communication?.metadata?.source_proposal_id
                            || null,
                        role: this.role || this.getCurrentLeadRole(),
                        communication_id: updatedCommunication?.id || communication.id,
                        recipient_team: this.teamId,
                        status,
                        ...extraMetadata
                    },
                    team: this.teamId,
                    move: gameState.move ?? 1,
                    phase: gameState.phase ?? 1
                });
                timelineStore.updateFromServer('INSERT', timelineEvent);
            } catch (err) {
                logger.error(`Failed to log ${status} timeline event:`, err);
            }
        }

        if (toastMessage) {
            showToast({ message: toastMessage, type: 'success' });
        }

        return true;
    }

    handleReceivedProposalAction(action, communication) {
        switch (action) {
            case 'acknowledge':
                return this.persistProposalRecipientStatus(communication, PROPOSAL_RECIPIENT_STATUSES.ACKNOWLEDGED, {
                    timelineType: 'PROPOSAL_ACKNOWLEDGED',
                    toastMessage: 'Proposal acknowledged'
                });
            case 'decline':
                return this.persistProposalRecipientStatus(communication, PROPOSAL_RECIPIENT_STATUSES.DECLINED, {
                    timelineType: 'PROPOSAL_DECLINED',
                    toastMessage: 'Proposal declined'
                });
            case 'ignore':
                return this.persistProposalRecipientStatus(communication, PROPOSAL_RECIPIENT_STATUSES.IGNORED, {
                    timelineType: 'PROPOSAL_IGNORED',
                    toastMessage: 'Proposal ignored'
                });
            case 'respond':
                return this.showProposalResponseModal(communication);
            default:
                return Promise.resolve(false);
        }
    }

    showProposalResponseModal(communication) {
        if (!this.requireWriteAccess()) return Promise.resolve(false);

        const proposalTitle = communication?.metadata?.proposal?.title || 'Untitled proposal';
        const content = document.createElement('div');
        content.innerHTML = `
            <form id="proposalResponseForm" novalidate>
                <p class="text-sm text-gray-500" style="margin: 0 0 var(--space-3);">
                    Responding to: <strong>${this.escapeHtml(proposalTitle)}</strong><br>
                    Your response will be sent to White Cell for review.
                </p>
                <div class="form-group">
                    <label class="form-label" for="proposalResponseText">Response *</label>
                    <textarea
                        id="proposalResponseText"
                        class="form-input form-textarea"
                        rows="5"
                        placeholder="Your response..."
                    ></textarea>
                </div>
            </form>
        `;

        const modalRef = { current: null };
        modalRef.current = showModal({
            title: 'Respond to Proposal',
            content,
            size: 'md',
            buttons: [
                { label: 'Cancel', variant: 'secondary', onClick: () => {} },
                {
                    label: 'Send Response',
                    variant: 'primary',
                    onClick: () => {
                        const text = content.querySelector('#proposalResponseText')?.value?.trim();
                        if (!text) {
                            showToast({ message: 'Response text is required.', type: 'error' });
                            return false;
                        }
                        this.submitProposalResponse(communication, text, modalRef.current).catch((err) => {
                            logger.error('Failed to send proposal response:', err);
                        });
                        return false;
                    }
                }
            ]
        });

        return Promise.resolve(true);
    }

    async submitProposalResponse(communication, text, modal) {
        const sessionId = sessionStore.getSessionId();
        if (!sessionId) {
            showToast({ message: 'No session found', type: 'error' });
            return;
        }

        const loader = showLoader({ message: 'Sending response...' });

        try {
            const gameState = this.getCurrentGameState();
            const proposalTitle = communication?.metadata?.proposal?.title || 'Untitled proposal';

            const responseComm = await database.createCommunication({
                session_id: sessionId,
                from_role: this.role || this.getCurrentLeadRole(),
                to_role: 'white_cell',
                type: 'PROPOSAL_RESPONSE',
                content: text,
                metadata: {
                    source_proposal_id: communication?.metadata?.source_proposal_id || null,
                    source_communication_id: communication.id,
                    source_team: communication?.metadata?.source_team || null,
                    responder_team: this.teamId
                }
            });
            communicationsStore.updateFromServer('INSERT', responseComm);

            const updatedProposalCommunication = await database.updateProposalRecipientStatus(
                communication.id,
                PROPOSAL_RECIPIENT_STATUSES.RESPONDED,
                {
                    response_communication_id: responseComm.id,
                    responded_at: new Date().toISOString()
                }
            );
            communicationsStore.updateFromServer('UPDATE', updatedProposalCommunication);

            const timelineEvent = await database.createTimelineEvent({
                session_id: sessionId,
                type: 'PROPOSAL_RESPONDED',
                content: `Responded to proposal: ${proposalTitle}`,
                metadata: {
                    related_id: communication?.metadata?.source_proposal_id || null,
                    role: this.role || this.getCurrentLeadRole(),
                    communication_id: communication.id,
                    response_communication_id: responseComm.id,
                    recipient_team: this.teamId,
                    status: PROPOSAL_RECIPIENT_STATUSES.RESPONDED
                },
                team: this.teamId,
                move: gameState.move ?? 1,
                phase: gameState.phase ?? 1
            });
            timelineStore.updateFromServer('INSERT', timelineEvent);

            showToast({ message: 'Response sent to White Cell', type: 'success' });
            modal?.close();
            this.renderReceivedProposals();
        } catch (err) {
            logger.error('Failed to send proposal response:', err);
            showToast({ message: err.message || 'Failed to send response', type: 'error' });
        } finally {
            hideLoader();
        }
    }

    syncTimelineFromStore() {
        const relevantEvents = timelineStore.getAll()
            .filter((event) => isWhiteCellTimelineEventVisibleToLead(event, this.teamContext))
            .slice(0, 50);

        this.timelineEvents = relevantEvents;
        this.journalEntries = buildTribeStreetJournalEntries(relevantEvents, this.teamId);

        this.renderTimeline();
        this.renderTribeStreetJournalList();
    }

    renderActionsList() {
        const actionsList = document.getElementById('actionsList');
        if (!actionsList) return;

        if (this.actions.length === 0) {
            actionsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" focusable="false">
                            <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
                        </svg>
                    </div>
                    <h3 class="empty-state-title">No Actions Yet</h3>
                    <p class="empty-state-message">
                        ${this.isReadOnly
                            ? 'No facilitator actions have been created yet.'
                            : 'Create your first strategic action to start the draft to White Cell review flow.'}
                    </p>
                </div>
            `;
            return;
        }

        actionsList.innerHTML = this.actions.map((action) => this.renderActionCard(action)).join('');

        actionsList.querySelectorAll('.edit-action-btn').forEach((button) => {
            button.addEventListener('click', () => {
                const action = this.actions.find((candidate) => candidate.id === button.dataset.actionId);
                if (action) {
                    this.showEditActionModal(action);
                }
            });
        });

        actionsList.querySelectorAll('.submit-action-btn').forEach((button) => {
            button.addEventListener('click', () => {
                const action = this.actions.find((candidate) => candidate.id === button.dataset.actionId);
                if (action) {
                    this.confirmSubmitAction(action);
                }
            });
        });

        actionsList.querySelectorAll('.delete-action-btn').forEach((button) => {
            button.addEventListener('click', () => {
                const action = this.actions.find((candidate) => candidate.id === button.dataset.actionId);
                if (action) {
                    this.confirmDeleteAction(action);
                }
            });
        });
    }

    renderActionCard(action) {
        const blueAction = getBlueActionViewModel(action);
        const title = blueAction.title;
        const expectedOutcomes = blueAction.expectedOutcomes || 'No expected outcomes';
        const targetLabel = formatBlueActionSelection(blueAction.focusCountries);
        const sequenceLabel = this.isBlueTeamActionWizardEnabled(action)
            ? this.getBlueActionSequenceContext(action).label
            : `Move ${action.move || 1} | Phase ${action.phase || 1}`;
        const status = action.status || ENUMS.ACTION_STATUS.DRAFT;
        const canManageDraft = !this.isReadOnly && canEditAction(action);
        const canSubmitDraft = !this.isReadOnly && canSubmitAction(action);
        const canRemoveDraft = !this.isReadOnly && canDeleteAction(action);
        const outcomeBadge = action.outcome
            ? createOutcomeBadge(action.outcome).outerHTML
            : '';
        const secondaryBadge = blueAction.hasBlueActionDetails && blueAction.enforcementTimeline
            ? createBadge({
                text: blueAction.enforcementTimeline,
                variant: 'info',
                size: 'sm',
                rounded: true
            }).outerHTML
            : createPriorityBadge(action.priority || 'NORMAL').outerHTML;
        const detailsMarkup = blueAction.hasBlueActionDetails
            ? `
                ${blueAction.objective ? `
                    <p class="text-xs text-gray-500" style="margin-bottom: var(--space-2);">
                        <strong>Objective:</strong> ${this.escapeHtml(blueAction.objective)}
                    </p>
                ` : ''}
                <p class="text-xs text-gray-500" style="margin-bottom: var(--space-2);">
                    <strong>Lever:</strong> ${this.escapeHtml(blueAction.lever || 'Not specified')} |
                    <strong>Implementation:</strong> ${this.escapeHtml(blueAction.implementation || 'Not specified')} |
                    <strong>Supply Chain Focus:</strong> ${this.escapeHtml(blueAction.supplyChainFocus || 'Not specified')}
                </p>
                <p class="text-xs text-gray-500">
                    <strong>Focus Countries:</strong> ${this.escapeHtml(targetLabel)} |
                    <strong>Sector:</strong> ${this.escapeHtml(blueAction.sector || 'Not specified')} |
                    <strong>Timeline:</strong> ${this.escapeHtml(blueAction.enforcementTimeline || 'Not specified')}
                </p>
                <p class="text-xs text-gray-500" style="margin-top: var(--space-2);">
                    <strong>Coordinated:</strong> ${this.escapeHtml(formatBlueActionSelection(blueAction.coordinated, 'None selected'))} |
                    <strong>Informed:</strong> ${this.escapeHtml(formatBlueActionSelection(blueAction.informed, 'None selected'))}
                </p>
            `
            : `
                ${action.ally_contingencies ? `
                    <p class="text-xs text-gray-500" style="margin-bottom: var(--space-2);">
                        <strong>Ally Contingencies:</strong> ${this.escapeHtml(action.ally_contingencies)}
                    </p>
                ` : ''}
                <p class="text-xs text-gray-500">
                    <strong>Targets:</strong> ${this.escapeHtml(targetLabel)} |
                    <strong>Sector:</strong> ${this.escapeHtml(action.sector || 'Not specified')} |
                    <strong>Exposure:</strong> ${this.escapeHtml(action.exposure_type || 'Not specified')}
                </p>
            `;

        let lifecycleMessage = `
            <p class="text-xs text-gray-500" style="margin-top: var(--space-3);">
                Draft actions can be edited, submitted, or deleted by the active team-lead seat.
            </p>
        `;

        if (isSubmittedAction(action)) {
            lifecycleMessage = `
                <p class="text-xs text-gray-500" style="margin-top: var(--space-3);">
                    Submitted to White Cell ${action.submitted_at ? formatRelativeTime(action.submitted_at) : ''}.
                    This action is now read-only for facilitator and scribe seats until adjudication.
                </p>
            `;
        } else if (isAdjudicatedAction(action)) {
            lifecycleMessage = `
                <p class="text-xs text-gray-500" style="margin-top: var(--space-3);">
                    White Cell adjudicated this action ${action.adjudicated_at ? formatRelativeTime(action.adjudicated_at) : ''}.
                </p>
            `;
        } else if (this.isReadOnly) {
            lifecycleMessage = `
                <p class="text-xs text-gray-500" style="margin-top: var(--space-3);">
                    Observer mode is read-only. Draft actions are visible but cannot be changed from this page.
                </p>
            `;
        }

        return `
            <div class="card card-bordered" data-action-id="${action.id}" style="padding: var(--space-4); margin-bottom: var(--space-3);">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-3); margin-bottom: var(--space-3);">
                    <div>
                        <h3 class="card-title">${this.escapeHtml(title)}</h3>
                        <p class="card-subtitle text-sm text-gray-500">
                            ${this.escapeHtml(action.mechanism || 'No mechanism')} | ${this.escapeHtml(sequenceLabel)}
                        </p>
                    </div>
                    <div style="display: flex; gap: var(--space-2); flex-wrap: wrap; justify-content: flex-end;">
                        ${createStatusBadge(status).outerHTML}
                        ${secondaryBadge}
                        ${outcomeBadge}
                    </div>
                </div>

                <div class="card-body">
                    <p class="text-sm mb-3">${this.escapeHtml(expectedOutcomes)}</p>
                    ${detailsMarkup}
                    ${action.adjudication_notes ? `
                        <p class="text-xs text-gray-500" style="margin-top: var(--space-2);">
                            <strong>Adjudication Notes:</strong> ${this.escapeHtml(action.adjudication_notes)}
                        </p>
                    ` : ''}
                    ${lifecycleMessage}
                </div>

                ${(canManageDraft || canSubmitDraft || canRemoveDraft) ? `
                    <div class="card-actions" style="display: flex; gap: var(--space-2); margin-top: var(--space-3);">
                        ${canManageDraft ? `
                            <button class="btn btn-secondary btn-sm edit-action-btn" data-action-id="${action.id}">
                                Edit Draft
                            </button>
                        ` : ''}
                        ${canSubmitDraft ? `
                            <button class="btn btn-primary btn-sm submit-action-btn" data-action-id="${action.id}">
                                Submit to White Cell
                            </button>
                        ` : ''}
                        ${canRemoveDraft ? `
                            <button class="btn btn-ghost btn-sm text-error delete-action-btn" data-action-id="${action.id}">
                                Delete Draft
                            </button>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }

    showCreateActionModal() {
        if (!this.requireWriteAccess()) return;

        if (this.isBlueTeamActionWizardEnabled()) {
            this.showBlueActionWizard();
            return;
        }

        if (this.isGreenTeamProposalEnabled()) {
            this.showGreenProposalModal();
            return;
        }

        if (this.isRedTeamResponseEnabled()) {
            this.showRedResponseModal();
            return;
        }

        const content = this.createActionFormContent();
        const modalRef = { current: null };

        modalRef.current = showModal({
            title: 'Create New Action',
            content,
            size: 'lg',
            buttons: [
                {
                    label: 'Cancel',
                    variant: 'secondary',
                    onClick: () => {}
                },
                {
                    label: 'Save Draft',
                    variant: 'primary',
                    onClick: () => {
                        this.handleCreateAction(modalRef.current).catch((err) => {
                            logger.error('Failed to create action:', err);
                        });
                        return false;
                    }
                }
            ]
        });
    }

    showEditActionModal(action) {
        if (!this.requireWriteAccess()) return;
        if (!canEditAction(action)) {
            showToast({ message: 'Only draft actions can be edited.', type: 'error' });
            return;
        }

        if (this.isBlueTeamActionWizardEnabled(action)) {
            this.showBlueActionWizard(action);
            return;
        }

        if (this.isGreenTeamProposalEnabled(action)) {
            this.showGreenProposalModal(action);
            return;
        }

        if (this.isRedTeamResponseEnabled(action)) {
            this.showRedResponseModal(action);
            return;
        }

        const content = this.createActionFormContent(action);
        const modalRef = { current: null };

        modalRef.current = showModal({
            title: 'Edit Draft Action',
            content,
            size: 'lg',
            buttons: [
                {
                    label: 'Cancel',
                    variant: 'secondary',
                    onClick: () => {}
                },
                {
                    label: 'Save Changes',
                    variant: 'primary',
                    onClick: () => {
                        this.handleUpdateAction(modalRef.current, action.id).catch((err) => {
                            logger.error('Failed to update action:', err);
                        });
                        return false;
                    }
                }
            ]
        });
    }

    isBlueTeamActionWizardEnabled(action = null) {
        return this.teamId === 'blue' && (!action || !action.team || action.team === this.teamId);
    }

    isGreenTeamProposalEnabled(action = null) {
        return this.teamId === 'green' && (!action || !action.team || action.team === this.teamId);
    }

    isRedTeamResponseEnabled(action = null) {
        return this.teamId === 'red' && (!action || !action.team || action.team === this.teamId);
    }

    showRedResponseModal(action = null) {
        const isEdit = Boolean(action?.id);
        const content = this.createRedResponseContent(action || {}, { isEdit });
        const modalRef = { current: null };

        modalRef.current = showModal({
            title: isEdit ? 'Edit Move Response' : 'New Move Response',
            content,
            size: 'xl'
        });

        this.bindRedResponseModal(content, modalRef.current, {
            actionId: action?.id || null,
            isEdit
        });
    }

    createRedResponseContent(action = {}, { isEdit = false } = {}) {
        const content = document.createElement('div');
        const viewModel = getMoveResponseViewModel(action);
        const titleValue = viewModel.title === 'Untitled response' ? '' : viewModel.title;

        content.innerHTML = `
            <form id="redResponseForm" novalidate>
                <div class="form-group">
                    <label class="form-label" for="responseTitle">Response Title *</label>
                    <input
                        id="responseTitle"
                        class="form-input"
                        type="text"
                        placeholder="Enter a concise title for this response"
                        value="${this.escapeHtml(titleValue)}"
                        maxlength="200"
                    >
                </div>

                <div class="form-group">
                    <label class="form-label" for="responseStrategicAssessment">Strategic Assessment *</label>
                    <textarea
                        id="responseStrategicAssessment"
                        class="form-input form-textarea"
                        rows="4"
                        placeholder="What is Blue (and partners) trying to achieve this move? What patterns, priorities, or vulnerabilities do you assess?"
                    >${this.escapeHtml(viewModel.strategicAssessment)}</textarea>
                </div>

                <div class="form-group">
                    <label class="form-label" for="responseStrategy">Response Strategy *</label>
                    <textarea
                        id="responseStrategy"
                        class="form-input form-textarea"
                        rows="3"
                        placeholder="What is your overarching approach this move? (Deter, Disrupt, Shape, etc.)"
                    >${this.escapeHtml(viewModel.responseStrategy)}</textarea>
                </div>

                <div class="form-group">
                    <label class="form-label" for="responseKeyActions">Key Actions *</label>
                    <textarea
                        id="responseKeyActions"
                        class="form-input form-textarea"
                        rows="4"
                        placeholder="What specific actions are you taking in response?"
                    >${this.escapeHtml(viewModel.keyActions)}</textarea>
                </div>

                <div class="form-group">
                    <label class="form-label" for="responseTargets">Targets / Pressure Points *</label>
                    <textarea
                        id="responseTargets"
                        class="form-input form-textarea"
                        rows="3"
                        placeholder="Who or what are you trying to influence?"
                    >${this.escapeHtml(viewModel.targetsAndPressurePoints)}</textarea>
                </div>

                <div class="form-group">
                    <label class="form-label" for="responseDeliveryChannel">Delivery Channel *</label>
                    <textarea
                        id="responseDeliveryChannel"
                        class="form-input form-textarea"
                        rows="3"
                        placeholder="How are these actions executed? (state policy, informal pressure, misinformation)"
                    >${this.escapeHtml(viewModel.deliveryChannel)}</textarea>
                </div>

                <div class="form-group">
                    <label class="form-label" for="responseExpectedEffect">Expected Effect &amp; System Impact *</label>
                    <textarea
                        id="responseExpectedEffect"
                        class="form-input form-textarea"
                        rows="4"
                        placeholder="What outcomes do you expect, and how do they interact with BLUE / GREEN actors?"
                    >${this.escapeHtml(viewModel.expectedEffect)}</textarea>
                </div>

                <div style="display: flex; justify-content: space-between; gap: var(--space-3); margin-top: var(--space-6); padding-top: var(--space-4); border-top: 1px solid var(--color-border);">
                    <button type="button" class="btn btn-secondary" data-response-nav="cancel">Cancel</button>
                    <button type="button" class="btn btn-primary" data-response-nav="submit">
                        ${isEdit ? 'Save Changes' : 'Submit for White Cell Review'}
                    </button>
                </div>
            </form>
        `;

        return content;
    }

    bindRedResponseModal(content, modal, { actionId = null, isEdit = false } = {}) {
        const form = content.querySelector('#redResponseForm');

        content.querySelector('[data-response-nav="cancel"]')?.addEventListener('click', () => {
            modal?.close();
        });

        content.querySelector('[data-response-nav="submit"]')?.addEventListener('click', () => {
            this.submitRedResponse(modal, form, { actionId, isEdit }).catch((err) => {
                logger.error('Failed to submit Red Team move response:', err);
            });
        });

        form.querySelector('#responseTitle')?.focus?.();
    }

    getRedResponseData(form) {
        return {
            title: form.querySelector('#responseTitle')?.value?.trim() || '',
            strategicAssessment: form.querySelector('#responseStrategicAssessment')?.value?.trim() || '',
            responseStrategy: form.querySelector('#responseStrategy')?.value?.trim() || '',
            keyActions: form.querySelector('#responseKeyActions')?.value?.trim() || '',
            targetsAndPressurePoints: form.querySelector('#responseTargets')?.value?.trim() || '',
            deliveryChannel: form.querySelector('#responseDeliveryChannel')?.value?.trim() || '',
            expectedEffect: form.querySelector('#responseExpectedEffect')?.value?.trim() || ''
        };
    }

    validateRedResponse(data) {
        if (!data.title) return 'Response Title is required.';
        if (!data.strategicAssessment) return 'Strategic Assessment is required.';
        if (!data.responseStrategy) return 'Response Strategy is required.';
        if (!data.keyActions) return 'Key Actions is required.';
        if (!data.targetsAndPressurePoints) return 'Targets / Pressure Points is required.';
        if (!data.deliveryChannel) return 'Delivery Channel is required.';
        if (!data.expectedEffect) return 'Expected Effect & System Impact is required.';
        return null;
    }

    buildRedResponsePayload(data) {
        return {
            goal: data.title,
            mechanism: null,
            sector: null,
            exposure_type: null,
            priority: 'NORMAL',
            targets: [],
            expected_outcomes: data.expectedEffect,
            ally_contingencies: serializeMoveResponseDetails({
                strategicAssessment: data.strategicAssessment,
                responseStrategy: data.responseStrategy,
                keyActions: data.keyActions,
                targetsAndPressurePoints: data.targetsAndPressurePoints,
                deliveryChannel: data.deliveryChannel
            })
        };
    }

    async submitRedResponse(modal, form, { actionId = null, isEdit = false } = {}) {
        if (!this.requireWriteAccess()) return;

        const data = this.getRedResponseData(form);
        const error = this.validateRedResponse(data);
        if (error) {
            showToast({ message: error, type: 'error' });
            return;
        }

        const sessionId = sessionStore.getSessionId();
        if (!sessionId) {
            showToast({ message: 'No session found', type: 'error' });
            return;
        }

        const loader = showLoader({ message: 'Submitting response for White Cell review...' });

        try {
            const gameState = this.getCurrentGameState();
            const payload = this.buildRedResponsePayload(data);

            let action;
            if (isEdit && actionId) {
                action = await database.updateDraftAction(actionId, payload);
                actionsStore.updateFromServer('UPDATE', action);
            } else {
                action = await database.createAction({
                    ...payload,
                    session_id: sessionId,
                    client_id: sessionStore.getClientId(),
                    team: this.teamId,
                    status: ENUMS.ACTION_STATUS.SUBMITTED,
                    move: gameState.move ?? 1,
                    phase: gameState.phase ?? 1
                });
                actionsStore.updateFromServer('INSERT', action);
            }

            const timelineEvent = await database.createTimelineEvent({
                session_id: sessionId,
                type: 'ACTION_SUBMITTED',
                content: `Move response submitted for White Cell review: ${action.goal || 'Untitled response'}`,
                metadata: {
                    related_id: action.id,
                    role: this.role || this.getCurrentLeadRole(),
                    move_response: true,
                    review_stage: 'white_cell_review'
                },
                team: this.teamId,
                move: action.move ?? gameState.move ?? 1,
                phase: action.phase ?? gameState.phase ?? 1
            });
            timelineStore.updateFromServer('INSERT', timelineEvent);

            showToast({
                message: isEdit
                    ? 'Move response updated.'
                    : 'Move response submitted for White Cell review.',
                type: 'success'
            });
            modal?.close();
        } catch (err) {
            logger.error('Failed to submit Red move response:', err);
            showToast({ message: err.message || 'Failed to submit response', type: 'error' });
        } finally {
            hideLoader();
        }
    }

    showGreenProposalModal(action = null) {
        const isEdit = Boolean(action?.id);
        const content = this.createGreenProposalContent(action || {}, { isEdit });
        const modalRef = { current: null };

        modalRef.current = showModal({
            title: isEdit ? 'Edit Proposal' : 'New Proposal',
            content,
            size: 'xl'
        });

        this.bindGreenProposalModal(content, modalRef.current, {
            actionId: action?.id || null,
            isEdit
        });
    }

    createGreenProposalContent(action = {}, { isEdit = false } = {}) {
        const content = document.createElement('div');
        const viewModel = getProposalViewModel(action);

        const categoryIsCustom = Boolean(viewModel.category)
            && !PROPOSAL_CATEGORIES.includes(viewModel.category);
        const sectorIsCustom = Boolean(viewModel.focusSector)
            && !PROPOSAL_SECTORS.includes(viewModel.focusSector);
        const deliveryIsCustom = Boolean(viewModel.delivery)
            && !PROPOSAL_DELIVERIES.includes(viewModel.delivery);

        const categorySelectValue = categoryIsCustom ? 'Other' : (viewModel.category || '');
        const sectorSelectValue = sectorIsCustom ? 'Other' : (viewModel.focusSector || '');
        const deliverySelectValue = deliveryIsCustom ? 'Other' : (viewModel.delivery || '');

        const renderOptions = (values, selectedValue = '', placeholder = 'Select an option') => `
            <option value="">${placeholder}</option>
            ${values.map((value) => `
                <option value="${value}" ${selectedValue === value ? 'selected' : ''}>${value}</option>
            `).join('')}
        `;

        const renderOriginatorCheckbox = (value) => {
            const inputId = `proposalOriginator${value.replace(/[^a-z0-9]+/gi, '')}`;
            return `
                <label class="form-check" for="${inputId}">
                    <input
                        id="${inputId}"
                        class="form-checkbox"
                        type="checkbox"
                        data-proposal-originator="true"
                        value="${value}"
                        ${viewModel.originators.includes(value) ? 'checked' : ''}
                    >
                    <span class="form-check-label">${value}</span>
                </label>
            `;
        };

        content.innerHTML = `
            <form id="greenProposalForm" novalidate>
                <div class="form-group">
                    <label class="form-label" for="proposalTitle">Proposal Title *</label>
                    <input
                        id="proposalTitle"
                        class="form-input"
                        type="text"
                        value="${this.escapeHtml(viewModel.title === 'Untitled proposal' ? '' : viewModel.title)}"
                        maxlength="200"
                    >
                </div>

                <div class="form-group">
                    <span class="form-label">Originator *</span>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--space-2);">
                        ${PROPOSAL_ORIGINATORS.map(renderOriginatorCheckbox).join('')}
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="proposalObjective">Objective *</label>
                    <textarea
                        id="proposalObjective"
                        class="form-input form-textarea"
                        rows="3"
                    >${this.escapeHtml(viewModel.objective)}</textarea>
                </div>

                <div class="section-grid section-grid-2">
                    <div class="form-group">
                        <label class="form-label" for="proposalCategory">Proposal Category *</label>
                        <select
                            id="proposalCategory"
                            class="form-select"
                            data-proposal-other-target="proposalCategoryOther"
                        >
                            ${renderOptions(PROPOSAL_CATEGORIES, categorySelectValue, 'Select category')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="proposalIntendedPartners">Intended Partner(s) *</label>
                        <input
                            id="proposalIntendedPartners"
                            class="form-input"
                            type="text"
                            placeholder="Country(s) or alliance(s)"
                            value="${this.escapeHtml(viewModel.intendedPartners)}"
                            maxlength="200"
                        >
                    </div>
                </div>

                <div
                    class="form-group"
                    id="proposalCategoryOtherGroup"
                    ${categorySelectValue === 'Other' ? '' : 'hidden'}
                >
                    <label class="form-label" for="proposalCategoryOther">Other Category *</label>
                    <input
                        id="proposalCategoryOther"
                        class="form-input"
                        type="text"
                        value="${this.escapeHtml(categoryIsCustom ? viewModel.category : '')}"
                        maxlength="120"
                    >
                </div>

                <div class="section-grid section-grid-2">
                    <div class="form-group">
                        <label class="form-label" for="proposalFocusSector">Focus Sector(s) *</label>
                        <select
                            id="proposalFocusSector"
                            class="form-select"
                            data-proposal-other-target="proposalFocusSectorOther"
                        >
                            ${renderOptions(PROPOSAL_SECTORS, sectorSelectValue, 'Select sector')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="proposalDelivery">Delivery *</label>
                        <select
                            id="proposalDelivery"
                            class="form-select"
                            data-proposal-other-target="proposalDeliveryOther"
                        >
                            ${renderOptions(PROPOSAL_DELIVERIES, deliverySelectValue, 'Select delivery')}
                        </select>
                    </div>
                </div>

                <div
                    class="form-group"
                    id="proposalFocusSectorOtherGroup"
                    ${sectorSelectValue === 'Other' ? '' : 'hidden'}
                >
                    <label class="form-label" for="proposalFocusSectorOther">Other Sector *</label>
                    <input
                        id="proposalFocusSectorOther"
                        class="form-input"
                        type="text"
                        value="${this.escapeHtml(sectorIsCustom ? viewModel.focusSector : '')}"
                        maxlength="120"
                    >
                </div>

                <div
                    class="form-group"
                    id="proposalDeliveryOtherGroup"
                    ${deliverySelectValue === 'Other' ? '' : 'hidden'}
                >
                    <label class="form-label" for="proposalDeliveryOther">Other Delivery *</label>
                    <input
                        id="proposalDeliveryOther"
                        class="form-input"
                        type="text"
                        value="${this.escapeHtml(deliveryIsCustom ? viewModel.delivery : '')}"
                        maxlength="120"
                    >
                </div>

                <div class="form-group">
                    <label class="form-label" for="proposalTimingConditions">Timing &amp; Conditions *</label>
                    <textarea
                        id="proposalTimingConditions"
                        class="form-input form-textarea"
                        rows="3"
                        placeholder="When does this take effect, and under what conditions?"
                    >${this.escapeHtml(viewModel.timingAndConditions)}</textarea>
                </div>

                <div class="form-group">
                    <label class="form-label" for="proposalExpectedOutcomes">Expected Outcome(s) &amp; Duration Assessment *</label>
                    <textarea
                        id="proposalExpectedOutcomes"
                        class="form-input form-textarea"
                        rows="4"
                        placeholder="Expected effect outcome(s) and short / long term duration assessment"
                    >${this.escapeHtml(viewModel.expectedOutcomes)}</textarea>
                </div>

                <div style="display: flex; justify-content: space-between; gap: var(--space-3); margin-top: var(--space-6); padding-top: var(--space-4); border-top: 1px solid var(--color-border);">
                    <button type="button" class="btn btn-secondary" data-proposal-nav="cancel">Cancel</button>
                    <div style="display: flex; gap: var(--space-3); flex-wrap: wrap; justify-content: flex-end;">
                        <button type="button" class="btn btn-primary" data-proposal-nav="sendBlue">Send to Blue Team</button>
                        <button type="button" class="btn btn-primary" data-proposal-nav="sendRed">Send to Red Team</button>
                    </div>
                </div>
            </form>
        `;

        return content;
    }

    bindGreenProposalModal(content, modal, { actionId = null, isEdit = false } = {}) {
        const form = content.querySelector('#greenProposalForm');

        const bindOtherToggle = (selectId, groupId, inputId) => {
            const select = form.querySelector(`#${selectId}`);
            const group = form.querySelector(`#${groupId}`);
            const input = form.querySelector(`#${inputId}`);
            if (!select || !group) return;

            select.addEventListener('change', () => {
                const showOther = select.value === 'Other';
                group.hidden = !showOther;
                if (!showOther && input) input.value = '';
            });
        };

        bindOtherToggle('proposalCategory', 'proposalCategoryOtherGroup', 'proposalCategoryOther');
        bindOtherToggle('proposalFocusSector', 'proposalFocusSectorOtherGroup', 'proposalFocusSectorOther');
        bindOtherToggle('proposalDelivery', 'proposalDeliveryOtherGroup', 'proposalDeliveryOther');

        content.querySelector('[data-proposal-nav="cancel"]')?.addEventListener('click', () => {
            modal?.close();
        });

        content.querySelector('[data-proposal-nav="sendBlue"]')?.addEventListener('click', () => {
            this.submitGreenProposal(modal, form, { recipientTeam: 'blue', actionId, isEdit }).catch((err) => {
                logger.error('Failed to send proposal to Blue Team:', err);
            });
        });

        content.querySelector('[data-proposal-nav="sendRed"]')?.addEventListener('click', () => {
            this.submitGreenProposal(modal, form, { recipientTeam: 'red', actionId, isEdit }).catch((err) => {
                logger.error('Failed to send proposal to Red Team:', err);
            });
        });

        form.querySelector('#proposalTitle')?.focus?.();
    }

    getGreenProposalData(form) {
        const originators = Array.from(
            form.querySelectorAll('[data-proposal-originator="true"]:checked')
        ).map((checkbox) => checkbox.value);

        const categorySelect = form.querySelector('#proposalCategory')?.value || '';
        const categoryOther = form.querySelector('#proposalCategoryOther')?.value?.trim() || '';
        const sectorSelect = form.querySelector('#proposalFocusSector')?.value || '';
        const sectorOther = form.querySelector('#proposalFocusSectorOther')?.value?.trim() || '';
        const deliverySelect = form.querySelector('#proposalDelivery')?.value || '';
        const deliveryOther = form.querySelector('#proposalDeliveryOther')?.value?.trim() || '';

        return {
            title: form.querySelector('#proposalTitle')?.value?.trim() || '',
            originators,
            objective: form.querySelector('#proposalObjective')?.value?.trim() || '',
            categorySelect,
            categoryOther,
            category: categorySelect === 'Other' ? categoryOther : categorySelect,
            intendedPartners: form.querySelector('#proposalIntendedPartners')?.value?.trim() || '',
            sectorSelect,
            sectorOther,
            focusSector: sectorSelect === 'Other' ? sectorOther : sectorSelect,
            deliverySelect,
            deliveryOther,
            delivery: deliverySelect === 'Other' ? deliveryOther : deliverySelect,
            timingAndConditions: form.querySelector('#proposalTimingConditions')?.value?.trim() || '',
            expectedOutcomes: form.querySelector('#proposalExpectedOutcomes')?.value?.trim() || ''
        };
    }

    validateGreenProposal(data) {
        if (!data.title) return 'Proposal Title is required.';
        if (!data.originators.length) return 'Select at least one Originator.';
        if (!data.objective) return 'Objective is required.';
        if (!data.categorySelect) return 'Proposal Category is required.';
        if (data.categorySelect === 'Other' && !data.categoryOther) return 'Please enter the custom category.';
        if (!data.intendedPartners) return 'Intended Partner(s) is required.';
        if (!data.sectorSelect) return 'Focus Sector is required.';
        if (data.sectorSelect === 'Other' && !data.sectorOther) return 'Please enter the custom sector.';
        if (!data.deliverySelect) return 'Delivery is required.';
        if (data.deliverySelect === 'Other' && !data.deliveryOther) return 'Please enter the custom delivery.';
        if (!data.timingAndConditions) return 'Timing & Conditions is required.';
        if (!data.expectedOutcomes) return 'Expected Outcome(s) is required.';
        return null;
    }

    buildGreenProposalPayload(data, { recipientTeam }) {
        return {
            goal: data.title,
            mechanism: null,
            sector: data.focusSector,
            exposure_type: null,
            priority: 'NORMAL',
            targets: [],
            expected_outcomes: data.expectedOutcomes,
            ally_contingencies: serializeProposalDetails({
                originators: data.originators,
                objective: data.objective,
                category: data.category,
                intendedPartners: data.intendedPartners,
                delivery: data.delivery,
                timingAndConditions: data.timingAndConditions,
                recipientTeam
            })
        };
    }

    async submitGreenProposal(modal, form, { recipientTeam, actionId = null, isEdit = false } = {}) {
        if (!this.requireWriteAccess()) return;

        const data = this.getGreenProposalData(form);
        const error = this.validateGreenProposal(data);
        if (error) {
            showToast({ message: error, type: 'error' });
            return;
        }

        const sessionId = sessionStore.getSessionId();
        if (!sessionId) {
            showToast({ message: 'No session found', type: 'error' });
            return;
        }

        const recipientLabel = recipientTeam === 'blue' ? 'Blue Team' : 'Red Team';
        const loader = showLoader({ message: `Submitting proposal for White Cell review...` });

        try {
            const gameState = this.getCurrentGameState();
            const payload = this.buildGreenProposalPayload(data, { recipientTeam });

            let action;
            if (isEdit && actionId) {
                action = await database.updateDraftAction(actionId, payload);
                actionsStore.updateFromServer('UPDATE', action);
            } else {
                action = await database.createAction({
                    ...payload,
                    session_id: sessionId,
                    client_id: sessionStore.getClientId(),
                    team: this.teamId,
                    status: ENUMS.ACTION_STATUS.SUBMITTED,
                    move: gameState.move ?? 1,
                    phase: gameState.phase ?? 1
                });
                actionsStore.updateFromServer('INSERT', action);
            }

            const timelineEvent = await database.createTimelineEvent({
                session_id: sessionId,
                type: 'ACTION_SUBMITTED',
                content: `Proposal submitted for White Cell review (intended recipient: ${recipientLabel}): ${action.goal || 'Untitled proposal'}`,
                metadata: {
                    related_id: action.id,
                    role: this.role || this.getCurrentLeadRole(),
                    recipient_team: recipientTeam,
                    proposal: true,
                    review_stage: 'white_cell_review'
                },
                team: this.teamId,
                move: action.move ?? gameState.move ?? 1,
                phase: action.phase ?? gameState.phase ?? 1
            });
            timelineStore.updateFromServer('INSERT', timelineEvent);

            showToast({
                message: `Proposal submitted for White Cell review. It will be forwarded to ${recipientLabel} once approved.`,
                type: 'success'
            });
            modal?.close();
        } catch (err) {
            logger.error('Failed to send proposal:', err);
            showToast({ message: err.message || 'Failed to submit proposal', type: 'error' });
        } finally {
            hideLoader();
        }
    }

    showBlueActionWizard(action = null) {
        const isEdit = Boolean(action?.id);
        const sequenceContext = this.getBlueActionSequenceContext(action);
        const content = this.createBlueActionWizardContent(action || {}, {
            isEdit,
            sequenceContext
        });
        const modalRef = { current: null };

        modalRef.current = showModal({
            title: isEdit ? 'Edit Blue Team Action' : 'Take Action',
            content,
            size: 'xl'
        });

        this.bindBlueActionWizard(content, modalRef.current, {
            actionId: action?.id || null,
            sequenceContext
        });
    }

    createBlueActionWizardContent(action = {}, { isEdit = false, sequenceContext = null } = {}) {
        const content = document.createElement('div');
        const blueAction = getBlueActionViewModel(action);
        const actionTitle = action.goal || action.title || '';
        const sectorIsCustom = Boolean(action.sector) && !BLUE_ACTION_SECTORS.includes(action.sector);
        const implementationIsCustom = Boolean(blueAction.implementation)
            && !BLUE_ACTION_IMPLEMENTATIONS.includes(blueAction.implementation);
        const sectorValue = sectorIsCustom ? 'Other' : (action.sector || '');
        const implementationValue = implementationIsCustom
            ? 'Other'
            : (blueAction.implementation || '');
        const sequenceLabel = sequenceContext?.label || formatActionSequenceLabel({
            teamLabel: this.teamLabel,
            move: action?.move || this.getCurrentGameState().move || 1,
            actionNumber: null
        });

        const renderOptions = (values, selectedValue = '', placeholder = 'Select an option') => `
            <option value="">${placeholder}</option>
            ${values.map((value) => `
                <option value="${value}" ${selectedValue === value ? 'selected' : ''}>${value}</option>
            `).join('')}
        `;

        const renderCheckbox = (group, value, selectedValues = []) => {
            const inputId = `${group}${value.replace(/[^a-z0-9]+/gi, '')}`;
            return `
                <label class="form-check" for="${inputId}">
                    <input
                        id="${inputId}"
                        class="form-checkbox"
                        type="checkbox"
                        data-blue-action-checkbox="${group}"
                        value="${value}"
                        ${selectedValues.includes(value) ? 'checked' : ''}
                    >
                    <span class="form-check-label">${value}</span>
                </label>
            `;
        };

        content.innerHTML = `
            <form id="blueActionWizardForm" novalidate>
                <div style="display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); margin-bottom: var(--space-4);">
                    <div>
                        <p class="text-xs text-gray-500" id="blueActionWizardStepLabel">Page 1 of ${BLUE_ACTION_WIZARD_PAGE_TOTAL}</p>
                        <h3 class="font-semibold" style="margin: 0;">Blue Team Action Builder</h3>
                        <p class="text-sm text-gray-500" id="blueActionWizardSequenceLabel" style="margin: var(--space-2) 0 0;">${this.escapeHtml(sequenceLabel)}</p>
                    </div>
                    <div aria-hidden="true" style="display: flex; gap: var(--space-2);">
                        ${Array.from({ length: BLUE_ACTION_WIZARD_PAGE_TOTAL }, (_, index) => `
                            <span
                                data-blue-action-step="${index}"
                                style="width: 28px; height: 4px; border-radius: 999px; background: ${index === 0 ? 'var(--color-primary-500)' : 'var(--color-gray-200)'};"
                            ></span>
                        `).join('')}
                    </div>
                </div>

                <section data-blue-action-page="0">
                    <div class="section-grid section-grid-2">
                        <div class="form-group">
                            <label class="form-label" for="actionTitle">Action Title *</label>
                            <input
                                id="actionTitle"
                                class="form-input"
                                type="text"
                                value="${this.escapeHtml(actionTitle)}"
                                maxlength="200"
                            >
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="actionInstrument">Instrument of Power *</label>
                            <select id="actionInstrument" class="form-select">
                                ${renderOptions(BLUE_ACTION_INSTRUMENTS, action.mechanism || '', 'Select instrument')}
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="actionObjective">Objective *</label>
                        <textarea
                            id="actionObjective"
                            class="form-input form-textarea"
                            rows="4"
                            aria-describedby="actionObjectiveHint"
                        >${this.escapeHtml(blueAction.objective)}</textarea>
                        <p class="form-hint" id="actionObjectiveHint">State the objective this action is meant to achieve.</p>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="actionLever">Lever *</label>
                        <select id="actionLever" class="form-select">
                            ${renderOptions(BLUE_ACTION_LEVERS, blueAction.lever || '', 'Select lever')}
                        </select>
                    </div>
                </section>

                <section data-blue-action-page="1" hidden>
                    <div class="section-grid section-grid-2">
                        <div class="form-group">
                            <label class="form-label" for="actionBlueSector">Sector *</label>
                            <select id="actionBlueSector" class="form-select" data-blue-action-other-target="actionBlueSectorOther">
                                ${renderOptions(BLUE_ACTION_SECTORS, sectorValue, 'Select sector')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="actionSupplyChainFocus">Supply Chain Focus *</label>
                            <select id="actionSupplyChainFocus" class="form-select">
                                ${renderOptions(BLUE_ACTION_SUPPLY_CHAIN_FOCUS, action.exposure_type || '', 'Select supply chain focus')}
                            </select>
                        </div>
                    </div>

                    <div
                        class="form-group"
                        id="actionBlueSectorOtherGroup"
                        ${sectorValue === 'Other' ? '' : 'hidden'}
                    >
                        <label class="form-label" for="actionBlueSectorOther">Other Sector *</label>
                        <input
                            id="actionBlueSectorOther"
                            class="form-input"
                            type="text"
                            value="${this.escapeHtml(sectorIsCustom ? action.sector : '')}"
                            maxlength="120"
                        >
                    </div>

                    <div class="section-grid section-grid-2">
                        <div class="form-group">
                            <label class="form-label" for="actionImplementation">Implementation *</label>
                            <select id="actionImplementation" class="form-select" data-blue-action-other-target="actionImplementationOther">
                                ${renderOptions(BLUE_ACTION_IMPLEMENTATIONS, implementationValue, 'Select implementation')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="actionEnforcementTimeline">Enforcement Timeline *</label>
                            <select id="actionEnforcementTimeline" class="form-select">
                                ${renderOptions(BLUE_ACTION_ENFORCEMENT_TIMELINES, blueAction.enforcementTimeline || '', 'Select timeline')}
                            </select>
                        </div>
                    </div>

                    <div
                        class="form-group"
                        id="actionImplementationOtherGroup"
                        ${implementationValue === 'Other' ? '' : 'hidden'}
                    >
                        <label class="form-label" for="actionImplementationOther">Other Implementation *</label>
                        <input
                            id="actionImplementationOther"
                            class="form-input"
                            type="text"
                            value="${this.escapeHtml(implementationIsCustom ? blueAction.implementation : '')}"
                            maxlength="120"
                        >
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="actionFocusCountries">Focus Countries *</label>
                        <select id="actionFocusCountries" class="form-select" multiple size="5">
                            ${BLUE_ACTION_COUNTRIES.map((value) => `
                                <option value="${value}" ${blueAction.focusCountries.includes(value) ? 'selected' : ''}>${value}</option>
                            `).join('')}
                        </select>
                        <p class="form-hint">Hold Ctrl (Windows) or Command (Mac) to select multiple countries.</p>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="actionExpectedOutcomes">Expected Outcomes *</label>
                        <textarea
                            id="actionExpectedOutcomes"
                            class="form-input form-textarea"
                            rows="5"
                            aria-describedby="actionExpectedOutcomesHint"
                        >${this.escapeHtml(action.expected_outcomes || '')}</textarea>
                        <p class="form-hint" id="actionExpectedOutcomesHint">What do you expect the outcome to be and when do you expect it to be achieved?</p>
                    </div>
                </section>

                <section data-blue-action-page="2" hidden>
                    <div class="card card-bordered" style="padding: var(--space-4); margin-bottom: var(--space-4);">
                        <h4 class="font-semibold" style="margin: 0 0 var(--space-2);">Review</h4>
                        <div id="blueActionSummary" class="text-sm text-gray-500"></div>
                    </div>

                    <div class="section-grid section-grid-2">
                        <div class="card card-bordered" style="padding: var(--space-4);">
                            <h4 class="font-semibold" style="margin: 0 0 var(--space-3);">Coordinated</h4>
                            <div style="display: grid; gap: var(--space-3);">
                                ${BLUE_ACTION_COORDINATED_OPTIONS.map((value) => (
                                    renderCheckbox('coordinated', value, blueAction.coordinated)
                                )).join('')}
                            </div>
                        </div>
                        <div class="card card-bordered" style="padding: var(--space-4);">
                            <h4 class="font-semibold" style="margin: 0 0 var(--space-3);">Informed</h4>
                            <div style="display: grid; gap: var(--space-3);">
                                ${BLUE_ACTION_INFORMED_OPTIONS.map((value) => (
                                    renderCheckbox('informed', value, blueAction.informed)
                                )).join('')}
                            </div>
                        </div>
                    </div>
                </section>

                <div style="display: flex; justify-content: space-between; gap: var(--space-3); margin-top: var(--space-6); padding-top: var(--space-4); border-top: 1px solid var(--color-border);">
                    <button type="button" class="btn btn-secondary" data-blue-action-nav="cancel">Cancel</button>
                    <div style="display: flex; gap: var(--space-3); flex-wrap: wrap; justify-content: flex-end;">
                        <button type="button" class="btn btn-secondary" data-blue-action-nav="back">Back</button>
                        <button type="button" class="btn btn-secondary" data-blue-action-nav="next">Next</button>
                        ${isEdit
                ? '<button type="button" class="btn btn-primary" data-blue-action-nav="saveChanges">Save Changes</button>'
                : `
                                <button type="button" class="btn btn-secondary" data-blue-action-nav="saveDraft">Save Draft</button>
                                <button type="button" class="btn btn-primary" data-blue-action-nav="submit">Submit</button>
                            `}
                    </div>
                </div>
            </form>
        `;

        return content;
    }

    bindBlueActionWizard(content, modal, { actionId = null, sequenceContext = null } = {}) {
        const form = content.querySelector('#blueActionWizardForm');
        const pages = Array.from(content.querySelectorAll('[data-blue-action-page]'));
        const stepLabel = content.querySelector('#blueActionWizardStepLabel');
        const sequenceLabel = content.querySelector('#blueActionWizardSequenceLabel');
        const progressSteps = Array.from(content.querySelectorAll('[data-blue-action-step]'));
        const backButton = content.querySelector('[data-blue-action-nav="back"]');
        const nextButton = content.querySelector('[data-blue-action-nav="next"]');
        const saveDraftButton = content.querySelector('[data-blue-action-nav="saveDraft"]');
        const submitButton = content.querySelector('[data-blue-action-nav="submit"]');
        const saveChangesButton = content.querySelector('[data-blue-action-nav="saveChanges"]');
        const summary = content.querySelector('#blueActionSummary');
        let currentPage = 0;

        const updateOtherField = (selectId, inputId, groupId) => {
            const select = form.querySelector(`#${selectId}`);
            const input = form.querySelector(`#${inputId}`);
            const group = form.querySelector(`#${groupId}`);
            const showOther = select?.value === 'Other';

            if (group) {
                group.hidden = !showOther;
            }

            if (input && !showOther) {
                input.value = '';
            }
        };

        const updateSummary = () => {
            const wizardData = this.getBlueActionWizardData(form);
            summary.innerHTML = `
                <p><strong>Sequence:</strong> ${this.escapeHtml(sequenceContext?.label || '')}</p>
                <p><strong>Title:</strong> ${this.escapeHtml(wizardData.actionTitle || 'Not specified')}</p>
                <p><strong>Objective:</strong> ${this.escapeHtml(wizardData.objective || 'Not specified')}</p>
                <p><strong>Instrument:</strong> ${this.escapeHtml(wizardData.instrumentOfPower || 'Not specified')} | <strong>Lever:</strong> ${this.escapeHtml(wizardData.lever || 'Not specified')}</p>
                <p><strong>Sector:</strong> ${this.escapeHtml(wizardData.sector || 'Not specified')} | <strong>Supply Chain Focus:</strong> ${this.escapeHtml(wizardData.supplyChainFocus || 'Not specified')}</p>
                <p><strong>Implementation:</strong> ${this.escapeHtml(wizardData.implementation || 'Not specified')} | <strong>Timeline:</strong> ${this.escapeHtml(wizardData.enforcementTimeline || 'Not specified')}</p>
                <p><strong>Focus Countries:</strong> ${this.escapeHtml(formatBlueActionSelection(wizardData.focusCountries))}</p>
                <p><strong>Expected Outcomes:</strong> ${this.escapeHtml(wizardData.expectedOutcomes || 'Not specified')}</p>
            `;
        };

        const focusCurrentPage = () => {
            const firstField = pages[currentPage]?.querySelector('input, select, textarea, button');
            firstField?.focus?.();
        };

        const renderPage = () => {
            pages.forEach((page, index) => {
                page.hidden = index !== currentPage;
            });

            progressSteps.forEach((step, index) => {
                step.style.background = index <= currentPage
                    ? 'var(--color-primary-500)'
                    : 'var(--color-gray-200)';
            });

            if (stepLabel) {
                stepLabel.textContent = `Page ${currentPage + 1} of ${BLUE_ACTION_WIZARD_PAGE_TOTAL}`;
            }

            if (sequenceLabel && sequenceContext?.label) {
                sequenceLabel.textContent = sequenceContext.label;
            }

            if (backButton) {
                backButton.hidden = currentPage === 0;
            }

            if (nextButton) {
                nextButton.hidden = currentPage === BLUE_ACTION_WIZARD_PAGE_TOTAL - 1;
            }

            if (saveDraftButton) {
                saveDraftButton.hidden = currentPage !== BLUE_ACTION_WIZARD_PAGE_TOTAL - 1;
            }

            if (submitButton) {
                submitButton.hidden = currentPage !== BLUE_ACTION_WIZARD_PAGE_TOTAL - 1;
            }

            if (saveChangesButton) {
                saveChangesButton.hidden = currentPage !== BLUE_ACTION_WIZARD_PAGE_TOTAL - 1;
            }

            if (currentPage === BLUE_ACTION_WIZARD_PAGE_TOTAL - 1) {
                updateSummary();
            }

            focusCurrentPage();
        };

        form.querySelector('#actionBlueSector')?.addEventListener('change', () => {
            updateOtherField('actionBlueSector', 'actionBlueSectorOther', 'actionBlueSectorOtherGroup');
        });
        form.querySelector('#actionImplementation')?.addEventListener('change', () => {
            updateOtherField('actionImplementation', 'actionImplementationOther', 'actionImplementationOtherGroup');
        });

        content.querySelector('[data-blue-action-nav="cancel"]')?.addEventListener('click', () => {
            modal?.close();
        });

        backButton?.addEventListener('click', () => {
            currentPage = Math.max(0, currentPage - 1);
            renderPage();
        });

        nextButton?.addEventListener('click', () => {
            const wizardData = this.getBlueActionWizardData(form);
            const error = this.validateBlueActionWizardPage(wizardData, currentPage);
            if (error) {
                showToast({ message: error, type: 'error' });
                return;
            }

            currentPage = Math.min(BLUE_ACTION_WIZARD_PAGE_TOTAL - 1, currentPage + 1);
            renderPage();
        });

        saveDraftButton?.addEventListener('click', () => {
            this.saveBlueActionDraft(modal, form).catch((error) => {
                logger.error('Failed to save Blue team draft action:', error);
            });
        });

        submitButton?.addEventListener('click', () => {
            this.submitBlueActionFromWizard(modal, form).catch((error) => {
                logger.error('Failed to submit Blue team action from wizard:', error);
            });
        });

        saveChangesButton?.addEventListener('click', () => {
            this.saveBlueActionChanges(modal, form, actionId).catch((error) => {
                logger.error('Failed to update Blue team draft action:', error);
            });
        });

        renderPage();
    }

    getBlueActionWizardData(form) {
        const focusCountries = Array.from(
            form.querySelector('#actionFocusCountries')?.selectedOptions || []
        ).map((option) => option.value);

        const coordinated = Array.from(
            form.querySelectorAll('[data-blue-action-checkbox="coordinated"]:checked')
        ).map((checkbox) => checkbox.value);

        const informed = Array.from(
            form.querySelectorAll('[data-blue-action-checkbox="informed"]:checked')
        ).map((checkbox) => checkbox.value);

        const sectorSelectValue = form.querySelector('#actionBlueSector')?.value || '';
        const implementationSelectValue = form.querySelector('#actionImplementation')?.value || '';
        const sectorOther = form.querySelector('#actionBlueSectorOther')?.value?.trim() || '';
        const implementationOther = form.querySelector('#actionImplementationOther')?.value?.trim() || '';

        return {
            actionTitle: form.querySelector('#actionTitle')?.value?.trim() || '',
            objective: form.querySelector('#actionObjective')?.value?.trim() || '',
            instrumentOfPower: form.querySelector('#actionInstrument')?.value || '',
            lever: form.querySelector('#actionLever')?.value || '',
            sector: sectorSelectValue === 'Other' ? sectorOther : sectorSelectValue,
            sectorSelectValue,
            sectorOther,
            supplyChainFocus: form.querySelector('#actionSupplyChainFocus')?.value || '',
            implementation: implementationSelectValue === 'Other' ? implementationOther : implementationSelectValue,
            implementationSelectValue,
            implementationOther,
            focusCountries,
            enforcementTimeline: form.querySelector('#actionEnforcementTimeline')?.value || '',
            expectedOutcomes: form.querySelector('#actionExpectedOutcomes')?.value?.trim() || '',
            coordinated,
            informed
        };
    }

    validateBlueActionWizardPage(wizardData, pageIndex) {
        if (pageIndex === 0) {
            if (!wizardData.actionTitle) return 'Action Title is required.';
            if (!wizardData.objective) return 'Objective is required.';
            if (!wizardData.instrumentOfPower) return 'Instrument of Power is required.';
            if (!wizardData.lever) return 'Lever is required.';
        }

        if (pageIndex === 1) {
            if (!wizardData.sectorSelectValue) return 'Sector is required.';
            if (wizardData.sectorSelectValue === 'Other' && !wizardData.sectorOther) {
                return 'Please enter the custom sector.';
            }
            if (!wizardData.supplyChainFocus) return 'Supply Chain Focus is required.';
            if (!wizardData.implementationSelectValue) return 'Implementation is required.';
            if (wizardData.implementationSelectValue === 'Other' && !wizardData.implementationOther) {
                return 'Please enter the custom implementation.';
            }
            if (!wizardData.focusCountries.length) return 'Select at least one focus country.';
            if (!wizardData.enforcementTimeline) return 'Enforcement Timeline is required.';
            if (!wizardData.expectedOutcomes) return 'Expected Outcomes is required.';
        }

        return null;
    }

    buildBlueActionPayload(wizardData) {
        return {
            goal: wizardData.actionTitle,
            mechanism: wizardData.instrumentOfPower,
            sector: wizardData.sector,
            exposure_type: wizardData.supplyChainFocus,
            priority: 'NORMAL',
            targets: wizardData.focusCountries,
            expected_outcomes: wizardData.expectedOutcomes,
            ally_contingencies: serializeBlueActionDetails({
                objective: wizardData.objective,
                lever: wizardData.lever,
                implementation: wizardData.implementation,
                enforcementTimeline: wizardData.enforcementTimeline,
                coordinated: wizardData.coordinated,
                informed: wizardData.informed
            })
        };
    }

    async saveBlueActionDraft(modal, form) {
        if (!this.requireWriteAccess()) return;

        const wizardData = this.getBlueActionWizardData(form);
        const pageZeroError = this.validateBlueActionWizardPage(wizardData, 0);
        const pageOneError = this.validateBlueActionWizardPage(wizardData, 1);
        const sessionId = sessionStore.getSessionId();

        if (pageZeroError || pageOneError) {
            showToast({ message: pageZeroError || pageOneError, type: 'error' });
            return;
        }

        if (!sessionId) {
            showToast({ message: 'No session found', type: 'error' });
            return;
        }

        const loader = showLoader({ message: 'Saving draft...' });

        try {
            const gameState = this.getCurrentGameState();
            const action = await database.createAction({
                ...this.buildBlueActionPayload(wizardData),
                session_id: sessionId,
                client_id: sessionStore.getClientId(),
                team: this.teamId,
                status: ENUMS.ACTION_STATUS.DRAFT,
                move: gameState.move ?? 1,
                phase: gameState.phase ?? 1
            });
            actionsStore.updateFromServer('INSERT', action);

            const timelineEvent = await database.createTimelineEvent({
                session_id: sessionId,
                type: 'ACTION_CREATED',
                content: `Draft action created: ${action.goal || 'Untitled action'}`,
                metadata: {
                    related_id: action.id,
                    role: this.role || this.getCurrentLeadRole()
                },
                team: this.teamId,
                move: action.move ?? 1,
                phase: action.phase ?? 1
            });
            timelineStore.updateFromServer('INSERT', timelineEvent);

            showToast({ message: 'Draft action saved', type: 'success' });
            modal?.close();
        } catch (err) {
            logger.error('Failed to create Blue team draft action:', err);
            showToast({ message: err.message || 'Failed to save draft action', type: 'error' });
        } finally {
            hideLoader();
        }
    }

    async saveBlueActionChanges(modal, form, actionId) {
        if (!this.requireWriteAccess()) return;

        const wizardData = this.getBlueActionWizardData(form);
        const pageZeroError = this.validateBlueActionWizardPage(wizardData, 0);
        const pageOneError = this.validateBlueActionWizardPage(wizardData, 1);

        if (pageZeroError || pageOneError) {
            showToast({ message: pageZeroError || pageOneError, type: 'error' });
            return;
        }

        const loader = showLoader({ message: 'Updating draft...' });

        try {
            const updatedAction = await database.updateDraftAction(actionId, this.buildBlueActionPayload(wizardData));
            actionsStore.updateFromServer('UPDATE', updatedAction);
            showToast({ message: 'Draft action updated', type: 'success' });
            modal?.close();
        } catch (err) {
            logger.error('Failed to update Blue team draft action:', err);
            showToast({ message: err.message || 'Failed to update draft action', type: 'error' });
        } finally {
            hideLoader();
        }
    }

    async submitBlueActionFromWizard(modal, form) {
        if (!this.requireWriteAccess()) return;

        const wizardData = this.getBlueActionWizardData(form);
        const pageZeroError = this.validateBlueActionWizardPage(wizardData, 0);
        const pageOneError = this.validateBlueActionWizardPage(wizardData, 1);
        const sessionId = sessionStore.getSessionId();
        const sequenceContext = this.getBlueActionSequenceContext();

        if (pageZeroError || pageOneError) {
            showToast({ message: pageZeroError || pageOneError, type: 'error' });
            return;
        }

        if (!sessionId) {
            showToast({ message: 'No session found', type: 'error' });
            return;
        }

        const confirmed = await confirmModal({
            title: 'Confirm Action',
            message: `Submit ${sequenceContext.label} to White Cell? It will appear as submitted immediately after confirmation.`,
            confirmLabel: 'Submit',
            variant: 'primary'
        });

        if (!confirmed) {
            return;
        }

        const loader = showLoader({ message: 'Submitting action...' });

        try {
            const gameState = this.getCurrentGameState();
            const draftAction = await database.createAction({
                ...this.buildBlueActionPayload(wizardData),
                session_id: sessionId,
                client_id: sessionStore.getClientId(),
                team: this.teamId,
                status: ENUMS.ACTION_STATUS.DRAFT,
                move: gameState.move ?? 1,
                phase: gameState.phase ?? 1
            });
            actionsStore.updateFromServer('INSERT', draftAction);

            const draftTimelineEvent = await database.createTimelineEvent({
                session_id: sessionId,
                type: 'ACTION_CREATED',
                content: `Draft action created: ${draftAction.goal || 'Untitled action'}`,
                metadata: {
                    related_id: draftAction.id,
                    role: this.role || this.getCurrentLeadRole()
                },
                team: this.teamId,
                move: draftAction.move ?? 1,
                phase: draftAction.phase ?? 1
            });
            timelineStore.updateFromServer('INSERT', draftTimelineEvent);

            const submittedAction = await database.submitAction(draftAction.id);
            actionsStore.updateFromServer('UPDATE', submittedAction);

            const submittedTimelineEvent = await database.createTimelineEvent({
                session_id: submittedAction.session_id,
                type: 'ACTION_SUBMITTED',
                content: `Action submitted to White Cell: ${submittedAction.goal || 'Untitled action'}`,
                metadata: {
                    related_id: submittedAction.id,
                    role: this.role || this.getCurrentLeadRole()
                },
                team: this.teamId,
                move: submittedAction.move ?? 1,
                phase: submittedAction.phase ?? 1
            });
            timelineStore.updateFromServer('INSERT', submittedTimelineEvent);

            showToast({ message: 'Action submitted to White Cell', type: 'success' });
            modal?.close();
        } catch (err) {
            logger.error('Failed to submit Blue team action:', err);
            showToast({ message: err.message || 'Failed to submit action', type: 'error' });
        } finally {
            hideLoader();
        }
    }

    createActionFormContent(action = {}) {
        const content = document.createElement('div');
        const selectedTargets = Array.isArray(action.targets)
            ? action.targets
            : (action.target ? [action.target] : []);

        const mechanismOptions = ENUMS.MECHANISMS
            .map((value) => `<option value="${value}" ${action.mechanism === value ? 'selected' : ''}>${value}</option>`)
            .join('');

        const sectorOptions = ENUMS.SECTORS
            .map((value) => `<option value="${value}" ${action.sector === value ? 'selected' : ''}>${value}</option>`)
            .join('');

        const exposureOptions = ENUMS.EXPOSURE_TYPES
            .map((value) => `<option value="${value}" ${action.exposure_type === value ? 'selected' : ''}>${value}</option>`)
            .join('');

        const targetOptions = ENUMS.TARGETS
            .map((value) => `<option value="${value}" ${selectedTargets.includes(value) ? 'selected' : ''}>${value}</option>`)
            .join('');

        const priorityOptions = ENUMS.PRIORITY
            .map((value) => `<option value="${value}" ${(action.priority || 'NORMAL') === value ? 'selected' : ''}>${value}</option>`)
            .join('');

        content.innerHTML = `
            <form id="actionForm">
                <div class="form-group">
                    <label class="form-label" for="actionGoal">Goal *</label>
                    <textarea id="actionGoal" class="form-input form-textarea" rows="3" required>${this.escapeHtml(action.goal || action.title || '')}</textarea>
                </div>

                <div class="section-grid section-grid-2">
                    <div class="form-group">
                        <label class="form-label" for="actionMechanism">Mechanism *</label>
                        <select id="actionMechanism" class="form-select" required>
                            <option value="">Select mechanism</option>
                            ${mechanismOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="actionSector">Sector *</label>
                        <select id="actionSector" class="form-select" required>
                            <option value="">Select sector</option>
                            ${sectorOptions}
                        </select>
                    </div>
                </div>

                <div class="section-grid section-grid-2">
                    <div class="form-group">
                        <label class="form-label" for="actionExposureType">Exposure Type</label>
                        <select id="actionExposureType" class="form-select">
                            <option value="">Select exposure type</option>
                            ${exposureOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="actionPriority">Priority</label>
                        <select id="actionPriority" class="form-select">
                            ${priorityOptions}
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="actionTargets">Targets *</label>
                    <select id="actionTargets" class="form-select" multiple size="5" required>
                        ${targetOptions}
                    </select>
                    <p class="form-hint">Hold Ctrl (Windows) or Command (Mac) to select multiple.</p>
                </div>

                <div class="form-group">
                    <label class="form-label" for="actionExpectedOutcomes">Expected Outcomes *</label>
                    <textarea id="actionExpectedOutcomes" class="form-input form-textarea" rows="4" required>${this.escapeHtml(action.expected_outcomes || action.description || '')}</textarea>
                </div>

                <div class="form-group">
                    <label class="form-label" for="actionAllyContingencies">Ally Contingencies *</label>
                    <textarea id="actionAllyContingencies" class="form-input form-textarea" rows="3" required>${this.escapeHtml(action.ally_contingencies || '')}</textarea>
                </div>
            </form>
        `;

        return content;
    }

    getActionFormData() {
        const targetsSelect = document.getElementById('actionTargets');
        const formData = {
            goal: document.getElementById('actionGoal')?.value?.trim(),
            mechanism: document.getElementById('actionMechanism')?.value,
            sector: document.getElementById('actionSector')?.value,
            exposure_type: document.getElementById('actionExposureType')?.value || null,
            priority: document.getElementById('actionPriority')?.value || 'NORMAL',
            targets: targetsSelect
                ? Array.from(targetsSelect.selectedOptions).map((option) => option.value)
                : [],
            expected_outcomes: document.getElementById('actionExpectedOutcomes')?.value?.trim(),
            ally_contingencies: document.getElementById('actionAllyContingencies')?.value?.trim()
        };

        const result = validateAction(formData);
        if (!result.valid) {
            showToast({ message: result.errors[0] || 'Action validation failed', type: 'error' });
            return null;
        }

        return formData;
    }

    async handleCreateAction(modal) {
        if (!this.requireWriteAccess()) return;

        const formData = this.getActionFormData();
        if (!formData) return;

        const sessionId = sessionStore.getSessionId();
        if (!sessionId) {
            showToast({ message: 'No session found', type: 'error' });
            return;
        }

        const loader = showLoader({ message: 'Saving draft...' });

        try {
            const gameState = this.getCurrentGameState();
            const action = await database.createAction({
                ...formData,
                session_id: sessionId,
                client_id: sessionStore.getClientId(),
                team: this.teamId,
                status: ENUMS.ACTION_STATUS.DRAFT,
                move: gameState.move ?? 1,
                phase: gameState.phase ?? 1
            });
            actionsStore.updateFromServer('INSERT', action);

            const timelineEvent = await database.createTimelineEvent({
                session_id: sessionId,
                type: 'ACTION_CREATED',
                content: `Draft action created: ${action.goal || 'Untitled action'}`,
                metadata: {
                    related_id: action.id,
                    role: this.role || this.getCurrentLeadRole()
                },
                team: this.teamId,
                move: action.move ?? 1,
                phase: action.phase ?? 1
            });
            timelineStore.updateFromServer('INSERT', timelineEvent);

            showToast({ message: 'Draft action saved', type: 'success' });
            modal?.close();
        } catch (err) {
            logger.error('Failed to create action:', err);
            showToast({ message: err.message || 'Failed to save draft action', type: 'error' });
        } finally {
            hideLoader();
        }
    }

    async handleUpdateAction(modal, actionId) {
        if (!this.requireWriteAccess()) return;

        const formData = this.getActionFormData();
        if (!formData) return;

        const loader = showLoader({ message: 'Updating draft...' });

        try {
            const updatedAction = await database.updateDraftAction(actionId, formData);
            actionsStore.updateFromServer('UPDATE', updatedAction);
            showToast({ message: 'Draft action updated', type: 'success' });
            modal?.close();
        } catch (err) {
            logger.error('Failed to update action:', err);
            showToast({ message: err.message || 'Failed to update draft action', type: 'error' });
        } finally {
            hideLoader();
        }
    }

    async confirmSubmitAction(action) {
        if (!this.requireWriteAccess()) return;
        if (!canSubmitAction(action)) {
            showToast({ message: 'Only draft actions can be submitted.', type: 'error' });
            return;
        }

        const sequenceLabel = this.isBlueTeamActionWizardEnabled(action)
            ? this.getBlueActionSequenceContext(action).label
            : 'this draft';

        const confirmed = await confirmModal({
            title: 'Submit Action',
            message: `Submit ${sequenceLabel} to White Cell for review? After submission it becomes read-only for facilitator and scribe seats.`,
            confirmLabel: 'Submit',
            variant: 'primary'
        });

        if (!confirmed) return;
        await this.submitAction(action.id);
    }

    async submitAction(actionId) {
        if (!this.requireWriteAccess()) return;
        const loader = showLoader({ message: 'Submitting action...' });

        try {
            const action = await database.submitAction(actionId);
            actionsStore.updateFromServer('UPDATE', action);

            const timelineEvent = await database.createTimelineEvent({
                session_id: action.session_id,
                type: 'ACTION_SUBMITTED',
                content: `Action submitted to White Cell: ${action.goal || 'Untitled action'}`,
                metadata: {
                    related_id: action.id,
                    role: this.role || this.getCurrentLeadRole()
                },
                team: this.teamId,
                move: action.move ?? 1,
                phase: action.phase ?? 1
            });
            timelineStore.updateFromServer('INSERT', timelineEvent);

            showToast({ message: 'Action submitted to White Cell', type: 'success' });
        } catch (err) {
            logger.error('Failed to submit action:', err);
            showToast({ message: err.message || 'Failed to submit action', type: 'error' });
        } finally {
            hideLoader();
        }
    }

    async confirmDeleteAction(action) {
        if (!this.requireWriteAccess()) return;
        if (!canDeleteAction(action)) {
            showToast({ message: 'Only draft actions can be deleted.', type: 'error' });
            return;
        }

        const confirmed = await confirmModal({
            title: 'Delete Draft Action',
            message: 'Delete this draft action? This cannot be undone.',
            confirmLabel: 'Delete',
            variant: 'danger'
        });

        if (!confirmed) return;
        await this.deleteAction(action.id);
    }

    async deleteAction(actionId) {
        if (!this.requireWriteAccess()) return;
        const loader = showLoader({ message: 'Deleting draft...' });

        try {
            await database.deleteDraftAction(actionId);
            actionsStore.updateFromServer('DELETE', { id: actionId });
            showToast({ message: 'Draft action deleted', type: 'success' });
        } catch (err) {
            logger.error('Failed to delete action:', err);
            showToast({ message: err.message || 'Failed to delete draft action', type: 'error' });
        } finally {
            hideLoader();
        }
    }

    renderRfiList() {
        const rfiList = document.getElementById('rfiList');
        if (!rfiList) return;

        if (this.rfis.length === 0) {
            rfiList.innerHTML = `
                <div class="empty-state">
                    <h3 class="empty-state-title">No RFIs</h3>
                    <p class="empty-state-message">
                        ${this.isReadOnly
                            ? `No ${this.teamLabel} RFIs have been submitted yet.`
                            : 'Submit a request for information to White Cell when the team needs clarification.'}
                    </p>
                </div>
            `;
            return;
        }

        rfiList.innerHTML = this.rfis.map((rfi) => {
            const queryText = rfi.query || rfi.question || '';
            return `
                <div class="card card-bordered" style="padding: var(--space-4); margin-bottom: var(--space-3);">
                    <div class="card-header" style="display: flex; justify-content: space-between; gap: var(--space-2);">
                        <span class="text-sm font-semibold">${this.escapeHtml(queryText)}</span>
                        <div style="display: flex; gap: var(--space-2);">
                            ${createStatusBadge(rfi.status || 'pending').outerHTML}
                            ${createPriorityBadge(rfi.priority || 'NORMAL').outerHTML}
                        </div>
                    </div>
                    ${Array.isArray(rfi.categories) && rfi.categories.length ? `
                        <p class="text-xs text-gray-500 mt-2"><strong>Categories:</strong> ${this.escapeHtml(rfi.categories.join(', '))}</p>
                    ` : ''}
                    ${rfi.response ? `
                        <div class="mt-3 p-3 bg-gray-50 rounded">
                            <strong>Response:</strong> ${this.escapeHtml(rfi.response)}
                        </div>
                    ` : ''}
                    <p class="text-xs text-gray-400 mt-2">${formatRelativeTime(rfi.created_at)}</p>
                </div>
            `;
        }).join('');
    }

    showCreateRfiModal() {
        if (!this.requireWriteAccess()) return;

        const content = document.createElement('div');
        const priorityOptions = ENUMS.PRIORITY
            .map((value) => `<option value="${value}">${value}</option>`)
            .join('');
        const categoryOptions = ENUMS.RFI_CATEGORIES
            .map((value) => `<option value="${value}">${value}</option>`)
            .join('');

        content.innerHTML = `
            <form id="rfiForm">
                <div class="form-group">
                    <label class="form-label" for="rfiQuestion">Question *</label>
                    <textarea id="rfiQuestion" class="form-input form-textarea" rows="4" required></textarea>
                </div>
                <div class="section-grid section-grid-2">
                    <div class="form-group">
                        <label class="form-label" for="rfiPriority">Priority *</label>
                        <select id="rfiPriority" class="form-select" required>
                            <option value="">Select priority</option>
                            ${priorityOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="rfiCategories">Categories *</label>
                        <select id="rfiCategories" class="form-select" multiple size="4" required>
                            ${categoryOptions}
                        </select>
                        <p class="form-hint">Hold Ctrl (Windows) or Command (Mac) to select multiple.</p>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label" for="rfiContext">Context</label>
                    <textarea id="rfiContext" class="form-input form-textarea" rows="3"></textarea>
                </div>
            </form>
        `;

        const modalRef = { current: null };
        modalRef.current = showModal({
            title: 'Submit Request for Information',
            content,
            size: 'md',
            buttons: [
                {
                    label: 'Cancel',
                    variant: 'secondary',
                    onClick: () => {}
                },
                {
                    label: 'Submit RFI',
                    variant: 'primary',
                    onClick: () => {
                        this.handleCreateRfi(modalRef.current).catch((err) => {
                            logger.error('Failed to submit RFI:', err);
                        });
                        return false;
                    }
                }
            ]
        });
    }

    async handleCreateRfi(modal) {
        if (!this.requireWriteAccess()) return;

        const question = document.getElementById('rfiQuestion')?.value?.trim();
        const context = document.getElementById('rfiContext')?.value?.trim();
        const priority = document.getElementById('rfiPriority')?.value;
        const categoriesSelect = document.getElementById('rfiCategories');
        const categories = categoriesSelect
            ? Array.from(categoriesSelect.selectedOptions).map((option) => option.value)
            : [];

        if (!question) {
            showToast({ message: 'Question is required', type: 'error' });
            return;
        }

        if (!priority) {
            showToast({ message: 'Priority is required', type: 'error' });
            return;
        }

        if (!categories.length) {
            showToast({ message: 'Select at least one category', type: 'error' });
            return;
        }

        const sessionId = sessionStore.getSessionId();
        if (!sessionId) return;

        const loader = showLoader({ message: 'Submitting RFI...' });

        try {
            const gameState = this.getCurrentGameState();
            const query = context ? `${question}\n\nContext: ${context}` : question;
            const rfi = await database.createRequest({
                session_id: sessionId,
                team: this.teamId,
                client_id: sessionStore.getClientId(),
                query,
                priority,
                categories,
                move: gameState.move ?? 1,
                phase: gameState.phase ?? 1
            });
            requestsStore.updateFromServer('INSERT', rfi);

            const timelineEvent = await database.createTimelineEvent({
                session_id: sessionId,
                type: 'RFI_CREATED',
                content: `${this.teamLabel} submitted an RFI to White Cell.`,
                metadata: {
                    related_id: rfi.id,
                    role: this.role || this.getCurrentLeadRole()
                },
                team: this.teamId,
                move: rfi.move ?? 1,
                phase: rfi.phase ?? 1
            });
            timelineStore.updateFromServer('INSERT', timelineEvent);

            showToast({ message: 'RFI submitted successfully', type: 'success' });
            modal?.close();
        } catch (err) {
            logger.error('Failed to submit RFI:', err);
            showToast({ message: err.message || 'Failed to submit RFI', type: 'error' });
        } finally {
            hideLoader();
        }
    }

    renderResponsesList() {
        const container = document.getElementById('responsesList');
        if (!container) return;

        if (this.responses.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3 class="empty-state-title">No Responses Yet</h3>
                    <p class="empty-state-message">White Cell responses and team-lead communications will appear here.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.responses.map((response) => {
            const responseBadge = response.kind === 'rfi'
                ? createStatusBadge('answered').outerHTML
                : createBadge({ text: response.type, variant: 'info', size: 'sm', rounded: true }).outerHTML;

            return `
                <div class="card card-bordered" style="padding: var(--space-4); margin-bottom: var(--space-3);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-2); margin-bottom: var(--space-2);">
                        <div>
                            <h3 class="font-semibold">${this.escapeHtml(response.title)}</h3>
                            <p class="text-xs text-gray-400">${formatDateTime(response.created_at)}</p>
                        </div>
                        ${responseBadge}
                    </div>
                    <p class="text-sm">${this.escapeHtml(response.content || '')}</p>
                </div>
            `;
        }).join('');
    }

    renderTribeStreetJournalList() {
        const container = document.getElementById('tribeStreetJournalList');
        if (!container) return;

        const combinedEntries = [
            ...this.journalUpdates.map((communication) => ({
                kind: 'white_cell_update',
                created_at: communication.created_at,
                content: communication.content,
                type: communication.type || 'GUIDANCE',
                metadata: communication.metadata || {},
                to_role: communication.to_role
            })),
            ...this.journalEntries.map((entry) => ({
                ...entry,
                kind: 'team_capture'
            }))
        ].sort((a, b) => getSortableEventTime(b) - getSortableEventTime(a));

        if (combinedEntries.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3 class="empty-state-title">No Journal Entries Yet</h3>
                    <p class="empty-state-message">White Cell journal updates and team captures will appear here.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = combinedEntries.map((entry) => {
            if (entry.kind === 'white_cell_update') {
                const timestamp = getEventTimestamp(entry);
                return `
                    <div class="card card-bordered" style="padding: var(--space-3); margin-bottom: var(--space-3); border-left: 3px solid var(--color-primary-500);">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-3); margin-bottom: var(--space-2);">
                            <div style="display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap;">
                                ${createBadge({ text: 'WHITE CELL UPDATE', variant: 'primary', size: 'sm', rounded: true }).outerHTML}
                                <span class="text-xs text-gray-500">${this.escapeHtml(this.formatCommunicationTarget(entry.to_role))}</span>
                            </div>
                            <span class="text-xs text-gray-400">${timestamp ? formatDateTime(timestamp) : 'Time unavailable'}</span>
                        </div>
                        <p class="text-sm">${this.escapeHtml(entry.content || '')}</p>
                    </div>
                `;
            }

            const eventType = entry.type || entry.event_type || 'NOTE';
            const badgeVariant = {
                NOTE: 'default',
                MOMENT: 'warning',
                QUOTE: 'info'
            }[eventType] || 'default';
            const actorLabel = entry.metadata?.actor || this.getCurrentLeadLabel();
            const timestamp = getEventTimestamp(entry);

            return `
                <div class="card card-bordered" style="padding: var(--space-3); margin-bottom: var(--space-3);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-3); margin-bottom: var(--space-2);">
                        <div style="display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap;">
                            ${createBadge({ text: eventType, variant: badgeVariant, size: 'sm', rounded: true }).outerHTML}
                            <span class="text-xs text-gray-500">${this.escapeHtml(actorLabel)}</span>
                        </div>
                        <span class="text-xs text-gray-400">${timestamp ? formatDateTime(timestamp) : 'Time unavailable'}</span>
                    </div>
                    <p class="text-sm">${this.escapeHtml(entry.content || entry.description || '')}</p>
                    <p class="text-xs text-gray-400" style="margin-top: var(--space-2);">Move ${entry.move || 1} | Phase ${entry.phase || 1}</p>
                </div>
            `;
        }).join('');
    }

    renderVerbaAiList() {
        const container = document.getElementById('verbaAiList');
        if (!container) return;

        if (this.verbaAiUpdates.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3 class="empty-state-title">No Verba AI Updates Yet</h3>
                    <p class="empty-state-message">White Cell Verba AI population sentiment updates will appear here.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.verbaAiUpdates.map((communication) => `
            <div class="card card-bordered" style="padding: var(--space-3); margin-bottom: var(--space-3); border-left: 3px solid var(--color-success);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-3); margin-bottom: var(--space-2);">
                    <div style="display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap;">
                        ${createBadge({ text: 'VERBA AI', variant: 'success', size: 'sm', rounded: true }).outerHTML}
                        <span class="text-xs text-gray-500">${this.escapeHtml(this.formatCommunicationTarget(communication.to_role))}</span>
                    </div>
                    <span class="text-xs text-gray-400">${formatDateTime(communication.created_at)}</span>
                </div>
                <p class="text-sm">${this.escapeHtml(communication.content || '')}</p>
            </div>
        `).join('');
    }

    renderTimeline() {
        const container = document.getElementById('timelineList');
        if (!container) return;

        if (this.timelineEvents.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3 class="empty-state-title">No Timeline Events</h3>
                    <p class="empty-state-message">Session activity will appear here as the exercise progresses.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.timelineEvents.map((event) => `
            <div class="timeline-event" style="display: flex; gap: var(--space-3); padding: var(--space-3); border-bottom: 1px solid var(--color-gray-200);">
                <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--color-primary-500); margin-top: 6px; flex-shrink: 0;"></div>
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; gap: var(--space-2);">
                        ${createBadge({ text: event.type || 'EVENT', size: 'sm', rounded: true }).outerHTML}
                        <span class="text-xs text-gray-400">${formatDateTime(event.created_at)}</span>
                    </div>
                    <p class="text-sm mt-1">${this.escapeHtml(event.content || event.description || '')}</p>
                    <p class="text-xs text-gray-400 mt-1">${this.escapeHtml(this.formatTeamLabel(event.team))} | Move ${event.move || 1} | Phase ${event.phase || 1}</p>
                </div>
            </div>
        `).join('');
    }

    async handleCaptureSubmit(event) {
        event.preventDefault();
        if (!this.requireWriteAccess()) return;

        const type = document.querySelector('input[name="captureType"]:checked')?.value;
        const contentInput = document.getElementById('captureContent');
        const content = contentInput?.value?.trim();

        if (!content) {
            showToast({ message: 'Please enter content', type: 'error' });
            return;
        }

        const sessionId = sessionStore.getSessionId();
        if (!sessionId) return;

        const loader = showLoader({ message: 'Saving observation...' });

        try {
            const gameState = this.getCurrentGameState();
            const timelineEvent = await database.createTimelineEvent({
                session_id: sessionId,
                type,
                content,
                metadata: { role: this.role || this.getCurrentLeadRole() },
                team: this.teamId,
                move: gameState.move ?? 1,
                phase: gameState.phase ?? 1
            });
            timelineStore.updateFromServer('INSERT', timelineEvent);

            showToast({ message: 'Observation saved', type: 'success' });
            if (contentInput) {
                contentInput.value = '';
            }
        } catch (err) {
            logger.error('Failed to save capture:', err);
            showToast({ message: 'Failed to save observation', type: 'error' });
        } finally {
            hideLoader();
        }
    }

    formatCommunicationTarget(target) {
        const labels = {
            all: 'White Cell communication to all teams',
            [this.teamId]: `White Cell communication to ${this.teamLabel}`,
            [this.teamContext.facilitatorRole]: `White Cell communication to ${this.teamContext.facilitatorLabel}`,
            [this.teamContext.scribeRole]: `White Cell communication to ${this.teamContext.scribeLabel}`
        };

        return labels[target] || target || 'White Cell communication';
    }

    formatTeamLabel(team) {
        if (team === this.teamId) {
            return this.teamLabel;
        }

        if (team === 'white_cell') {
            return 'White Cell';
        }

        return team || '';
    }

    escapeHtml(value) {
        if (typeof value !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = value;
        return div.innerHTML;
    }

    destroy() {
        this.storeUnsubscribers.forEach((unsubscribe) => unsubscribe?.());
        this.storeUnsubscribers = [];
    }
}

const facilitatorController = new FacilitatorController();

const shouldAutoInitFacilitator = typeof document !== 'undefined' &&
    typeof window !== 'undefined' &&
    !globalThis.__ESG_DISABLE_AUTO_INIT__;

if (shouldAutoInitFacilitator) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => facilitatorController.init());
    } else {
        facilitatorController.init();
    }

    window.addEventListener('beforeunload', () => facilitatorController.destroy());
}

export default facilitatorController;
