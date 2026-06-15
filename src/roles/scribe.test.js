import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

import {
    SCRIBE_DECK_SECTIONS,
    expandScribeDeckSections,
    flattenScribeDeckSlides,
    getScribeDeckAssignmentDetails,
    normalizeScribeDeckPath
} from '../features/scribe/deckConfig.js';
import { serializeBlueActionDetails } from '../features/actions/blueActionDetails.js';

const BLUE_SCRIBE_HTML_PATH = new URL('../../teams/blue/scribe.html', import.meta.url);
const SCRIBE_CSS_PATH = new URL('../../styles/pages/scribe.css', import.meta.url);

vi.mock('../components/ui/Toast.js', () => ({
    showToast: vi.fn()
}));

function toDatasetKey(attributeName = '') {
    return attributeName
        .replace(/^data-/, '')
        .replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
}

function createFakeElement(id = null, className = '') {
    const attributes = new Map();
    const classes = new Set(
        String(className)
            .split(/\s+/)
            .filter(Boolean)
    );
    let textContent = '';
    let innerHTML = '';

    const element = {
        id,
        hidden: false,
        dataset: {},
        get textContent() {
            return textContent;
        },
        set textContent(value) {
            textContent = value == null ? '' : String(value);
            innerHTML = textContent;
        },
        get innerHTML() {
            return innerHTML;
        },
        set innerHTML(value) {
            innerHTML = value == null ? '' : String(value);
        },
        get className() {
            return [...classes].join(' ');
        },
        set className(value) {
            classes.clear();
            String(value)
                .split(/\s+/)
                .filter(Boolean)
                .forEach((classToken) => classes.add(classToken));
        },
        setAttribute(name, value) {
            const normalizedValue = value == null ? '' : String(value);
            attributes.set(name, normalizedValue);

            if (name === 'class') {
                element.className = normalizedValue;
            }

            if (name.startsWith('data-')) {
                element.dataset[toDatasetKey(name)] = normalizedValue;
            }
        },
        getAttribute(name) {
            if (name === 'class') {
                return element.className;
            }

            return attributes.get(name) ?? null;
        },
        removeAttribute(name) {
            attributes.delete(name);

            if (name.startsWith('data-')) {
                delete element.dataset[toDatasetKey(name)];
            }
        },
        classList: {
            add: (...tokens) => {
                tokens.filter(Boolean).forEach((token) => classes.add(token));
            },
            remove: (...tokens) => {
                tokens.filter(Boolean).forEach((token) => classes.delete(token));
            },
            contains: (token) => classes.has(token)
        }
    };

    if (className) {
        attributes.set('class', element.className);
    }

    return element;
}

function createFakeDocument() {
    const elements = new Map();
    const body = createFakeElement('body');

    return {
        body,
        register(element) {
            if (element?.id) {
                elements.set(element.id, element);
            }

            return element;
        },
        getElementById(id) {
            return elements.get(id) || null;
        }
    };
}

async function loadScribeModule() {
    globalThis.__ESG_DISABLE_AUTO_INIT__ = true;
    vi.resetModules();
    return import('./scribe.js');
}

