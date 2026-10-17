import { describe, expect, it } from 'vitest';
import { EARTH_LAND_KM2 } from './appendix';
import { median, summarizeHealth, toHtml, toMarkdown } from './report';
import type { SeedResult } from './seed';

function fake(seed: number, scale: number, pop1: number, agriculture: number | null): SeedResult {
  const sample = (year: number, population: number, largest = population / 10) => ({
    year,
    population,
    farmingProvinces: 10,
    settlementsByLevel: [1, 2, 0, 0, 0],
    urbanization: 0.05,
    activePolities: 20,
    largestPolity: largest,
    ownedShare: 0.5,
    activeWars: 1,
    innovations: ['agriculture'],
    dominantEra: 'ironAge',
  });
  return {
    params: { seed, size: 'medium', mapType: 'continents', landFraction: 0.3 },
    worldHash: '0'.repeat(16),
    provinces: 1500,
    landKm2: EARTH_LAND_KM2 * scale,
    worldgenMs: 3000,
    simMs: 20000,
    msPerYear: 1.5,
    years: 13900,
    samples: [sample(-10000, 5e6 * scale), sample(1, pop1)],
    milestones: { agriculture },
    events: { 'war.declared': seed },
    wars: { count: 10, meanYears: 5, maxYears: 9 },
    reigns: { count: 100, meanYears: 22 },
    polities: { formed: 50, ended: 30 },
    playbackSeconds: 540 + seed * 30,
    errors: [],
    finalHash: '',
  };
}

describe('ws health · evaluación', () => {
  it('mediana', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBe(0);
  });

  it('las bandas se escalan por la tierra de cada mundo', () => {
    // Banda del 1 d.C. en la Tierra: 100–400 M. Con el doble de tierra: 200–800 M.
    const s = summarizeHealth([
      fake(1, 2, 300e6, -9000),
      fake(2, 2, 150e6, -5000),
      fake(3, 1, 150e6, null),
    ]);
    const band = s.population.find((b) => b.year === 1);
    expect(band?.inside).toBe(2); // 300 M (×2: dentro) y 150 M (×1: dentro); 150 M con ×2: fuera
    const agri = s.milestones.find((m) => m.key === 'agriculture');
    expect(agri?.inside).toBe(1);
    expect(agri?.missing).toBe(1);
    // Duración a 1×: 9,5 / 10 / 10,5 min, las tres dentro de 9–11 min (D48).
    expect(s.playback.median).toBeCloseTo(10, 6);
    expect(s.playback.inside).toBe(3);
  });

  it('detecta hegemones y errores; el reporte se arma en Markdown y HTML', () => {
    const hegemon = fake(4, 1, 200e6, -9000);
    const big = {
      ...hegemon,
      samples: hegemon.samples.map((x) => ({ ...x, largestPolity: x.population * 0.6 })),
    };
    const broken = { ...fake(5, 1, 200e6, -9000), errors: ['InvariantError: I2'] };
    const report = {
      engine: '0.0.0',
      stateVersion: 'x',
      generatedAt: 'hoy',
      summary: summarizeHealth([big, broken]),
      results: [big, broken],
    };
    expect(report.summary.hegemons).toBe(1);
    expect(report.summary.failures).toBe(1);
    const md = toMarkdown(report, report);
    expect(md).toContain('❌ 1 seed(s) con errores');
    expect(md).toContain('| Métrica | Ahora | Antes |');
    expect(md).toContain('## Ritmo de reproducción (D48)');
    const html = toHtml(report);
    expect(html).toContain('<svg');
    expect(html).toContain('<table>');
  });
});
