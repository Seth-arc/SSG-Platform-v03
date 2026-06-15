import { sessionStore } from '../stores/session.js';
import { actionsStore } from '../stores/actions.js';
import { createLogger } from '../utils/logger.js';
import { formatDateTime, formatStatus } from '../utils/formatting.js';
import { showToast } from '../components/ui/Toast.js';
import { buildAppPath, navigateToApp } from '../core/navigation.js';
import { getRoleRoute, resolveTeamContext } from '../core/teamContext.js';
import { createOutcomeBadge, createPriorityBadge, createStatusBadge } from '../components/ui/Badge.js';
import { ENUMS, getPhaseLabel } from '../core/enums.js';
import {
    formatActionSequenceLabel,
    formatBlueActionSelection,
    getActionSequenceNumber,
    getBlueActionViewModel
} from '../features/actions/blueActionDetails.js';
import {
    expandScribeDeckSections,
    flattenScribeDeckSlides,
    getSectionIndexForSlideKey
} from '../features/scribe/deckConfig.js';

const logger = createLogger('Scribe');
const FACILITATOR_DECK_PATH = 'fractured-order-facilitator-deck.html';
const ACTIONS_SECTION_ID = 'actions';

export function parseFacilitatorDeckHtml(html = '') {
    const slidesMatch = html.match(/const\s+SLIDES\s*=\s*(\[[\s\S]*?\]);\s*const\s+SECTIONS\s*=/);
    if (!slidesMatch?.[1]) {
        throw new Error('Facilitator deck payload is missing slide data.');
    }

    const slides = JSON.parse(slidesMatch[1]);
    if (!Array.isArray(slides) || !slides.length) {
        throw new Error('Facilitator deck payload did not contain any slides.');
    }

    return slides;
}

export function getScribeAccessState({
    role,
    teamContext,
    observerTeamId = null
}) {
    if (role === teamContext.scribeRole) {
        return {
            allowed: true,
            reason: null,
            redirectRoute: null
        };
    }

    if (role === 'viewer' && observerTeamId === teamContext.teamId) {
        return {
            allowed: false,
            reason: 'observer-route',
            redirectRoute: teamContext.observerRoute
        };
    }

    if (role === 'viewer') {
        return {
            allowed: false,
            reason: 'observer-team-mismatch',
            redirectRoute: observerTeamId
                ? getRoleRoute('viewer', { observerTeamId })
                : ''
        };
    }

    if (role === teamContext.facilitatorRole) {
        return {
            allowed: false,
            reason: 'facilitator-route',
            redirectRoute: teamContext.facilitatorRoute
        };
    }

    return {
        allowed: false,
        reason: 'role-mismatch',
        redirectRoute: getRoleRoute(role, { observerTeamId }) || ''
    };
}

async function fetchFacilitatorDeckSlides() {
    const response = await fetch(buildAppPath(FACILITATOR_DECK_PATH), {
        credentials: 'same-origin'
    });

    if (!response.ok) {
        throw new Error(`Support deck fetch failed with status ${response.status}.`);
    }

    return parseFacilitatorDeckHtml(await response.text());
}

function isEditableTarget(element) {
    const tagName = element?.tagName?.toUpperCase?.() || '';
    return tagName === 'INPUT'
        || tagName === 'TEXTAREA'
        || tagName === 'SELECT'
        || element?.isContentEditable === true;
}

function clampSlideIndex(slides = [], index = 0) {
    if (!slides.length) {
        return 0;
    }

    return Math.min(Math.max(index, 0), slides.length - 1);
}

function escapeHtml(value) {
    if (typeof value !== 'string') {
        return '';
    }

    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll('\'', '&#39;');
}

function normalizeActionTimestamp(action = {}) {
    const timestamp = action.submitted_at
        || action.updated_at
        || action.created_at
        || '';
    const parsed = new Date(timestamp).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
}