describe('scribe surface', () => {
    afterEach(() => {
        delete globalThis.__ESG_DISABLE_AUTO_INIT__;
        global.document?.body?.removeAttribute?.('data-scribe-presentation');
        global.document?.body?.removeAttribute?.('data-role-surface');
        global.document?.body?.removeAttribute?.('data-scribe-deck-state');
        delete global.document;
    });

    it('extracts facilitator deck slide data from the standalone deck html payload', async () => {
        const { parseFacilitatorDeckHtml } = await loadScribeModule();
        const slides = parseFacilitatorDeckHtml(`
            <script>
                const SLIDES = [{"n":1,"title":"Intro","src":"data:image/png;base64,AAA="}];
                const SECTIONS = [];
            </script>
        `);

        expect(slides).toEqual([{
            n: 1,
            title: 'Intro',
            src: 'data:image/png;base64,AAA='
        }]);
    });

    it('routes only the dedicated scribe seat onto the scribe surface', async () => {
        const { getScribeAccessState } = await loadScribeModule();
        const teamContext = {
            teamId: 'blue',
            scribeRole: 'blue_scribe',
            facilitatorRole: 'blue_facilitator',
            facilitatorRoute: '/teams/blue/facilitator.html',
            observerRoute: '/teams/blue/facilitator.html?mode=observer'
        };

        expect(getScribeAccessState({
            role: 'blue_scribe',
            teamContext
        })).toMatchObject({
            allowed: true,
            reason: null,
            redirectRoute: null
        });

        expect(getScribeAccessState({
            role: 'blue_facilitator',
            teamContext
        })).toMatchObject({
            allowed: false,
            reason: 'facilitator-route',
            redirectRoute: '/teams/blue/facilitator.html'
        });
    });

    it('resolves the latest visible White Cell deck assignment for the active scribe team', async () => {
        const { resolveAssignedScribeDeck } = await loadScribeModule();

        const teamContext = {
            teamId: 'blue',
            scribeRole: 'blue_scribe'
        };
        const assignment = resolveAssignedScribeDeck([
            {
                id: 'comm-scribe-new',
                from_role: 'white_cell',
                to_role: 'blue_scribe',
                created_at: '2026-06-15T11:05:00.000Z',
                metadata: {
                    content_kind: 'SCRIBE_DECK_ASSIGNMENT',
                    recipient: 'blue_scribe',
                    recipient_scope: 'role',
                    recipient_team: 'blue',
                    recipient_role: 'blue_scribe',
                    deck_path: 'custom-scribe-deck.html',
                    deck_label: 'Blue Crisis Deck'
                }
            },
            {
                id: 'comm-facilitator',
                from_role: 'white_cell',
                to_role: 'blue_facilitator',
                created_at: '2026-06-15T11:00:00.000Z',
                metadata: {
                    content_kind: 'SCRIBE_DECK_ASSIGNMENT',
                    recipient: 'blue_facilitator',
                    recipient_scope: 'role',
                    recipient_team: 'blue',
                    recipient_role: 'blue_facilitator',
                    deck_path: 'ignored-facilitator-deck.html',
                    deck_label: 'Ignore Me'
                }
            }
        ], teamContext);

        expect(assignment).toMatchObject({
            communicationId: 'comm-scribe-new',
            deckPath: 'decks/blue/custom-scribe-deck.html',
            deckLabel: 'Blue Crisis Deck'
        });
    });

    it('normalizes bare deck filenames into the recipient team deck folder', () => {
        expect(normalizeScribeDeckPath('custom-scribe-deck.html', {
            teamId: 'red'
        })).toBe('decks/red/custom-scribe-deck.html');

        expect(getScribeDeckAssignmentDetails({
            id: 'comm-red-scribe',
            created_at: '2026-06-15T12:00:00.000Z',
            metadata: {
                content_kind: 'SCRIBE_DECK_ASSIGNMENT',
                recipient_team: 'red',
                deck_path: 'support-brief.html',
                deck_label: ''
            }
        })).toMatchObject({
            communicationId: 'comm-red-scribe',
            recipientTeam: 'red',
            deckPath: 'decks/red/support-brief.html',
            deckLabel: 'support brief'
        });
    });

    it('keeps the requested sidebar sections while reserving Actions for live facilitator decisions', () => {
        const slides = Array.from({ length: 61 }, (_entry, index) => ({
            n: index + 1,
            title: `Slide ${index + 1}`,
            src: `data:image/png;base64,slide-${index + 1}`
        }));

        const sections = expandScribeDeckSections(slides);
        const flattenedSlides = flattenScribeDeckSlides(sections);
        const actionSection = sections.find((section) => section.id === 'actions');

        expect(SCRIBE_DECK_SECTIONS.map((section) => section.label)).toEqual([
            'Actions',
            'Overview',
            'Schedule',
            'Roles and Objectives',
            'BRICS+ Context',
            'Gameplay',
            'Support Materials',
            'Supply Chain Data',
            'Economic Tools',
            'Communications'
        ]);
        expect(actionSection?.slides).toHaveLength(0);
        expect(flattenedSlides).toHaveLength(55);
        expect(flattenedSlides.map((slide) => slide.n)).toEqual(
            Array.from({ length: 61 }, (_entry, index) => index + 1)
                .filter((slideNumber) => ![15, 16, 17, 18, 59, 60].includes(slideNumber))
        );
    });

    it('builds live scribe action slides from facilitator actions instead of deck images', async () => {
        const { buildScribeActionSlides } = await loadScribeModule();

        const placeholderSlides = buildScribeActionSlides([], {
            teamLabel: 'Blue Team'
        });

        expect(placeholderSlides.slideCount).toBe(0);
        expect(placeholderSlides.slides[0]).toMatchObject({
            slideKey: 'actions-placeholder',
            slideType: 'action-placeholder'
        });

        const liveSlides = buildScribeActionSlides([{
            id: 'action-1',
            team: 'blue',
            move: 1,
            phase: 1,
            goal: 'Coordinate allied export controls',
            description: 'Align export restrictions before the next escalation window.',
            expected_outcomes: 'Demonstrate coalition cohesion while constraining supply access.',
            mechanism: 'Economic',
            sector: 'Semiconductors',
            exposure_type: 'Supply Chain',
            targets: ['PRC', 'Japan'],
            priority: 'HIGH',
            status: 'submitted',
            created_at: '2026-06-15T10:00:00.000Z',
            submitted_at: '2026-06-15T10:10:00.000Z'
        }], {
            teamLabel: 'Blue Team'
        });

        expect(liveSlides.slideCount).toBe(1);
        expect(liveSlides.slides[0]).toMatchObject({
            slideKey: 'action-action-1',
            slideType: 'action',
            title: 'Coordinate allied export controls',
            sidebarOrdinal: '1'
        });
    });

    it('renders blue action slides as structured briefing panels that are easier for the team to follow', async () => {
        const { ScribeController } = await loadScribeModule();
        const controller = new ScribeController();
        const action = {
            id: 'action-2',
            team: 'blue',
            move: 2,
            phase: 1,
            goal: 'Tighten critical-mineral export controls',
            description: 'Align allied licensing thresholds before the next market shock.',
            expected_outcomes: 'Slow diversion routes while preserving allied supply assurance.',
            mechanism: 'Economic',
            sector: 'Biotechnology',
            exposure_type: 'Refinement',
            targets: ['PRC', 'EU'],
            priority: 'HIGH',
            status: 'submitted',
            outcome: 'approved',
            adjudication_notes: 'Keep public messaging aligned with allied licensing language.',
            submitted_at: '2026-06-15T10:10:00.000Z',
            adjudicated_at: '2026-06-15T10:25:00.000Z',
            ally_contingencies: serializeBlueActionDetails({
                objective: 'Restrict sensitive mineral processing inputs with allied backing.',
                levers: ['Export Controls', 'Industrial Policy'],
                sectors: ['Biotechnology', 'Agriculture'],
                implementation: 'Legislative',
                legislativeOptions: ['Existing legislation/policy'],
                enforcementTimeline: '6 months',
                coordinated: ['Legislative'],
                informed: ['Allied']
            })
        };

        const html = controller.renderActionSlide({
            slideKey: 'action-action-2',
            slideType: 'action',
            sidebarOrdinal: '1',
            sidebarKicker: 'Blue Team | Move 2 | Action 1',
            action
        });

        expect(html).toContain('What Blue Team is doing');
        expect(html).toContain('Action at a glance');
        expect(html).toContain('Execution snapshot');
        expect(html).toContain('Status and White Cell');
        expect(html).toContain('Focus countries');
        expect(html).toContain('Delivery path');
        expect(html).toContain('Expected effect:');
        expect(html).toContain('White Cell note');
        expect(html).toContain('Keep public messaging aligned with allied licensing language.');
    });

    it('ships a standalone blue scribe html shell with live session state ids and requested sidebar labels', () => {
        const html = readFileSync(BLUE_SCRIBE_HTML_PATH, 'utf8');

        expect(html).toContain('<title>Statecraft Sim | Blue Team Scribe</title>');
        expect(html).toContain('content="Statecraft Sim Blue Team scribe support deck."');
        expect(html).toContain('data-scribe-presentation="standard"');
        expect(html).toContain('../../styles/components/badges.css');
        expect(html).toContain('<header class="page-header" id="pageHeader">');
        expect(html).toContain('class="header-title-section"');
        expect(html).toContain('class="header-session-info"');
        expect(html).toContain('id="sessionName"');
        expect(html).toContain('id="headerMove"');
        expect(html).toContain('id="headerPhase"');
        expect(html).toContain('id="timerDisplay"');
        expect(html).toContain('id="scribeSectionList"');
        expect(html).toContain('id="deckSlideImage"');
        expect(html).toContain('id="deckActionFrame"');
        expect(html).toContain('id="slideAnnouncement"');
        expect(html).not.toContain('scribe-sidebar-header');
        expect(html).not.toContain('scribe-stage-hero');
        expect(html).not.toContain('scribe-stage-toolbar');
        expect(html).not.toContain('scribe-stage-footer');
        expect(html).not.toContain('scribe-section-trigger-description');
    });

    it('switches the scribe surface into presentation mode without leaving the sidebar open', async () => {
        const { setScribePresentationMode } = await loadScribeModule();
        const fakeDocument = createFakeDocument();
        const presentBtn = fakeDocument.register(createFakeElement('presentBtn'));
        const sidebar = fakeDocument.register(createFakeElement('sidebar', 'scribe-sidebar sidebar-open'));
        const sidebarOverlay = fakeDocument.register(
            createFakeElement('sidebarOverlay', 'sidebar-overlay sidebar-overlay-visible')
        );
        presentBtn.textContent = 'Present';
        global.document = fakeDocument;

        setScribePresentationMode({ isActive: true });

        expect(document.body.dataset.scribePresentation).toBe('active');
        expect(document.getElementById('presentBtn')?.textContent).toBe('Exit Present');
        expect(document.getElementById('presentBtn')?.getAttribute('aria-pressed')).toBe('true');
        expect(document.getElementById('sidebar')?.classList.contains('sidebar-open')).toBe(false);
        expect(document.getElementById('sidebarOverlay')?.classList.contains('sidebar-overlay-visible')).toBe(false);

        setScribePresentationMode({ isActive: false });

        expect(document.body.dataset.scribePresentation).toBe('standard');
        expect(document.getElementById('presentBtn')?.textContent).toBe('Present');
        expect(document.getElementById('presentBtn')?.getAttribute('aria-pressed')).toBe('false');
    });

    it('reserves a presentation-only layout that hides the sidebar chrome and centers the slide viewer', () => {
        const css = readFileSync(SCRIBE_CSS_PATH, 'utf8');

        expect(css).toContain('html,\nbody {');
        expect(css).toContain('height: 100%;');
        expect(css).toContain('max-width: 100%;');
        expect(css).toContain('overflow-x: hidden;');
        expect(css).toContain('overflow-y: hidden;');
        expect(css).toContain('overscroll-behavior: contain;');
        expect(css).toContain('height: 100vh;');
        expect(css).toContain('width: min(100%, 88rem);');
        expect(css).toContain('.scribe-stage-card {\n    width: min(100%, 88rem);\n    height: 100%;\n    margin-inline: auto;\n    background: transparent;');
        expect(css).toContain('.scribe-stage-frame {\n    position: relative;\n    display: grid;');
        expect(css).toContain('background: transparent;');
        expect(css).toContain('.scribe-stage-image-wrap {\n    position: relative;\n    width: min(100%, 74rem);');
        expect(css).toContain('box-shadow: none;');
        expect(css).toContain('.scribe-slide-link.is-action {');
        expect(css).toContain('.scribe-action-slide::before {');
        expect(css).toContain('.scribe-action-slide-glance-grid {');
        expect(css).toContain('.scribe-action-slide-columns {');
        expect(css).toContain('.scribe-action-slide-note-card {');
        expect(css).toContain('body[data-scribe-presentation="active"] .scribe-sidebar');
        expect(css).toContain('body[data-scribe-presentation="active"] .scribe-stage-card');
        expect(css).toContain('body[data-scribe-presentation="active"] .scribe-stage-nav');
    });
});
