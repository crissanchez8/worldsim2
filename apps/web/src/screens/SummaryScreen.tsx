// Resumen v1 (P1.6, wireframe 3; D57): hasta lo ya visto en la reproducción (al terminar, el
// panorama final). Números clave, 3 gráficos de los agregados por año y listas de entidades.
import { Eras, SettlementLevels } from '@ws/content';
import { formatYear } from '@ws/i18n';
import { NO_LEVEL } from '@ws/history';
import { WAR_OUTCOMES } from '@ws/sim';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatPersons } from '../entity/format';
import { entityName } from '../live/event-text';
import { EntityTable, type Column, type TableRow } from '../summary/EntityTable';
import { Chart } from '../summary/Chart';
import { LanguageToggle } from '../ui/LanguageToggle';
import { WorldLink } from '../ui/links';
import { useUi } from '../ui/store';

const TABS = ['polity', 'settlement', 'culture', 'person', 'war'] as const;
type Tab = (typeof TABS)[number];
/** Puntos por gráfico como máximo (se submuestrea la serie anual). */
const CHART_POINTS = 1500;

export function SummaryScreen() {
  const { t, i18n } = useTranslation();
  const session = useUi((s) => s.session);
  const status = useUi((s) => s.status);
  const world = useUi((s) => s.world);
  const [tab, setTab] = useState<Tab>('polity');
  const history = session?.history ?? null;
  const seen = session?.seen ?? 0;
  const year = session?.yearAt(seen) ?? 0;
  const registryVersion = session?.registry.version ?? 0;

  const charts = useMemo(() => {
    if (!history || !session) return null;
    const a = history.data.aggregates;
    const step = Math.max(1, Math.ceil(seen / CHART_POINTS));
    const n = Math.floor(seen / step);
    const xs = new Float64Array(n);
    const pop = new Float64Array(n);
    const pol = new Float64Array(n);
    const big = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const k = (i + 1) * step;
      xs[i] = session.yearAt(k);
      pop[i] = a.population[k] ?? 0;
      pol[i] = a.polities[k] ?? 0;
      big[i] = a.largestPolity[k] ?? 0;
    }
    return { xs, pop, pol, big };
  }, [history, session, seen]);

  const table = useMemo((): { columns: Column[]; rows: TableRow[] } => {
    if (!history || !session) return { columns: [], rows: [] };
    const reg = session.registry;
    const frame = history.frameAtIndex(seen);
    const series = seen > 0 ? history.seriesAt(year) : null;
    const y = (v: number) => formatYear(i18n, v);
    const name = (kind: Tab | 'province', id: number) => entityName(t, reg, { kind, id });
    const yearCell = (v: number) => ({ text: y(v), sort: v });
    const endCell = (v: number) =>
      v !== 0 && v <= year ? yearCell(v) : { text: t('ui.inspector.none'), sort: Infinity };
    const col = (key: string) => ({ label: t(`ui.column.${key}` as 'ui.column.name') });
    switch (tab) {
      case 'polity': {
        const provinces = new Map<number, number>();
        const population = new Map<number, number>();
        for (let p = 1; p < frame.owner.length; p++) {
          const o = frame.owner[p] ?? 0;
          if (o === 0) continue;
          provinces.set(o, (provinces.get(o) ?? 0) + 1);
          population.set(o, (population.get(o) ?? 0) + (series?.population[p] ?? 0));
        }
        const rows: TableRow[] = [];
        for (const [id, r] of reg.polities) {
          if (r.founded > year) continue;
          const capital = frame.capitals.get(id) ?? 0;
          rows.push({
            key: String(id),
            cells: [
              { text: name('polity', id), sort: name('polity', id), ref: { kind: 'polity', id } },
              yearCell(r.founded),
              endCell(r.ended),
              { text: String(provinces.get(id) ?? 0), sort: provinces.get(id) ?? 0 },
              {
                text: formatPersons(i18n, population.get(id) ?? 0),
                sort: population.get(id) ?? 0,
              },
              capital === 0
                ? { text: t('ui.inspector.none'), sort: '' }
                : {
                    text: name('province', capital),
                    sort: capital,
                    ref: { kind: 'province', id: capital },
                  },
            ],
          });
        }
        return {
          columns: ['name', 'founded', 'ended', 'provinces', 'population', 'capital'].map(col),
          rows,
        };
      }
      case 'settlement': {
        const rows: TableRow[] = [];
        for (const [id, r] of reg.settlements) {
          if (r.founded > year) continue;
          const level = frame.level[r.province] ?? NO_LEVEL;
          const levelText =
            level === NO_LEVEL
              ? t('ui.inspector.none')
              : t(
                  `content.settlementLevel.${SettlementLevels.rows[level]?.key ?? 'village'}` as 'content.settlementLevel.village',
                );
          rows.push({
            key: String(id),
            cells: [
              {
                text: name('settlement', id),
                sort: name('settlement', id),
                ref: { kind: 'settlement', id },
              },
              {
                text: name('province', r.province),
                sort: r.province,
                ref: { kind: 'province', id: r.province },
              },
              yearCell(r.founded),
              { text: levelText, sort: level === NO_LEVEL ? -1 : level },
            ],
          });
        }
        return { columns: ['name', 'province', 'founded', 'level'].map(col), rows };
      }
      case 'culture': {
        const majority = new Map<number, number>();
        for (const c of frame.culture) if (c !== 0) majority.set(c, (majority.get(c) ?? 0) + 1);
        const rows: TableRow[] = [];
        for (const [id, r] of reg.cultures) {
          if (r.founded > year) continue;
          const language = reg.languages.get(r.language)?.name ?? t('ui.inspector.none');
          rows.push({
            key: String(id),
            cells: [
              {
                text: name('culture', id),
                sort: name('culture', id),
                ref: { kind: 'culture', id },
              },
              { text: language, sort: language },
              yearCell(r.founded),
              { text: String(majority.get(id) ?? 0), sort: majority.get(id) ?? 0 },
            ],
          });
        }
        return { columns: ['name', 'language', 'founded', 'majority'].map(col), rows };
      }
      case 'person': {
        const rows: TableRow[] = [];
        for (const [id, r] of reg.persons) {
          if (r.born > year) continue;
          const ruled = session.rulers
            .ruledBy(id)
            .filter((p) => session.rulers.reignsUntil(p, seen).some((x) => x.person === id))
            .map((p) => name('polity', p));
          rows.push({
            key: String(id),
            cells: [
              { text: name('person', id), sort: name('person', id), ref: { kind: 'person', id } },
              yearCell(r.born),
              endCell(r.died),
              { text: ruled.join(', ') || t('ui.inspector.none'), sort: ruled.length },
            ],
          });
        }
        return { columns: ['name', 'born', 'died', 'ruled'].map(col), rows };
      }
      case 'war': {
        const rows: TableRow[] = [];
        for (const [id, r] of reg.wars) {
          if (r.started > year) continue;
          const ended = r.ended !== 0 && r.ended <= year;
          const outcome = t(
            `ui.outcome.${ended ? (WAR_OUTCOMES[r.outcome] ?? 'ongoing') : 'ongoing'}` as 'ui.outcome.ongoing',
          );
          rows.push({
            key: String(id),
            cells: [
              { text: name('war', id), sort: name('war', id), ref: { kind: 'war', id } },
              {
                text: name('polity', r.attacker),
                sort: name('polity', r.attacker),
                ref: { kind: 'polity', id: r.attacker },
              },
              {
                text: name('polity', r.defender),
                sort: name('polity', r.defender),
                ref: { kind: 'polity', id: r.defender },
              },
              yearCell(r.started),
              endCell(r.ended),
              { text: outcome, sort: outcome },
            ],
          });
        }
        return {
          columns: ['name', 'attacker', 'defender', 'started', 'ended', 'outcome'].map(col),
          rows,
        };
      }
    }
    // registryVersion: el registro muta en su lugar; su versión es lo que cambia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, session, seen, year, tab, t, i18n, registryVersion]);

  if (!session || !history || !world || !status || !charts) return null;
  const a = history.data.aggregates;
  const frame = history.frameAtIndex(seen);
  let settlements = 0;
  for (const level of frame.level) if (level !== NO_LEVEL) settlements++;
  let founded = 0;
  for (const r of session.registry.polities.values()) if (r.founded <= year) founded++;
  let wars = 0;
  for (const r of session.registry.wars.values()) if (r.started <= year) wars++;
  const eraKey = Eras.rows[a.era[seen] ?? 0]?.key ?? 'prehistory';
  const finished = seen >= session.endK;

  return (
    <div className="screen summary-screen">
      <header className="top-bar">
        <strong>
          {t('ui.world.label', {
            seed: world.params.seed,
            size: t(`content.worldSize.${world.params.size}` as 'content.worldSize.medium'),
            mapType: t(`content.mapType.${world.params.mapType}` as 'content.mapType.continents'),
          })}
        </strong>
        <span className="meta">
          {finished
            ? t('ui.summary.final')
            : t('ui.summary.until', { year: formatYear(i18n, year) })}
        </span>
        <span className="spacer" />
        <WorldLink path="/mundo" className="button">
          {t('ui.world.back')}
        </WorldLink>
        <LanguageToggle />
      </header>
      <main className="summary">
        <section className="key-numbers">
          <dl className="facts">
            <dt>{t('ui.summary.population')}</dt>
            <dd>{formatPersons(i18n, a.population[seen] ?? 0)}</dd>
            <dt>{t('ui.summary.polities')}</dt>
            <dd>
              {a.polities[seen] ?? 0}{' '}
              <span className="meta">{t('ui.summary.foundedTotal', { count: founded })}</span>
            </dd>
            <dt>{t('ui.summary.wars')}</dt>
            <dd>{wars}</dd>
            <dt>{t('ui.summary.settlements')}</dt>
            <dd>{settlements}</dd>
            <dt>{t('ui.summary.era')}</dt>
            <dd>{t(`content.era.${eraKey}` as 'content.era.prehistory')}</dd>
          </dl>
        </section>
        <section className="charts">
          <Chart title={t('ui.summary.chartPopulation')} xs={charts.xs} ys={charts.pop} />
          <Chart title={t('ui.summary.chartPolities')} xs={charts.xs} ys={charts.pol} />
          <Chart title={t('ui.summary.chartLargest')} xs={charts.xs} ys={charts.big} />
        </section>
        <section className="lists">
          <div role="tablist">
            {TABS.map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                onClick={() => {
                  setTab(k);
                }}
              >
                {t(`ui.kinds.${k}` as 'ui.kinds.polity')}
              </button>
            ))}
          </div>
          <EntityTable columns={table.columns} rows={table.rows} />
        </section>
      </main>
    </div>
  );
}