function sortTeamActions(actions = []) {
    return [...actions]
        .filter(Boolean)
        .sort((left, right) => {
            const moveDelta = (left?.move || 0) - (right?.move || 0);
            if (moveDelta !== 0) {
                return moveDelta;
            }

            const timestampDelta = normalizeActionTimestamp(left) - normalizeActionTimestamp(right);
            if (timestampDelta !== 0) {
                return timestampDelta;
            }

            return String(left?.id || '').localeCompare(String(right?.id || ''));
        });
}

function getSlideKey(slide = null) {
    if (!slide) {
        return '';
    }

    if (slide.slideKey) {
        return slide.slideKey;
    }

    if (Number.isFinite(slide.n)) {
        return `deck-${slide.n}`;
    }

    return '';
}

function buildActionPlaceholderSlide({
    teamLabel = 'Team'
} = {}) {
    return {
        slideKey: 'actions-placeholder',
        slideType: 'action-placeholder',
        title: `Awaiting ${teamLabel} facilitator decisions`,
        sidebarOrdinal: '0',
        sidebarKicker: 'No live action slides yet',
        summary: 'Draft and submitted facilitator decisions will appear here as individual support slides.'
    };
}

export function buildScribeActionSlides(actions = [], {
    teamLabel = 'Team'
} = {}) {
    const sortedActions = sortTeamActions(actions);

    if (!sortedActions.length) {
        return {
            slideCount: 0,
            slides: [buildActionPlaceholderSlide({ teamLabel })]
        };
    }

    const slides = sortedActions.map((action, index) => {
        const actionViewModel = getBlueActionViewModel(action);
        const actionNumber = getActionSequenceNumber(sortedActions, action) || index + 1;
        const sequenceLabel = formatActionSequenceLabel({
            teamLabel,
            move: action.move || 1,
            actionNumber
        });

        return {
            slideKey: `action-${action.id}`,
            slideType: 'action',
            action,
            actionViewModel,
            title: actionViewModel.title,
            sidebarOrdinal: String(actionNumber),
            sidebarKicker: sequenceLabel
        };
    });

    return {
        slideCount: slides.length,
        slides
    };
}

function buildActionSection(actions = [], {
    teamLabel = 'Team'
} = {}) {
    const actionSlides = buildScribeActionSlides(actions, { teamLabel });

    return {
        id: ACTIONS_SECTION_ID,
        label: 'Actions',
        description: 'Live facilitator decisions and adjudication updates for the scribe seat.',
        slideCount: actionSlides.slideCount,
        slides: actionSlides.slides
    };
}

export function setScribePresentationMode({
    isActive = false,
    body = document.body,
    presentButton = document.getElementById('presentBtn'),
    sidebar = document.getElementById('sidebar'),
    overlay = document.getElementById('sidebarOverlay')
} = {}) {
    if (!body) {
        return;
    }

    body.dataset.scribePresentation = isActive ? 'active' : 'standard';

    if (presentButton) {
        presentButton.textContent = isActive ? 'Exit Present' : 'Present';
        presentButton.setAttribute('aria-pressed', String(isActive));
    }

    if (isActive) {
        sidebar?.classList.remove('sidebar-open');
        overlay?.classList.remove('sidebar-overlay-visible');
    }
}

export class ScribeController {
    constructor() {
        this.role = sessionStore.getRole();
        this.teamContext = resolveTeamContext();
        this.teamId = this.teamContext.teamId;
        this.teamLabel = this.teamContext.teamLabel;
        this.facilitatorDeckSlides = [];
        this.teamActions = [];
        this.sections = [];
        this.deckSlides = [];
        this.currentSlideIndex = 0;
        this.activeSectionIndex = 0;
        this.storeUnsubscribers = [];
    }

    async init() {
        logger.info('Initializing scribe interface');

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
        const accessState = getScribeAccessState({
            role: this.role,
            teamContext: this.teamContext,
            observerTeamId
        });

        if (!accessState.allowed) {
            const message = accessState.reason === 'observer-team-mismatch'
                ? 'Observer access is limited to the team selected when you joined the session.'
                : `This page is only available to the ${this.teamLabel} Scribe role.`;

            showToast({
                message,
                type: 'error'
            });

            navigateToApp(accessState.redirectRoute || '', { replace: true });
            return;
        }

        this.configureShell();
        this.bindEventListeners();
        this.subscribeToLiveData();
        await this.loadDeck();
        this.syncActionsFromStore();

        logger.info('Scribe interface initialized');
    }

