import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const FACILITATOR_HTML_PATH = new URL('../../teams/blue/facilitator.html', import.meta.url);
const GREEN_FACILITATOR_HTML_PATH = new URL('../../teams/green/facilitator.html', import.meta.url);

function createFakeElement(id = null, tagName = 'div') {
    let textContent = '';
    let explicitInnerHtml = null;

    return {
        id,
        tagName: tagName.toUpperCase(),
        className: '',
        hidden: false,
        style: {},
        toggleAttribute: vi.fn(),
        querySelectorAll: vi.fn(() => []),
        get textContent() {
            return textContent;
        },
        set textContent(value) {
            textContent = value == null ? '' : String(value);
            explicitInnerHtml = null;
        },
        get innerHTML() {
            return explicitInnerHtml ?? textContent;
        },
        set innerHTML(value) {
            explicitInnerHtml = value == null ? '' : String(value);
        },
        get outerHTML() {
            const attributes = [];
            if (this.id) {
                attributes.push(`id="${this.id}"`);
            }
            if (this.className) {
                attributes.push(`class="${this.className}"`);
            }

            return `<${tagName}${attributes.length ? ` ${attributes.join(' ')}` : ''}>${this.innerHTML}</${tagName}>`;
        }
    };
}

function createFakeDocument() {
    return {
        createElement(tagName) {
            return createFakeElement(null, tagName);
        }
    };
}

const showToast = vi.fn();
const showModal = vi.fn();
const createTimelineEvent = vi.fn();
const createAction = vi.fn();
const updateDraftAction = vi.fn();
const submitActionRecord = vi.fn();
const deleteDraftAction = vi.fn();
const createRequest = vi.fn();

vi.mock('../components/ui/Toast.js', () => ({
    showToast
}));

vi.mock('../components/ui/Modal.js', () => ({
    showModal,
    confirmModal: vi.fn()
}));

vi.mock('../components/ui/Loader.js', () => ({
    showLoader: vi.fn(() => ({})),
    hideLoader: vi.fn(),
    showInlineLoader: vi.fn(() => ({
        hide: vi.fn()
    }))
}));

vi.mock('../services/database.js', () => ({
    database: {
        createAction,
        updateDraftAction,
        submitAction: submitActionRecord,
        deleteDraftAction,
        createRequest,
        createTimelineEvent,
        fetchActions: vi.fn(),
        fetchRequests: vi.fn(),
        fetchCommunications: vi.fn(),
        fetchTimeline: vi.fn()
    }
}));

async function loadFacilitatorModule() {
    globalThis.__ESG_DISABLE_AUTO_INIT__ = true;
    vi.resetModules();
    return import('./facilitator.js');
}

