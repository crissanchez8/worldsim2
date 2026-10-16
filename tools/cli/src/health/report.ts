// Evaluación de la salud histórica (P1.8): distribución de las métricas de N seeds contra el
// Apéndice A, invariantes de diversidad y reporte en Markdown + HTML (gráficos SVG en línea, sin
// dependencias). La comparación contra la corrida anterior muestra las medianas lado a lado.
import { EARTH_LAND_KM2, HEGEMON_SHARE, MILESTONES, POPULATION_BANDS } from './appendix';
import type { SeedResult } from './seed';

export interface BandCheck {
  readonly year: number;
  /** Banda de la Tierra (persons); cada seed la escala por su tierra. */
  readonly min: number;
  readonly max: number;
  readonly median: number;
  /** Seeds dentro de su banda escalada (count). */
  readonly inside: number;
}

export interface MilestoneCheck {
  readonly key: string;
  readonly from: number;
  readonly to: number;
  readonly median: number | null;
  readonly inside: number;
  readonly missing: number;
}

export interface HealthSummary {
  readonly seeds: number;
  readonly failures: number;
  readonly population: readonly BandCheck[];
  readonly milestones: readonly MilestoneCheck[];
  /** Seeds con una polity de más del 50 % de la población mundial en algún momento. */
  readonly hegemons: number;
  readonly politiesAt1: number;
  readonly politiesAt1500: number;
  readonly ownedAt1500: number;
  readonly urbanizationAt1: number;
  readonly warsPerSeed: number;
  readonly warYears: number;
  readonly reignYears: number;
  readonly msPerYear: number;
  readonly worldgenSeconds: number;
  readonly events: Readonly<Record<string, number>>;
}

export interface HealthReport {
  readonly engine: string;
  readonly stateVersion: string;
  readonly generatedAt: string;
  readonly summary: HealthSummary;
  readonly results: readonly SeedResult[];
}