    configureShell() {
        document.body.dataset.roleSurface = 'scribe';
        document.body.dataset.scribeDeckState = 'loading';
        setScribePresentationMode({ isActive: false });

        const roleLabel = document.getElementById('sessionRoleLabel');
        const headerTitle = document.querySelector('.header-title');

        if (roleLabel) {
            roleLabel.textContent = 'Scribe';
        }

        if (headerTitle) {
            headerTitle.textContent = `Statecraft Sim | ${this.teamLabel} Scribe`;
        }
    }

    bindEventListeners() {
        document.getElementById('prevSlideBtn')?.addEventListener('click', () => {
            this.setSlideByIndex(this.currentSlideIndex - 1);
        });

        document.getElementById('nextSlideBtn')?.addEventListener('click', () => {
            this.setSlideByIndex(this.currentSlideIndex + 1);
        });

        document.getElementById('presentBtn')?.addEventListener('click', () => {
            void this.togglePresentationMode();
        });

        document.getElementById('deckRetryBtn')?.addEventListener('click', () => {
            void this.loadDeck();
        });

        document.getElementById('scribeSectionList')?.addEventListener('click', (event) => {
            const slideButton = event.target.closest('[data-slide-key]');
            if (slideButton) {
                this.setSlideByKey(slideButton.dataset.slideKey || '');
                return;
            }

            const sectionButton = event.target.closest('[data-section-index]');
            if (sectionButton) {
                this.selectSection(Number(sectionButton.dataset.sectionIndex));
            }
        });

        document.addEventListener('keydown', (event) => {
            if (isEditableTarget(event.target)) {
                return;
            }

            switch (event.key) {
            case 'ArrowLeft':
            case 'PageUp':
                event.preventDefault();
                this.setSlideByIndex(this.currentSlideIndex - 1);
                break;
            case 'ArrowRight':
            case 'PageDown':
                event.preventDefault();
                this.setSlideByIndex(this.currentSlideIndex + 1);
                break;
            case 'Home':
                event.preventDefault();
                this.setSlideByIndex(0);
                break;
            case 'End':
                event.preventDefault();
                this.setSlideByIndex(this.deckSlides.length - 1);
                break;
            case 'f':
            case 'F':
                event.preventDefault();
                document.getElementById('presentBtn')?.click();
                break;
            default:
                break;
            }
        });

        document.addEventListener('fullscreenchange', () => {
            const isPresenting = this.isPresentationModeActive();
            const isFullscreenActive = Boolean(document.fullscreenElement);

            if (isFullscreenActive && !isPresenting) {
                setScribePresentationMode({ isActive: true });
            }

            if (!isFullscreenActive && isPresenting) {
                setScribePresentationMode({ isActive: false });
            }
        });
    }

    subscribeToLiveData() {
        this.storeUnsubscribers.push(
            actionsStore.subscribe(() => {
                this.syncActionsFromStore();
            })
        );
    }

    syncActionsFromStore() {
        this.teamActions = actionsStore.getByTeam(this.teamId);

        if (!this.facilitatorDeckSlides.length) {
            return;
        }

        const preferredSlideKey = this.getCurrentSlideKey();
        const preferActionsSection = this.sections[this.activeSectionIndex]?.id === ACTIONS_SECTION_ID;

        this.rebuildDeck({
            preferredSlideKey,
            preferActionsSection
        });

        if (this.deckSlides.length) {
            this.renderSlide();
        }
    }

    isPresentationModeActive() {
        return document.body?.dataset?.scribePresentation === 'active';
    }

