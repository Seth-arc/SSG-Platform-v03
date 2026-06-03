import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const LANDING_HTML_PATH = new URL('../../index.html', import.meta.url);

function extractRoleSurfaces(html) {
    return [...html.matchAll(/data-role-surface="([^"]+)"/g)].map((match) => match[1]);
}

describe('landing public role visibility', () => {
    it('shows only public participant join roles and moves operator roles into operator access', () => {
        const html = readFileSync(LANDING_HTML_PATH, 'utf8');

        expect(extractRoleSurfaces(html)).toEqual([
            'facilitator',
            'scribe',
            'notetaker'
        ]);
        expect(html).not.toContain('data-role-surface="whitecell"');
        expect(html).toContain('Operator Access');
        expect(html).toContain('operatorWhiteCellLeadBtn');
        expect(html).toContain('operatorWhiteCellSupportBtn');
        expect(html).toContain('operatorGameMasterBtn');
    });

    it('renders a boot-loader simulation selector for Fractured Order', () => {
        const html = readFileSync(LANDING_HTML_PATH, 'utf8');

        expect(html).toContain('bootSimulationSelector');
        expect(html).toContain('aria-label="Simulation selection"');
        expect(html).toContain('data-simulation="fractured-order"');
        expect(html).toContain('bootFracturedOrderOption');
    });

    it('keeps the landing poster alt text ASCII-safe', () => {
        const html = readFileSync(LANDING_HTML_PATH, 'utf8');
        const emDash = String.fromCharCode(0x2014);

        expect(html).toContain('Fractured Order - A Seminar Simulation');
        expect(html).not.toContain(`Fractured Order ${emDash} A Seminar Simulation`);
    });

    it('uses the updated landing brand label', () => {
        const html = readFileSync(LANDING_HTML_PATH, 'utf8');

        expect(html).toContain('<title>Statecraft Siumulation Group</title>');
        expect(html).toContain('<p class="boot-label">Statecraft Siumulation Group</p>');
        expect(html).toContain('<span>Statecraft Siumulation Group</span>');
        expect(html).not.toContain('<title>Statecraft Sim</title>');
        expect(html).not.toContain('<p class="boot-label">Statecraft Sim</p>');
    });

    it('contains the operator password field inside a form', () => {
        const html = readFileSync(LANDING_HTML_PATH, 'utf8');

        expect(html).toContain('id="operatorAccessForm"');
        expect(html).toContain('id="operatorAccessUsername"');
        expect(html).toContain('autocomplete="username"');
        expect(html).toContain('id="operatorAccessCode"');
    });
});