export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? (s[mid] ?? 0) : ((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2;
}

/** Muestra más cercana a un año (las muestras están en orden de año). */
export function sampleAt(result: SeedResult, year: number) {
  let best = result.samples[0];
  for (const s of result.samples) {
    if (Math.abs(s.year - year) < Math.abs((best?.year ?? 0) - year)) best = s;
  }
  return best;
}

export function summarizeHealth(results: readonly SeedResult[]): HealthSummary {
  const population = POPULATION_BANDS.map((band) => {
    let inside = 0;
    const values: number[] = [];
    for (const r of results) {
      const p = sampleAt(r, band.year)?.population ?? 0;
      values.push(p);
      const scale = r.landKm2 / EARTH_LAND_KM2;
      if (p >= band.min * scale && p <= band.max * scale) inside++;
    }
    return { ...band, median: median(values), inside };
  });
  const milestones = MILESTONES.map((m) => {
    const years: number[] = [];
    let inside = 0;
    let missing = 0;
    for (const r of results) {
      const y = r.milestones[m.key] ?? null;
      if (y === null) {
        missing++;
        continue;
      }
      years.push(y);
      if (y >= m.from && y <= m.to) inside++;
    }
    return { ...m, median: years.length ? median(years) : null, inside, missing };
  });
  let hegemons = 0;
  for (const r of results) {
    if (r.samples.some((s) => s.population > 0 && s.largestPolity / s.population > HEGEMON_SHARE)) {
      hegemons++;
    }
  }
  const at = (year: number, f: (s: NonNullable<ReturnType<typeof sampleAt>>) => number) =>
    median(
      results.map((r) => {
        const s = sampleAt(r, year);
        return s ? f(s) : 0;
      }),
    );
  const types = new Set(results.flatMap((r) => Object.keys(r.events)));
  const events: Record<string, number> = {};
  for (const t of [...types].sort()) events[t] = median(results.map((r) => r.events[t] ?? 0));
  return {
    seeds: results.length,
    failures: results.filter((r) => r.errors.length > 0).length,
    population,
    milestones,
    hegemons,
    politiesAt1: at(1, (s) => s.activePolities),
    politiesAt1500: at(1500, (s) => s.activePolities),
    ownedAt1500: at(1500, (s) => s.ownedShare),
    urbanizationAt1: at(1, (s) => s.urbanization),
    warsPerSeed: median(results.map((r) => r.wars.count)),
    warYears: median(results.map((r) => r.wars.meanYears)),
    reignYears: median(results.map((r) => r.reigns.meanYears)),
    msPerYear: median(results.map((r) => r.msPerYear)),
    worldgenSeconds: median(results.map((r) => r.worldgenMs / 1000)),
    events,
  };
}

const fmtPop = (p: number) =>
  p >= 1e9 ? `${(p / 1e9).toFixed(2)} B` : `${(p / 1e6).toFixed(1)} M`;
const fmtYear = (y: number | null) => (y === null ? '—' : y < 0 ? `${-y} a.C.` : `${y} d.C.`);
const pct = (x: number) => `${(x * 100).toFixed(0)} %`;

/** Filas clave para comparar dos corridas (métrica, valor, formato). */
function keyRows(s: HealthSummary): [string, number, (x: number) => string][] {
  return [
    ['Fallos (seeds con errores)', s.failures, String],
    ['Seeds con hegemón universal', s.hegemons, String],
    ['Polities activas en el 1 d.C. (mediana)', s.politiesAt1, (x) => x.toFixed(0)],
    ['Polities activas en 1500 (mediana)', s.politiesAt1500, (x) => x.toFixed(0)],
    ['Tierra con dueño en 1500 (mediana)', s.ownedAt1500, pct],
    ['Urbanización en el 1 d.C. (mediana)', s.urbanizationAt1, (x) => `${(x * 100).toFixed(1)} %`],
    ['Guerras por seed (mediana)', s.warsPerSeed, (x) => x.toFixed(0)],
    ['Duración media de las guerras (años)', s.warYears, (x) => x.toFixed(1)],
    ['Duración media de los reinados (años)', s.reignYears, (x) => x.toFixed(1)],
    ['ms por año (mediana)', s.msPerYear, (x) => x.toFixed(2)],
    ['Worldgen (s, mediana)', s.worldgenSeconds, (x) => x.toFixed(2)],
    ...s.population.map((b): [string, number, (x: number) => string] => [
      `Población en ${fmtYear(b.year)} (mediana)`,
      b.median,
      fmtPop,
    ]),
  ];
}

export function toMarkdown(report: HealthReport, baseline?: HealthReport): string {
  const s = report.summary;
  const lines: string[] = [];
  lines.push(`# Salud histórica · ${s.seeds} seeds`);
  lines.push('');
  lines.push(`Motor ${report.engine} · estado ${report.stateVersion} · ${report.generatedAt}`);
  lines.push('');
  lines.push(
    s.failures === 0
      ? '**Invariantes:** ✅ ningún error en ninguna seed.'
      : `**Invariantes:** ❌ ${s.failures} seed(s) con errores (ver abajo).`,
  );
  lines.push('');
  lines.push('## Población mundial (Apéndice A, banda escalada por la tierra de cada mundo)');
  lines.push('');
  lines.push('| Año | Banda Tierra | Mediana | Seeds dentro |');
  lines.push('|---|---|---|---|');
  for (const b of s.population) {
    lines.push(
      `| ${fmtYear(b.year)} | ${fmtPop(b.min)}–${fmtPop(b.max)} | ${fmtPop(b.median)} | ${b.inside}/${s.seeds} |`,
    );
  }
  lines.push('');
  lines.push('## Primeros hitos mundiales');
  lines.push('');
  lines.push('| Hito | Ventana | Mediana | Dentro | Sin ocurrir |');
  lines.push('|---|---|---|---|---|');
  for (const m of s.milestones) {
    lines.push(
      `| ${m.key} | ${fmtYear(m.from)} – ${fmtYear(m.to)} | ${fmtYear(m.median)} | ${m.inside}/${s.seeds} | ${m.missing} |`,
    );
  }
  lines.push('');
  lines.push('## Métricas clave');
  lines.push('');
  const base = baseline ? new Map(keyRows(baseline.summary).map(([k, v]) => [k, v])) : undefined;
  lines.push(base ? '| Métrica | Ahora | Antes |' : '| Métrica | Valor |');
  lines.push(base ? '|---|---|---|' : '|---|---|');
  for (const [k, v, f] of keyRows(s)) {
    const b = base?.get(k);
    lines.push(
      base ? `| ${k} | ${f(v)} | ${b === undefined ? '—' : f(b)} |` : `| ${k} | ${f(v)} |`,
    );
  }
  lines.push('');
  lines.push('## Eventos por tipo (mediana por seed)');
  lines.push('');
  lines.push('| Tipo | Mediana |');
  lines.push('|---|---|');
  for (const [t, v] of Object.entries(s.events)) lines.push(`| \`${t}\` | ${v.toFixed(0)} |`);
  const failed = report.results.filter((r) => r.errors.length > 0);
  if (failed.length > 0) {
    lines.push('');
    lines.push('## Errores');
    for (const r of failed) lines.push(`- seed ${r.params.seed}: ${r.errors.join('; ')}`);
  }
  lines.push('');
  return lines.join('\n');
}

/** Gráfico de líneas SVG (una línea por seed) con bandas opcionales; eje Y log si se pide. */
function lineChart(
  title: string,
  series: readonly { readonly label: string; readonly points: readonly [number, number][] }[],
  options: {
    readonly log?: boolean;
    readonly bands?: readonly BandCheck[];
    readonly scale?: number;
  } = {},
): string {
  const W = 760;
  const H = 260;
  const pad = 40;
  const all = series.flatMap((s) => s.points);
  if (all.length === 0) return '';
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]).filter((y) => !options.log || y > 0);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const tr = (y: number) => (options.log ? Math.log10(Math.max(1, y)) : y);
  const bandYs = (options.bands ?? []).flatMap((b) => [
    b.min * (options.scale ?? 1),
    b.max * (options.scale ?? 1),
  ]);
  const y0 = Math.min(...[...ys, ...bandYs].map(tr));
  const y1 = Math.max(...[...ys, ...bandYs].map(tr));
  const px = (x: number) => pad + ((x - x0) / Math.max(1, x1 - x0)) * (W - 2 * pad);
  const py = (y: number) => H - pad - ((tr(y) - y0) / Math.max(1e-9, y1 - y0)) * (H - 2 * pad);
  const bands = (options.bands ?? [])
    .map((b) => {
      const s = options.scale ?? 1;
      return `<line x1="${px(b.year).toFixed(1)}" x2="${px(b.year).toFixed(1)}" y1="${py(b.max * s).toFixed(1)}" y2="${py(b.min * s).toFixed(1)}" class="band"/>`;
    })
    .join('');
  const lines = series
    .map((s, k) => {
      const d = s.points
        .map(([x, y], i) => `${i ? 'L' : 'M'}${px(x).toFixed(1)},${py(y).toFixed(1)}`)
        .join('');
      return `<path d="${d}" class="s${k % 10}"><title>${s.label}</title></path>`;
    })
    .join('');
  return `<figure><figcaption>${title}</figcaption><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}">
<line x1="${pad}" y1="${H - pad}" x2="${W - pad}" y2="${H - pad}" class="axis"/>
<text x="${pad}" y="${H - 12}">${fmtYear(x0)}</text><text x="${W - pad}" y="${H - 12}" text-anchor="end">${fmtYear(x1)}</text>
${bands}${lines}</svg></figure>`;
}