    async togglePresentationMode() {
        const isPresenting = this.isPresentationModeActive();

        if (isPresenting) {
            if (document.fullscreenElement) {
                try {
                    await document.exitFullscreen?.();
                } catch (error) {
                    logger.warn('Fullscreen toggle failed:', error);
                }
            }

            setScribePresentationMode({ isActive: false });
            return;
        }

        setScribePresentationMode({ isActive: true });

        try {
            await document.documentElement.requestFullscreen?.();
        } catch (error) {
            logger.warn('Fullscreen toggle failed:', error);
        }
    }

    async loadDeck() {
        this.setDeckState('loading');
        this.renderDeckState({
            title: 'Loading support deck',
            message: 'Pulling the facilitator deck and live team decisions into the scribe surface.'
        });

        try {
            this.facilitatorDeckSlides = await fetchFacilitatorDeckSlides();
            this.rebuildDeck();

            this.renderSections();
            this.renderSlide();
        } catch (error) {
            logger.error('Failed to load scribe deck:', error);
            this.setDeckState('error');
            this.renderDeckState({
                title: 'Support deck unavailable',
                message: error.message || 'The facilitator support deck could not be loaded for this seat.'
            });
            showToast({
                message: 'The scribe support deck could not be loaded.',
                type: 'error'
            });
        }
    }

    getCurrentSlideKey() {
        return getSlideKey(this.deckSlides[this.currentSlideIndex]);
    }

    rebuildDeck({
        preferredSlideKey = '',
        preferActionsSection = false
    } = {}) {
        const actionSection = buildActionSection(this.teamActions, {
            teamLabel: this.teamLabel
        });
        const staticSections = expandScribeDeckSections(this.facilitatorDeckSlides)
            .filter((section) => section.id !== ACTIONS_SECTION_ID);
        const staticSlides = flattenScribeDeckSlides(staticSections);

        this.sections = [actionSection, ...staticSections];
        this.deckSlides = [...staticSlides, ...actionSection.slides];

        if (!this.deckSlides.length) {
            this.currentSlideIndex = 0;
            this.activeSectionIndex = 0;
            return;
        }

        const preferredIndex = this.deckSlides.findIndex((slide) => getSlideKey(slide) === preferredSlideKey);
        if (preferredIndex >= 0) {
            this.currentSlideIndex = preferredIndex;
        } else if (preferActionsSection && actionSection.slides.length) {
            this.currentSlideIndex = this.deckSlides.findIndex(
                (slide) => getSlideKey(slide) === getSlideKey(actionSection.slides[0])
            );
        } else {
            this.currentSlideIndex = Math.max(
                this.deckSlides.findIndex((slide) => slide.slideType === 'image'),
                0
            );
        }

        this.currentSlideIndex = clampSlideIndex(this.deckSlides, this.currentSlideIndex);
        this.activeSectionIndex = Math.max(
            getSectionIndexForSlideKey(this.sections, this.getCurrentSlideKey()),
            0
        );
    }

    setDeckState(state = 'loading') {
        document.body.dataset.scribeDeckState = state;
    }

    renderDeckState({
        title = '',
        message = ''
    } = {}) {
        const statePanel = document.getElementById('deckStatePanel');
        const stateTitle = document.getElementById('deckStateTitle');
        const stateMessage = document.getElementById('deckStateMessage');
        const stateRetry = document.getElementById('deckRetryBtn');
        const imageFrame = document.getElementById('deckImageFrame');
        const actionFrame = document.getElementById('deckActionFrame');

        if (stateTitle) {
            stateTitle.textContent = title;
        }

        if (stateMessage) {
            stateMessage.textContent = message;
        }

        if (stateRetry) {
            stateRetry.hidden = document.body.dataset.scribeDeckState !== 'error';
        }

        if (statePanel) {
            statePanel.hidden = document.body.dataset.scribeDeckState === 'ready';
        }

        if (imageFrame) {
            imageFrame.hidden = document.body.dataset.scribeDeckState !== 'ready';
        }

        if (actionFrame) {
            actionFrame.hidden = document.body.dataset.scribeDeckState !== 'ready';
        }
    }

