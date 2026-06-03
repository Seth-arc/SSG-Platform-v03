import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

function readText(relativePath) {
    return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

function extractTitle(html) {
    return html.match(/<title>([^<]+)<\/title>/i)?.[1] ?? '';
}

function extractMetaDescription(html) {
    return html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1] ?? '';
}

function extractHeaderTitle(html) {
    return html.match(/<h1 class="header-title">([^<]+)<\/h1>/i)?.[1] ?? '';
}

describe('public naming', () => {
    it('uses Statecraft Sim on the landing page and in repo-facing metadata', () => {
        const landingHtml = readText('../../index.html');
        const readme = readText('../../README.md');
        const packageJson = JSON.parse(readText('../../package.json'));

        expect(extractTitle(landingHtml)).toBe('Statecraft Sim');
        expect(extractMetaDescription(landingHtml)).toBe(
            'Statecraft Sim seminar simulation platform for participants and operators.'
        );
        expect(landingHtml).toContain('<p class="boot-label">Statecraft Sim</p>');
        expect(landingHtml).toContain('<span>Statecraft Sim</span>');
        expect(landingHtml).not.toContain('SSG Platform');
        expect(landingHtml).not.toContain('Statecraft Simulations Group');
        expect(landingHtml).not.toContain('ESG Economic Statecraft Simulation Platform');

        expect(readme).toContain('# Statecraft Sim');
        expect(readme).toContain('Public product name: `Statecraft Sim`.');
        expect(readme).toContain('Legacy `SSG` and `esg` identifiers still appear');
        expect(packageJson.description).toBe('Statecraft Sim seminar simulation platform');
    });

    it('keeps operator and participant surfaces aligned on Statecraft Sim', () => {
        const expectations = [
            {
                path: '../../master.html',
                title: 'Statecraft Sim | Game Master Operator Console',
                description: 'Statecraft Sim Game Master operator console.',
                header: 'Statecraft Sim | Game Master Operator Console'
            },
            {
                path: '../../whitecell.html',
                title: 'Statecraft Sim | White Cell Operator Interface',
                description: 'Statecraft Sim White Cell operator interface.',
                header: 'Statecraft Sim | White Cell'
            },
            {
                path: '../../teams/blue/facilitator.html',
                title: 'Statecraft Sim | Blue Team Facilitator',
                description: 'Statecraft Sim Blue Team facilitator interface.',
                header: 'Statecraft Sim | Blue Team Facilitator'
            },
            {
                path: '../../teams/red/facilitator.html',
                title: 'Statecraft Sim | Red Team Facilitator',
                description: 'Statecraft Sim Red Team facilitator interface.',
                header: 'Statecraft Sim | Red Team Facilitator'
            },
            {
                path: '../../teams/green/facilitator.html',
                title: 'Statecraft Sim | Green Team Facilitator',
                description: 'Statecraft Sim Green Team facilitator interface.',
                header: 'Statecraft Sim | Green Team Facilitator'
            },
            {
                path: '../../teams/blue/notetaker.html',
                title: 'Statecraft Sim | Blue Team Notetaker',
                description: 'Statecraft Sim Blue Team notetaker interface.',
                header: 'Statecraft Sim | Blue Team Notetaker'
            },
            {
                path: '../../teams/red/notetaker.html',
                title: 'Statecraft Sim | Red Team Notetaker',
                description: 'Statecraft Sim Red Team notetaker interface.',
                header: 'Statecraft Sim | Red Team Notetaker'
            },
            {
                path: '../../teams/green/notetaker.html',
                title: 'Statecraft Sim | Green Team Notetaker',
                description: 'Statecraft Sim Green Team notetaker interface.',
                header: 'Statecraft Sim | Green Team Notetaker'
            }
        ];

        for (const surface of expectations) {
            const html = readText(surface.path);

            expect(extractTitle(html)).toBe(surface.title);
            expect(extractMetaDescription(html)).toBe(surface.description);
            expect(extractHeaderTitle(html)).toBe(surface.header);
            expect(html).not.toContain('ESG Simulation');
        }
    });
});