export function toHtml(report: HealthReport, baseline?: HealthReport): string {
  const md = toMarkdown(report, baseline);
  // Markdown mínimo → HTML (títulos, tablas y párrafos): suficiente para este reporte.
  const body = md
    .split('\n\n')
    .map((block) => {
      if (block.startsWith('# ')) return `<h1>${block.slice(2)}</h1>`;
      if (block.startsWith('## ')) return `<h2>${block.slice(3)}</h2>`;
      if (block.startsWith('|')) {
        const rows = block.split('\n').filter((r) => !/^\|[-|]+\|$/.test(r));
        return `<table>${rows
          .map((r, i) => {
            const cells = r
              .split('|')
              .slice(1, -1)
              .map((c) => c.trim().replace(/`([^`]+)`/g, '<code>$1</code>'));
            const tag = i === 0 ? 'th' : 'td';
            return `<tr>${cells.map((c) => `<${tag}>${c}</${tag}>`).join('')}</tr>`;
          })
          .join('')}</table>`;
      }
      return `<p>${block.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');
  const scale = median(report.results.map((r) => r.landKm2)) / EARTH_LAND_KM2;
  const pts = (f: (s: SeedResult['samples'][number]) => number) =>
    report.results.map((r) => ({
      label: `seed ${r.params.seed}`,
      points: r.samples.map((s): [number, number] => [s.year, f(s)]),
    }));
  const charts = [
    lineChart(
      'Población mundial (escala log; barras: banda del Apéndice A)',
      pts((s) => s.population),
      {
        log: true,
        bands: report.summary.population,
        scale,
      },
    ),
    lineChart(
      'Polities activas',
      pts((s) => s.activePolities),
    ),
    lineChart(
      'Tierra con dueño (fracción de provincias)',
      pts((s) => s.ownedShare),
    ),
    lineChart(
      'Urbanización',
      pts((s) => s.urbanization),
    ),
  ].join('\n');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Salud histórica · worldSim2</title><style>
:root{color-scheme:light dark;font-family:ui-sans-serif,system-ui,sans-serif;font-size:14px}
body{max-width:900px;margin:0 auto;padding:16px}table{border-collapse:collapse;margin:8px 0}
td,th{border-bottom:1px solid #8884;padding:3px 8px;text-align:left}figure{margin:16px 0}
svg{width:100%;height:auto}path{fill:none;stroke-width:1.3}.axis{stroke:#888}.band{stroke:#2a9d8f;stroke-width:6;opacity:.35}
text{font-size:11px;fill:currentColor}
.s0{stroke:#4c78a8}.s1{stroke:#f58518}.s2{stroke:#54a24b}.s3{stroke:#e45756}.s4{stroke:#72b7b2}
.s5{stroke:#b279a2}.s6{stroke:#ff9da6}.s7{stroke:#9d755d}.s8{stroke:#bab0ac}.s9{stroke:#eeca3b}
</style></head><body>${body}${charts}</body></html>`;
}