    renderSections() {
        const sectionList = document.getElementById('scribeSectionList');
        if (!sectionList) {
            return;
        }

        const currentSlideKey = this.getCurrentSlideKey();
        const resolvedSectionIndex = getSectionIndexForSlideKey(this.sections, currentSlideKey);
        if (resolvedSectionIndex >= 0) {
            this.activeSectionIndex = resolvedSectionIndex;
        }

        sectionList.innerHTML = this.sections.map((section, sectionIndex) => {
            const isExpanded = sectionIndex === this.activeSectionIndex;
            const containsCurrentSlide = section.slides.some((slide) => getSlideKey(slide) === currentSlideKey);
            const visibleSlideCount = Number.isFinite(section.slideCount)
                ? section.slideCount
                : section.slides.length;

            const slideMarkup = section.slides.map((slide, slideIndex) => {
                const isActiveSlide = getSlideKey(slide) === currentSlideKey;
                const isActionSlide = slide.slideType !== 'image';
                const slideOrdinal = slide.sidebarOrdinal || slide.n || slideIndex + 1;
                const slideKicker = slide.slideType === 'image'
                    ? `Slide ${slideIndex + 1} of ${section.slides.length}`
                    : slide.sidebarKicker || `Decision ${slideIndex + 1} of ${Math.max(visibleSlideCount, 1)}`;
                return `
                    <li>
                        <button
                            type="button"
                            class="scribe-slide-link${isActiveSlide ? ' is-active' : ''}${isActionSlide ? ' is-action' : ''}"
                            data-slide-key="${escapeHtml(getSlideKey(slide))}"
                            data-slide-type="${escapeHtml(slide.slideType || 'image')}"
                            ${isActiveSlide ? 'aria-current="true"' : ''}
                        >
                            <span class="scribe-slide-link-number">${escapeHtml(String(slideOrdinal))}</span>
                            <span class="scribe-slide-link-text">
                                <span class="scribe-slide-link-kicker">${escapeHtml(slideKicker)}</span>
                                <span class="scribe-slide-link-title">${escapeHtml(slide.title)}</span>
                            </span>
                        </button>
                    </li>
                `;
            }).join('');

            return `
                <section class="scribe-section-card${containsCurrentSlide ? ' is-current' : ''}">
                    <button
                        type="button"
                        class="scribe-section-trigger${isExpanded ? ' is-expanded' : ''}"
                        data-section-index="${sectionIndex}"
                        aria-expanded="${isExpanded ? 'true' : 'false'}"
                    >
                        <span class="scribe-section-trigger-text">
                            <span class="scribe-section-trigger-title">${escapeHtml(section.label)}</span>
                        </span>
                        <span class="scribe-section-trigger-meta">
                            <span class="scribe-section-count">${visibleSlideCount}</span>
                            <span class="scribe-section-chevron" aria-hidden="true">${isExpanded ? '-' : '+'}</span>
                        </span>
                    </button>
                    <div class="scribe-slide-group"${isExpanded ? '' : ' hidden'}>
                        <ol class="scribe-slide-list">
                            ${slideMarkup}
                        </ol>
                    </div>
                </section>
            `;
        }).join('');
    }

