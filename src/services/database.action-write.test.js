import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
    mockSupabase,
    mockEnsureBrowserIdentity,
    mockSessionStore
} = vi.hoisted(() => ({
    mockSupabase: {
        from: vi.fn()
    },
    mockEnsureBrowserIdentity: vi.fn(),
    mockSessionStore: {
        getClientId: vi.fn(() => 'client-action-write-test')
    }
}));

vi.mock('./supabase.js', () => ({
    supabase: mockSupabase,
    ensureBrowserIdentity: mockEnsureBrowserIdentity,
    getRuntimeConfigStatus: () => ({ ready: true })
}));

vi.mock('../stores/session.js', () => ({
    sessionStore: mockSessionStore
}));

function mockInsertChain(result = { id: 'action-created' }) {
    const single = vi.fn().mockResolvedValue({
        data: result,
        error: null
    });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));

    mockSupabase.from.mockReturnValue({
        insert
    });

    return { insert };
}

function mockUpdateChain(result = { id: 'action-updated' }) {
    const single = vi.fn().mockResolvedValue({
        data: result,
        error: null
    });
    const select = vi.fn(() => ({ single }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));

    mockSupabase.from.mockReturnValue({
        update
    });

    return { update };
}

describe('database action write contracts', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        mockEnsureBrowserIdentity.mockResolvedValue({
            access_token: 'anon-token'
        });
    });

    it('derives the proposal mechanism before inserting a Green proposal row', async () => {
        const { database } = await import('./database.js');
        const { serializeProposalDetails } = await import('../features/actions/proposalDetails.js');
        const { insert } = mockInsertChain();

        await database.createAction({
            session_id: 'session-1',
            client_id: 'client-action-write-test',
            move: 1,
            phase: 1,
            team: 'green',
            mechanism: null,
            sector: 'Biotechnology',
            exposure_type: null,
            targets: [],
            goal: 'Green proposal',
            expected_outcomes: 'Secure allied alignment.',
            ally_contingencies: serializeProposalDetails({
                originators: ['EU'],
                objective: 'Coordinate a joint line.',
                category: 'Alignment',
                intendedPartners: 'Blue Team',
                delivery: 'Joint Statement',
                timingAndConditions: 'Next move',
                recipientTeam: 'blue'
            }),
            priority: 'NORMAL',
            status: 'submitted'
        });

        expect(insert).toHaveBeenCalledWith(expect.objectContaining({
            mechanism: 'Proposal'
        }));
    });

    it('derives the move-response mechanism before updating a Red draft row', async () => {
        const { database } = await import('./database.js');
        const { serializeMoveResponseDetails } = await import('../features/actions/moveResponseDetails.js');
        const { update } = mockUpdateChain();

        await database.updateAction('action-2', {
            mechanism: null,
            ally_contingencies: serializeMoveResponseDetails({
                strategicAssessment: 'Blue is testing shipping capacity.',
                responseStrategy: 'Absorb pressure through alternate routing.',
                keyActions: 'Shift freight priorities.',
                targetsAndPressurePoints: 'Ports and logistics timing.',
                deliveryChannel: 'Private shipping briefings.'
            })
        });

        expect(update).toHaveBeenCalledWith(expect.objectContaining({
            mechanism: 'Move Response'
        }));
    });

    it('fails fast when a non-special action write omits a mechanism', async () => {
        const { database } = await import('./database.js');
        mockInsertChain();

        await expect(database.createAction({
            session_id: 'session-1',
            client_id: 'client-action-write-test',
            move: 1,
            phase: 1,
            team: 'blue',
            mechanism: null,
            sector: 'energy',
            exposure_type: 'tariff',
            targets: ['Target State'],
            goal: 'Generic action without a mechanism',
            expected_outcomes: 'Should not persist.',
            ally_contingencies: 'Coordinate quietly.',
            priority: 'NORMAL'
        })).rejects.toMatchObject({
            name: 'DatabaseError',
            message: 'Action mechanism is required.'
        });
    });
});