describe('Facilitator and scribe access', () => {
    afterEach(() => {
        vi.clearAllMocks();
        delete global.document;
        delete globalThis.__ESG_DISABLE_AUTO_INIT__;
    });

    it('allows facilitator and scribe seats onto the shared team-lead surface', async () => {
        const { getFacilitatorAccessState } = await loadFacilitatorModule();
        const teamContext = {
            teamId: 'blue',
            facilitatorRole: 'blue_facilitator',
            scribeRole: 'blue_scribe'
        };

        expect(getFacilitatorAccessState({
            role: 'blue_facilitator',
            teamContext,
        })).toMatchObject({
            allowed: true,
            readOnly: false,
            reason: null,
            roleSurface: 'facilitator'
        });

        expect(getFacilitatorAccessState({
            role: 'blue_scribe',
            teamContext,
        })).toMatchObject({
            allowed: true,
            readOnly: false,
            reason: null,
            roleSurface: 'scribe'
        });
    });

    it('renders scribe-mode labels on the shared facilitator surface', async () => {
        const { FacilitatorController } = await loadFacilitatorModule();
        const controller = new FacilitatorController();
        controller.role = 'blue_scribe';

        const roleLabel = createFakeElement('sessionRoleLabel');
        const notice = createFakeElement('facilitatorModeNotice');
        const headerTitle = createFakeElement(null, 'h1');

        global.document = {
            body: { dataset: {} },
            getElementById(id) {
                return {
                    sessionRoleLabel: roleLabel,
                    facilitatorModeNotice: notice,
                    captureNavItem: createFakeElement('captureNavItem'),
                    captureSection: createFakeElement('captureSection')
                }[id] || null;
            },
            querySelector(selector) {
                if (selector === '.header-title') {
                    return headerTitle;
                }

                return createFakeElement();
            },
            querySelectorAll() {
                return [];
            }
        };

        controller.configureAccessMode();

        expect(global.document.body.dataset.facilitatorMode).toBe('scribe');
        expect(roleLabel.textContent).toBe('Scribe');
        expect(headerTitle.textContent).toBe('Blue Team Scribe');
        expect(notice.style.display).toBe('none');
        expect(notice.innerHTML).toBe('');
    });

    it('ships a standalone Tribe Street Journal sidebar section in the facilitator view', () => {
        const html = readFileSync(FACILITATOR_HTML_PATH, 'utf8');

        expect(html).toContain('data-section="tribeStreetJournal"');
        expect(html).toContain('id="tribeStreetJournalSection"');
        expect(html).toContain('Tribe Street Journal');
        expect(html).toContain('id="tribeStreetJournalEmbed"');
        expect(html).toContain('id="tribeStreetJournalList"');
    });

    it('labels the Green facilitator action trigger as New Proposal', () => {
        const html = readFileSync(GREEN_FACILITATOR_HTML_PATH, 'utf8');

        expect(html).toContain('id="newActionBtn"');
        expect(html).toContain('New Proposal');
        expect(html).toContain('No Proposals Yet');
        expect(html).toContain('Create your first proposal to start the White Cell review flow.');
        expect(html).not.toContain('No Actions Yet');
        expect(html).toContain('data-section="receivedProposals"');
        expect(html).toContain('id="receivedProposalsSection"');
        expect(html).toContain('id="receivedProposalsList"');
    });

    it('renders proposal-specific empty-state copy for the Green facilitator queue', async () => {
        const { FacilitatorController } = await loadFacilitatorModule();
        const controller = new FacilitatorController();
        controller.teamId = 'green';
        controller.teamLabel = 'Green Team';
        controller.actions = [];
        controller.isReadOnly = false;

        const actionsList = createFakeElement('actionsList');
        global.document = {
            getElementById(id) {
                return {
                    actionsList
                }[id] || null;
            }
        };

        controller.renderActionsList();

        expect(actionsList.innerHTML).toContain('No Proposals Yet');
        expect(actionsList.innerHTML).toContain('Create your first proposal to start the White Cell review flow.');
        expect(actionsList.innerHTML).not.toContain('No Actions Yet');
        expect(actionsList.innerHTML).not.toContain('strategic action');
    });

    it('does not render White Cell share controls in facilitator action cards', async () => {
        const { FacilitatorController } = await loadFacilitatorModule();
        global.document = createFakeDocument();

        const controller = new FacilitatorController();
        const markup = controller.renderActionCard({
            id: 'action-1',
            team: 'blue',
            status: 'submitted',
            goal: 'Stabilize port access',
            mechanism: 'Diplomatic pressure',
            move: 2,
            phase: 3
        });

        expect(markup).not.toContain('Send to Red Team');
    });

    it('renders Blue Team wizard fields on facilitator action cards', async () => {
        const { FacilitatorController } = await loadFacilitatorModule();
        const { serializeBlueActionDetails } = await import('../features/actions/blueActionDetails.js');
        global.document = createFakeDocument();

        const controller = new FacilitatorController();
        controller.actions = [{
            id: 'action-blue-0',
            team: 'blue',
            move: 2,
            created_at: '2026-04-08T09:00:00.000Z'
        }, {
            id: 'action-blue-1',
            team: 'blue',
            move: 2,
            created_at: '2026-04-08T10:00:00.000Z',
            status: 'draft',
            goal: 'Stabilize biotech leverage',
            mechanism: 'Economic',
            sector: 'Biotechnology',
            exposure_type: 'Advanced Manufacturing',
            targets: ['PRC', 'Japan'],
            expected_outcomes: 'Reduce exposure before the next move.',
            ally_contingencies: serializeBlueActionDetails({
                objective: 'Lower upstream dependency on PRC inputs.',
                lever: 'Export Controls',
                implementation: 'Executive Order',
                enforcementTimeline: '6 months',
                coordinated: ['Executive'],
                informed: ['Allied']
            })
        }];
        const markup = controller.renderActionCard(controller.actions[1]);

        expect(markup).toContain('Objective:</strong> Lower upstream dependency on PRC inputs.');
        expect(markup).toContain('Lever:</strong> Export Controls');
        expect(markup).toContain('Coordinated:</strong> Executive');
        expect(markup).toContain('Informed:</strong> Allied');
        expect(markup).toContain('Timeline:</strong> 6 months');
        expect(markup).toContain('Blue Team | Move 2 | Action 2');
    });

    it('renders checkbox groups for facilitator modal multi-select fields', async () => {
        const { FacilitatorController } = await loadFacilitatorModule();
        global.document = createFakeDocument();

        const controller = new FacilitatorController();
        const blueWizardMarkup = controller.createBlueActionWizardContent().innerHTML;
        const actionFormMarkup = controller.createActionFormContent().innerHTML;

        expect(blueWizardMarkup).toContain('data-blue-action-checkbox="country"');
        expect(blueWizardMarkup).toContain('Select one or more countries.');
        expect(blueWizardMarkup).not.toContain('Hold Ctrl');

        expect(actionFormMarkup).toContain('data-action-checkbox="target"');
        expect(actionFormMarkup).toContain('Select one or more targets.');
        expect(actionFormMarkup).not.toContain('Hold Ctrl');

        controller.showCreateRfiModal();

        const rfiModalConfig = showModal.mock.calls.at(-1)?.[0];
        expect(rfiModalConfig?.content?.innerHTML).toContain('data-rfi-checkbox="category"');
        expect(rfiModalConfig?.content?.innerHTML).toContain('Select all categories that apply.');
        expect(rfiModalConfig?.content?.innerHTML).not.toContain('Hold Ctrl');
    });

    it('collects checked checkbox values from facilitator action forms', async () => {
        const { FacilitatorController } = await loadFacilitatorModule();
        const controller = new FacilitatorController();

        const blueWizardFieldValues = {
            '#actionTitle': 'Secure corridor access',
            '#actionInstrument': 'Economic',
            '#actionObjective': 'Stabilize trade flows.',
            '#actionLever': 'Export Controls',
            '#actionBlueSector': 'Biotechnology',
            '#actionSupplyChainFocus': 'Critical Minerals',
            '#actionImplementation': 'Executive Order',
            '#actionEnforcementTimeline': '6 months',
            '#actionExpectedOutcomes': 'Reduce dependency on vulnerable routes.',
            '#actionBlueSectorOther': '',
            '#actionImplementationOther': ''
        };

        const wizardData = controller.getBlueActionWizardData({
            querySelector(selector) {
                if (!(selector in blueWizardFieldValues)) {
                    return null;
                }

                return { value: blueWizardFieldValues[selector] };
            },
            querySelectorAll(selector) {
                if (selector === '[data-blue-action-checkbox="country"]:checked') {
                    return [{ value: 'Kenya' }, { value: 'Ghana' }];
                }

                if (selector === '[data-blue-action-checkbox="coordinated"]:checked') {
                    return [{ value: 'Executive' }];
                }

                if (selector === '[data-blue-action-checkbox="informed"]:checked') {
                    return [{ value: 'Allied' }];
                }

                return [];
            }
        });

        expect(wizardData.focusCountries).toEqual(['Kenya', 'Ghana']);
        expect(wizardData.coordinated).toEqual(['Executive']);
        expect(wizardData.informed).toEqual(['Allied']);

        global.document = {
            getElementById(id) {
                return {
                    actionGoal: { value: 'Secure corridor access' },
                    actionMechanism: { value: 'economic' },
                    actionSector: { value: 'biotechnology' },
                    actionExposureType: { value: 'Supply Chain' },
                    actionPriority: { value: 'HIGH' },
                    actionExpectedOutcomes: { value: 'Reduce dependency on vulnerable routes.' },
                    actionAllyContingencies: { value: 'Coordinate with allied exporters.' }
                }[id] || null;
            },
            querySelectorAll(selector) {
                if (selector === '[data-action-checkbox="target"]:checked') {
                    return [{ value: 'PRC' }, { value: 'RUS' }];
                }

                return [];
            }
        };

        const formData = controller.getActionFormData();
        expect(formData.targets).toEqual(['PRC', 'RUS']);
    });

    it('builds Green proposals with a concrete persisted mechanism label', async () => {
        const { FacilitatorController } = await loadFacilitatorModule();
        const controller = new FacilitatorController();

        const payload = controller.buildGreenProposalPayload({
            title: 'Align biotech export posture',
            originators: ['EU', 'Japan'],
            objective: 'Coordinate export controls across allied channels.',
            category: 'Alignment',
            intendedPartners: 'Blue Team',
            focusSector: 'Biotechnology',
            delivery: 'Joint Statement',
            timingAndConditions: 'Next move after White Cell approval.',
            expectedOutcomes: 'Reduce room for adversarial arbitrage.'
        }, {
            recipientTeam: 'blue'
        });

        expect(payload.mechanism).toBe('Proposal');
        expect(payload.ally_contingencies).toContain('Proposal Details');
        expect(payload.ally_contingencies).toContain('Recipient Team: blue');
    });

    it('shows forwarded proposals in both the received proposals inbox and the responses feed', async () => {
        const { FacilitatorController } = await loadFacilitatorModule();
        const { communicationsStore } = await import('../stores/communications.js');
        const { buildWhiteCellRecipientMetadata } = await import('../features/communications/targeting.js');

        const responsesList = createFakeElement('responsesList');
        const proposalsList = createFakeElement('receivedProposalsList');
        const proposalsBadge = createFakeElement('receivedProposalsBadge');

        global.document = {
            createElement(tagName) {
                return createFakeElement(null, tagName);
            },
            getElementById(id) {
                return {
                    responsesList,
                    receivedProposalsList: proposalsList,
                    receivedProposalsBadge: proposalsBadge
                }[id] || null;
            }
        };

        vi.spyOn(communicationsStore, 'getAll').mockReturnValue([{
            id: 'comm-forwarded-1',
            from_role: 'whitecell_lead',
            to_role: 'whitecell_lead',
            type: 'PROPOSAL_FORWARDED',
            content: 'Forwarded Green Team proposal (sent by White Cell after review).',
            created_at: '2026-04-09T10:06:00.000Z',
            metadata: buildWhiteCellRecipientMetadata('blue', {
                source_team: 'green',
                outcome: 'SUCCESS',
                proposal: {
                    title: 'Joint Port Proposal',
                    originators: ['EU', 'Japan'],
                    category: 'Alignment',
                    intendedPartners: 'Blue Team',
                    focusSector: 'Biotechnology',
                    delivery: 'Joint Statement',
                    objective: 'Align port licensing posture.',
                    timingAndConditions: 'Immediately after White Cell review.',
                    expectedOutcomes: 'Reduce room for arbitrage.'
                }
            })
        }]);

        const controller = new FacilitatorController();
        controller.syncResponsesFromStores();
        controller.syncReceivedProposalsFromStore();

        expect(responsesList.innerHTML).toContain('Received Proposal: Joint Port Proposal');
        expect(responsesList.innerHTML).toContain('FORWARDED PROPOSAL');
        expect(proposalsList.innerHTML).toContain('Joint Port Proposal');
        expect(proposalsList.innerHTML).toContain('Forwarded from Green Team');
        expect(proposalsBadge.textContent).toBe('1');
        expect(proposalsBadge.hidden).toBe(false);
    });

    it('shows recipient decline updates on the Green facilitator proposal card', async () => {
        const { FacilitatorController } = await loadFacilitatorModule();
        const { communicationsStore } = await import('../stores/communications.js');
        global.document = createFakeDocument();

        vi.spyOn(communicationsStore, 'getAll').mockReturnValue([{
            id: 'comm-forwarded-declined-1',
            type: 'PROPOSAL_FORWARDED',
            created_at: '2026-04-09T10:06:00.000Z',
            metadata: {
                source_proposal_id: 'proposal-green-1',
                recipient_team: 'blue',
                proposal_recipient_state: {
                    status: 'declined',
                    actioned_at: '2026-04-09T10:20:00.000Z'
                }
            }
        }]);

        const controller = new FacilitatorController();
        controller.teamId = 'green';
        controller.teamLabel = 'Green Team';

        const markup = controller.renderActionCard({
            id: 'proposal-green-1',
            team: 'green',
            status: 'adjudicated',
            goal: 'Joint Port Proposal',
            mechanism: 'Proposal',
            sector: 'Biotechnology',
            expected_outcomes: 'Reduce room for arbitrage.',
            move: 2,
            phase: 1
        });

        expect(markup).toContain('Recipient Team:</strong> Blue Team');
        expect(markup).toContain('Recipient Status:</strong> Declined');
    });

    it('rerenders facilitator proposal cards when communications change', async () => {
        const { FacilitatorController } = await loadFacilitatorModule();
        const { communicationsStore } = await import('../stores/communications.js');

        const controller = new FacilitatorController();
        const renderActionsList = vi.spyOn(controller, 'renderActionsList').mockImplementation(() => {});
        vi.spyOn(controller, 'syncResponsesFromStores').mockImplementation(() => {});
        vi.spyOn(controller, 'syncReceivedProposalsFromStore').mockImplementation(() => {});
        vi.spyOn(controller, 'syncWhiteCellUpdateSectionsFromStore').mockImplementation(() => {});

        controller.subscribeToLiveData();
        communicationsStore.notify('updated', {
            id: 'comm-forwarded-declined-2',
            type: 'PROPOSAL_FORWARDED'
        });

        expect(renderActionsList).toHaveBeenCalled();

        controller.destroy();
    });

    it('builds Red move responses with a concrete persisted mechanism label', async () => {
        const { FacilitatorController } = await loadFacilitatorModule();
        const controller = new FacilitatorController();

        const payload = controller.buildRedResponsePayload({
            title: 'Counter logistics corridor squeeze',
            strategicAssessment: 'Blue is tightening maritime leverage.',
            responseStrategy: 'Exploit alternate port relationships.',
            keyActions: 'Shift freight and publicize redundancy measures.',
            targetsAndPressurePoints: 'Port authorities and customs timing.',
            deliveryChannel: 'Backchannel assurances to carriers.',
            expectedEffect: 'Preserve throughput and deny escalation payoff.'
        });

        expect(payload.mechanism).toBe('Move Response');
        expect(payload.ally_contingencies).toContain('Move Response Details');
        expect(payload.ally_contingencies).toContain('Delivery Channel: Backchannel assurances to carriers.');
    });

    it('builds Tribe Street Journal entries from team capture events only', async () => {
        const { buildTribeStreetJournalEntries } = await loadFacilitatorModule();

        const entries = buildTribeStreetJournalEntries([
            {
                id: 'blue-note',
                team: 'blue',
                type: 'NOTE',
                content: 'Blue team observation',
                created_at: '2026-04-09T10:05:00.000Z'
            },
            {
                id: 'blue-quote',
                team: 'blue',
                type: 'QUOTE',
                content: 'Quoted minister',
                created_at: '2026-04-09T10:06:00.000Z'
            },
            {
                id: 'blue-save-event',
                team: 'blue',
                type: 'NOTE',
                content: 'Saved notetaker note',
                created_at: '2026-04-09T10:07:00.000Z',
                metadata: {
                    source: 'notetaker_save'
                }
            },
            {
                id: 'white-cell-note',
                team: 'white_cell',
                type: 'NOTE',
                content: 'White Cell note',
                created_at: '2026-04-09T10:08:00.000Z'
            },
            {
                id: 'blue-action',
                team: 'blue',
                type: 'ACTION_CREATED',
                content: 'Action created',
                created_at: '2026-04-09T10:09:00.000Z'
            }
        ], 'blue');

        expect(entries.map((entry) => entry.id)).toEqual([
            'blue-quote',
            'blue-note'
        ]);
    });

    it('renders the Tribe Street Journal embed panel above facilitator journal entries', async () => {
        const { FacilitatorController } = await loadFacilitatorModule();
        const embedContainer = createFakeElement('tribeStreetJournalEmbed');
        const container = createFakeElement('tribeStreetJournalList');

        global.document = {
            createElement(tagName) {
                return createFakeElement(null, tagName);
            },
            getElementById(id) {
                return {
                    tribeStreetJournalEmbed: embedContainer,
                    tribeStreetJournalList: container
                }[id] || null;
            }
        };

        const controller = new FacilitatorController();
        controller.journalUpdates = [];
        controller.journalEntries = [{
            id: 'journal-1',
            type: 'NOTE',
            content: 'Harbor operators expect customs delays by nightfall.',
            move: 2,
            phase: 1,
            created_at: '2026-04-09T10:05:00.000Z',
            metadata: {
                actor: 'Blue Scribe'
            }
        }];

        controller.renderTribeStreetJournalList();

        expect(embedContainer.innerHTML).toContain('https://tribestreetjournal.com/');
        expect(embedContainer.innerHTML).toContain('Open in new tab');
        expect(container.innerHTML).toContain('Harbor operators expect customs delays by nightfall.');
    });
});