    renderSlide() {
        const slide = this.deckSlides[this.currentSlideIndex];
        if (!slide) {
            this.renderDeckState({
                title: 'No support slides found',
                message: 'The scribe section mapping did not resolve any slides from the facilitator deck.'
            });
            this.setDeckState('error');
            return;
        }

        this.setDeckState('ready');
        this.renderDeckState();

        const activeSectionIndex = Math.max(
            getSectionIndexForSlideKey(this.sections, getSlideKey(slide)),
            0
        );
        const activeSection = this.sections[activeSectionIndex];
        const slideIndexWithinSection = activeSection.slides.findIndex(
            (entry) => getSlideKey(entry) === getSlideKey(slide)
        );

        this.activeSectionIndex = activeSectionIndex;

        const slideImage = document.getElementById('deckSlideImage');
        const imageFrame = document.getElementById('deckImageFrame');
        const actionFrame = document.getElementById('deckActionFrame');
        const announcement = document.getElementById('slideAnnouncement');

        if (slide.slideType === 'image' && slideImage) {
            slideImage.src = slide.src;
            slideImage.alt = `${slide.title} (slide ${slide.n})`;
        }

        if (imageFrame) {
            imageFrame.hidden = slide.slideType !== 'image';
        }

        if (actionFrame) {
            actionFrame.hidden = slide.slideType === 'image';
            if (slide.slideType !== 'image') {
                actionFrame.innerHTML = this.renderActionSlide(slide);
            }
        }

        if (announcement) {
            announcement.textContent = slide.slideType === 'image'
                ? `${activeSection.label}. ${slide.title}. Slide ${this.currentSlideIndex + 1} of ${this.deckSlides.length}.`
                : `${activeSection.label}. ${slide.title}. Decision ${slideIndexWithinSection + 1} of ${Math.max(activeSection.slideCount || activeSection.slides.length, 1)}.`;
        }

        const prevSlideBtn = document.getElementById('prevSlideBtn');
        const nextSlideBtn = document.getElementById('nextSlideBtn');

        prevSlideBtn && (prevSlideBtn.disabled = this.currentSlideIndex === 0);
        nextSlideBtn && (nextSlideBtn.disabled = this.currentSlideIndex >= this.deckSlides.length - 1);

        this.renderSections();
    }

