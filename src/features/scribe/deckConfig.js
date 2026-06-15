export const SCRIBE_DECK_SECTIONS = Object.freeze([
    {
        id: 'actions',
        label: 'Actions',
        description: 'Live facilitator decisions and White Cell deliberation updates for the scribe seat.',
        slideNumbers: Object.freeze([])
    },
    {
        id: 'overview',
        label: 'Overview',
        description: 'Exercise framing, objectives, world timeline, and closing context.',
        slideNumbers: Object.freeze([1, 2, 3, 4, 49, 51, 52, 61])
    },
    {
        id: 'schedule',
        label: 'Schedule',
        description: 'Game-day flow, plenaries, room setup, and hot wash timing.',
        slideNumbers: Object.freeze([5, 6, 7, 8, 9, 10, 11, 44, 45, 58])
    },
    {
        id: 'roles-objectives',
        label: 'Roles and Objectives',
        description: 'Actor relationships, blue objectives, team tasks, and role assignments.',
        slideNumbers: Object.freeze([12, 13, 14, 22])
    },
    {
        id: 'brics-context',
        label: 'BRICS+ Context',
        description: 'Strategic sovereign systems framing and alliance composition.',
        slideNumbers: Object.freeze([19, 20, 21])
    },
    {
        id: 'gameplay',
        label: 'Gameplay',
        description: 'Interaction patterns, move flow, prompts, and support-cell framing.',
        slideNumbers: Object.freeze([23, 24, 46, 47, 48, 50])
    },
    {
        id: 'support-materials',
        label: 'Support Materials',
        description: 'Reference materials and sector exploration prompts.',
        slideNumbers: Object.freeze([25, 26])
    },
    {
        id: 'supply-chain-data',
        label: 'Supply Chain Data',
        description: 'Supply-chain maps plus extraction, refinement, and manufacturing datasets.',
        slideNumbers: Object.freeze([27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39])
    },
    {
        id: 'economic-tools',
        label: 'Economic Tools',
        description: 'U.S. instruments, authorities, and tool-selection reference.',
        slideNumbers: Object.freeze([41, 42, 43])
    },
    {
        id: 'communications',
        label: 'Communications',
        description: 'Tribe Street Journal and support-cell communications context.',
        slideNumbers: Object.freeze([40, 53, 54, 55, 56, 57])
    }
]);

export function expandScribeDeckSections(slides = []) {
    const slideMap = new Map(
        slides
            .filter((slide) => Number.isFinite(slide?.n))
            .map((slide) => [slide.n, {
                ...slide,
                slideKey: `deck-${slide.n}`,
                slideType: 'image',
                sortOrder: slide.n
            }])
    );

    return SCRIBE_DECK_SECTIONS.map((section) => ({
        ...section,
        slides: section.slideNumbers
            .map((slideNumber) => slideMap.get(slideNumber))
            .filter(Boolean)
    }));
}

export function flattenScribeDeckSlides(sections = []) {
    const seenSlideKeys = new Set();

    return sections
        .flatMap((section) => section?.slides || [])
        .filter((slide) => {
            const slideKey = slide?.slideKey || (Number.isFinite(slide?.n) ? `deck-${slide.n}` : null);
            if (!slide || !slideKey || seenSlideKeys.has(slideKey)) {
                return false;
            }

            seenSlideKeys.add(slideKey);
            return true;
        })
        .sort((left, right) => {
            const leftOrder = Number.isFinite(left?.sortOrder) ? left.sortOrder : Number.MAX_SAFE_INTEGER;
            const rightOrder = Number.isFinite(right?.sortOrder) ? right.sortOrder : Number.MAX_SAFE_INTEGER;

            if (leftOrder !== rightOrder) {
                return leftOrder - rightOrder;
            }

            return String(left?.slideKey || '').localeCompare(String(right?.slideKey || ''));
        });
}

export function getSectionIndexForSlideNumber(sections = [], slideNumber = null) {
    return sections.findIndex((section) => (
        (section?.slides || []).some((slide) => slide.n === slideNumber)
    ));
}

export function getSectionIndexForSlideKey(sections = [], slideKey = '') {
    return sections.findIndex((section) => (
        (section?.slides || []).some((slide) => (slide?.slideKey || '') === slideKey)
    ));
}