    renderActionSlide(slide) {
        if (slide.slideType === 'action-placeholder') {
            return `
                <article class="scribe-action-slide scribe-action-slide-placeholder">
                    <p class="scribe-action-slide-eyebrow">Live Facilitator Feed</p>
                    <h2 class="scribe-action-slide-title">${escapeHtml(slide.title)}</h2>
                    <p class="scribe-action-slide-summary">${escapeHtml(slide.summary || '')}</p>
                </article>
            `;
        }

        const action = slide.action || {};
        const actionViewModel = slide.actionViewModel || getBlueActionViewModel(action);
        const badges = [
            createStatusBadge(action.status || ENUMS.ACTION_STATUS.DRAFT).outerHTML,
            createPriorityBadge(action.priority || 'NORMAL').outerHTML,
            action.outcome ? createOutcomeBadge(action.outcome).outerHTML : ''
        ].filter(Boolean).join('');
        const targets = formatBlueActionSelection(actionViewModel.focusCountries);
        const coordinated = formatBlueActionSelection(actionViewModel.coordinated, 'None selected');
        const informed = formatBlueActionSelection(actionViewModel.informed, 'None selected');
        const sequenceLabel = slide.sidebarKicker || formatActionSequenceLabel({
            teamLabel: this.teamLabel,
            move: action.move || 1,
            actionNumber: Number(slide.sidebarOrdinal) || 1
        });
        const timingLabel = [
            `Move ${action.move || 1}`,
            getPhaseLabel(action.phase || 1)
        ].join(' | ');
        const submittedLabel = action.submitted_at
            ? formatDateTime(action.submitted_at)
            : '';
        const adjudicatedLabel = action.adjudicated_at
            ? formatDateTime(action.adjudicated_at)
            : '';
        const legacyNotes = actionViewModel.legacyNotes
            ? `
                <p class="scribe-action-slide-detail scribe-action-slide-detail-full">
                    <strong>Additional Notes:</strong> ${escapeHtml(actionViewModel.legacyNotes)}
                </p>
            `
            : '';

        return `
            <article class="scribe-action-slide" data-action-id="${escapeHtml(String(action.id || ''))}">
                <header class="scribe-action-slide-header">
                    <div>
                        <p class="scribe-action-slide-eyebrow">Facilitator Decision</p>
                        <h2 class="scribe-action-slide-title">${escapeHtml(actionViewModel.title)}</h2>
                        <p class="scribe-action-slide-summary">${escapeHtml(sequenceLabel)}</p>
                    </div>
                    <div class="scribe-action-slide-badges">${badges}</div>
                </header>

                <section class="scribe-action-slide-panel">
                    <div class="scribe-action-slide-meta">
                        <span>${escapeHtml(timingLabel)}</span>
                        <span>${escapeHtml(formatStatus(action.status || ENUMS.ACTION_STATUS.DRAFT))}</span>
                    </div>
                    <p class="scribe-action-slide-body">${escapeHtml(actionViewModel.expectedOutcomes || 'No expected outcomes recorded.')}</p>
                    <div class="scribe-action-slide-details">
                        <p class="scribe-action-slide-detail"><strong>Objective:</strong> ${escapeHtml(actionViewModel.objective || 'Not specified')}</p>
                        <p class="scribe-action-slide-detail"><strong>Instrument:</strong> ${escapeHtml(actionViewModel.instrumentOfPower || action.mechanism || 'Not specified')}</p>
                        <p class="scribe-action-slide-detail"><strong>Lever:</strong> ${escapeHtml(actionViewModel.lever || 'Not specified')}</p>
                        <p class="scribe-action-slide-detail"><strong>Implementation:</strong> ${escapeHtml(actionViewModel.implementation || 'Not specified')}</p>
                        <p class="scribe-action-slide-detail"><strong>Focus Countries:</strong> ${escapeHtml(targets)}</p>
                        <p class="scribe-action-slide-detail"><strong>Sector:</strong> ${escapeHtml(actionViewModel.sector || action.sector || 'Not specified')}</p>
                        <p class="scribe-action-slide-detail"><strong>Supply Chain Focus:</strong> ${escapeHtml(actionViewModel.supplyChainFocus || action.exposure_type || 'Not specified')}</p>
                        <p class="scribe-action-slide-detail"><strong>Timeline:</strong> ${escapeHtml(actionViewModel.enforcementTimeline || 'Not specified')}</p>
                        <p class="scribe-action-slide-detail"><strong>Coordinated:</strong> ${escapeHtml(coordinated)}</p>
                        <p class="scribe-action-slide-detail"><strong>Informed:</strong> ${escapeHtml(informed)}</p>
                        ${submittedLabel ? `<p class="scribe-action-slide-detail"><strong>Submitted:</strong> ${escapeHtml(submittedLabel)}</p>` : ''}
                        ${adjudicatedLabel ? `<p class="scribe-action-slide-detail"><strong>Adjudicated:</strong> ${escapeHtml(adjudicatedLabel)}</p>` : ''}
                        ${action.adjudication_notes ? `<p class="scribe-action-slide-detail scribe-action-slide-detail-full"><strong>White Cell Notes:</strong> ${escapeHtml(action.adjudication_notes)}</p>` : ''}
                        ${legacyNotes}
                    </div>
                </section>
            </article>
        `;
    }

    setSlideByIndex(index = 0) {
        if (!this.deckSlides.length) {
            return;
        }

        const nextIndex = clampSlideIndex(this.deckSlides, index);
        if (nextIndex === this.currentSlideIndex) {
            return;
        }

        this.currentSlideIndex = nextIndex;
        this.renderSlide();
    }

    setSlideByKey(slideKey = '') {
        const nextIndex = this.deckSlides.findIndex((slide) => getSlideKey(slide) === slideKey);
        if (nextIndex === -1) {
            return;
        }

        this.currentSlideIndex = nextIndex;
        this.renderSlide();
    }

    selectSection(sectionIndex = 0) {
        const section = this.sections[sectionIndex];
        if (!section?.slides?.length) {
            return;
        }

        this.activeSectionIndex = sectionIndex;
        this.setSlideByKey(getSlideKey(section.slides[0]));
    }
}

const scribeController = new ScribeController();
const shouldAutoInit = typeof document !== 'undefined'
    && !globalThis.__ESG_DISABLE_AUTO_INIT__;

if (shouldAutoInit) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            void scribeController.init();
        });
    } else {
        void scribeController.init();
    }
}

export default scribeController;
