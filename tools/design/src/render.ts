// Páginas de las maquetas de P2.2 (1440 × 900): la estructura es la de D57 y la misma para las
// tres direcciones; cambian tipografía, color, cartografía, símbolos, emblema y la gramática del
// porqué. Todo dato sale de `data.ts` (motor real) o del JSON de la toma del mapa.
import { contrast, hexToRgb, minDistance, rgbToHex, simulate, VISIONS, type Vision } from './color';
import {
  ERAS,
  KM_PER_CELL,
  MAP_MODES,
  POLITY,
  PROVINCE,
  SETTLEMENT_LEVELS,
  type Shot,
  TICKER,
  TIMELINE,
  WORLD,
  type WhyStat,
} from './data';
import { DIRECTION_CONTENT, type Direction } from './directions';
import { icon, ICONS, type Kit } from './kits';

const esc = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // La era nunca queda sola en otra línea: "1000 d.C.".
    .replace(/ (a\.C\.|d\.C\.)/g, '\u00a0$1');

export type PageId = 'hoja' | 'vivo' | 'inspector' | 'ficha' | 'atlas';

const VISION_NAMES: Record<Vision, string> = {
  normal: 'Visión normal',
  protanopia: 'Protanopia',
  deuteranopia: 'Deuteranopia',
  tritanopia: 'Tritanopia',
};

/** Ubicación del render de una toma (`public/renders/<look>/<toma>.png|json`). */
export const renderUrl = (look: string, shot: string, ext: 'png' | 'json' | 'jpg') =>
  `${import.meta.env.BASE_URL}renders/${look}/${shot}.${ext}`;

// ── Piezas comunes ─────────────────────────────────────────────────────────────────────────────

function topBar(kit: Kit, title = true): string {
  return `
  <header class="topbar">
    <div class="world">
      ${title ? `<span class="world-name">${esc(WORLD.title)}</span><span class="world-params">${WORLD.params.map((p) => `<span>${esc(p)}</span>`).join('')}</span>` : ''}
    </div>
    <div class="date" aria-label="Fecha">
      <span class="year">${esc(WORLD.year)}</span>
      <span class="era">${esc(WORLD.era)}</span>
    </div>
    <nav class="actions">
      <a class="btn" href="#">${icon('summary')}<span>Resumen</span></a>
      <button class="btn">${icon('save')}<span>Guardar</span></button>
      <button class="btn">${icon('export')}<span>Exportar</span></button>
      <button class="btn">${icon('share')}<span>Compartir</span></button>
      <span class="lang" role="group" aria-label="Idioma"><button aria-pressed="true">es</button><button>en</button></span>
    </nav>
  </header>`;
}

function rail(kit: Kit, dir: Direction): string {
  const swatches = dir.political
    .slice(0, 6)
    .map((c) => `<span class="sw" style="background:${c}"></span>`)
    .join('');
  return `
  <aside class="rail" aria-label="Modos de mapa">
    <h2 class="panel-title">Modo de mapa</h2>
    <div class="modes" role="radiogroup">
      ${MAP_MODES.map(
        (m, i) =>
          `<button role="radio" aria-checked="${i === 0}" class="mode">${i === 0 ? icon('layers') : '<span class="dot"></span>'}<span>${esc(m)}</span></button>`,
      ).join('')}
    </div>
    <h2 class="panel-title">Leyenda</h2>
    <dl class="legend">
      <div><dt><span class="swatches">${swatches}</span></dt><dd>Un color por estado</dd></div>
      <div><dt><span class="sw none"></span></dt><dd>Sin dueño</dd></div>
      ${[1, 2, 3, 4]
        .map(
          (l) =>
            `<div><dt>${kit.settlement(l, false)}</dt><dd>${esc(SETTLEMENT_LEVELS[l] ?? '')}</dd></div>`,
        )
        .join('')}
      <div><dt>${kit.settlement(3, true)}</dt><dd>Capital</dd></div>
    </dl>
  </aside>`;
}

function facts(list: readonly { label: string; value: string; note?: string; link?: boolean }[]) {
  return `<dl class="facts">${list
    .map(
      (f) =>
        `<div><dt>${esc(f.label)}</dt><dd>${f.link ? `<a href="#">${esc(f.value)}</a>` : `<span class="num">${esc(f.value)}</span>`}${f.note ? `<span class="note">${esc(f.note)}</span>` : ''}</dd></div>`,
    )
    .join('')}</dl>`;
}

function entityHeader(kit: Kit, size: number, level: 2 | 1 = 2): string {
  return `
  <div class="entity-header">
    ${kit.emblem(POLITY.colorSeed, size)}
    <div>
      <p class="kind">${esc(POLITY.kind)}<span>${esc(POLITY.status)}</span></p>
      <h${level} class="entity-name">${esc(POLITY.name)}</h${level}>
      <p class="asof">a la fecha<span class="num">${esc(WORLD.year)}</span><span>${esc(WORLD.era)}</span></p>
    </div>
  </div>`;
}

/** Línea de "gobernantes": los últimos, con la cantidad anterior. */
function rulers(n: number): string {
  const shown = POLITY.rulers.slice(-n);
  const earlier = POLITY.rulersEarlier + POLITY.rulers.length - shown.length;
  return `<p class="inline-list"><span class="more">+${earlier} anteriores</span>${shown.map((r) => `<a href="#">${esc(r)}</a>`).join('')}</p>`;
}

function wars(n: number): string {
  const list = POLITY.wars.slice(-n);
  return `<p class="inline-list">${list.map((w) => `<a href="#">${esc(w.against)}<span class="num">${esc(w.year)}</span></a>`).join('')}</p>`;
}

/** Desglose del porqué, con la gramática propia de cada dirección. */
function breakdown(dirId: Kit['id'], stat: WhyStat): string {
  const value = `<span class="num">${esc(stat.value)}</span>`;
  const unit = `<span class="unit">${esc(stat.unit)}</span>`;
  if (dirId === 'grabado') {
    // Libro de cuentas: base, términos con puntos guía y total con doble filete.
    return `
    <div class="why-stat ledger">
      <h4>${esc(stat.label)}</h4>
      <ol>
        <li class="base"><span class="lbl">base</span><span class="dots"></span><span class="num">${esc(stat.base)}</span></li>
        ${stat.terms
          .map(
            (t) =>
              `<li><span class="lbl"><a href="#">${esc(t.source)}</a></span><span class="dots"></span><span class="num"><span class="op">${t.op}</span>${esc(t.value)}</span></li>`,
          )
          .join('')}
        <li class="total"><span class="lbl">${unit}</span><span class="dots"></span>${value}</li>
      </ol>
    </div>`;
  }
  if (dirId === 'observatorio') {
    // Instrumento: lectura grande y una regla con un segmento por término (log del factor).
    const parse = (v: string) => Number(v.replace(/[^\d,]/g, '').replace(',', '.'));
    const segs = stat.terms.map((t) => {
      const v = parse(t.value);
      const w = t.op === '×' ? Math.log(Math.max(v, 1.0001)) : v / Math.max(parse(stat.value), 1);
      return { t, w };
    });
    const base =
      stat.terms[0]?.op === '×'
        ? Math.log(Math.max(parse(stat.base), 1.01)) * 0.12
        : parse(stat.base) / Math.max(parse(stat.value), 1);
    const total = segs.reduce((s, x) => s + x.w, base);
    return `
    <div class="why-stat gauge">
      <div class="readout"><h4>${esc(stat.label)}</h4><p>${value}${unit}</p></div>
      <div class="bar" aria-hidden="true">
        <span class="seg base" style="flex:${(base / total).toFixed(3)}"></span>
        ${segs.map((s) => `<span class="seg" style="flex:${(s.w / total).toFixed(3)}"></span>`).join('')}
      </div>
      <table>
        <tr class="base"><td>base</td><td class="num">${esc(stat.base)}</td></tr>
        ${stat.terms.map((t) => `<tr><td><a href="#">${esc(t.source)}</a></td><td class="num"><span class="op">${t.op}</span>${esc(t.value)}</td></tr>`).join('')}
      </table>
    </div>`;
  }
  // Atlas suizo: cascada editorial. Cada término es un tramo de la barra: en los que multiplican,
  // el ancho es proporcional al logaritmo del factor; en los que suman, a lo que suman.
  const parse = (v: string) => Number(v.replace(/[^\d,]/g, '').replace(',', '.'));
  const mult = stat.terms[0]?.op === '×';
  const BASE_SHARE = 0.3;
  const widths = stat.terms.map((t) =>
    mult ? Math.log(parse(t.value)) : parse(t.value) / Math.max(parse(stat.value), 1e-9),
  );
  const sum = widths.reduce((a, b) => a + b, 0);
  const baseShare = mult ? BASE_SHARE : parse(stat.base) / Math.max(parse(stat.value), 1e-9);
  const scale = mult ? (1 - BASE_SHARE) / Math.max(sum, 1e-9) : 1;
  let x = baseShare;
  const rows = stat.terms.map((t, i) => {
    const w = (widths[i] ?? 0) * scale;
    const row = `<li><span class="lbl"><a href="#">${esc(t.source)}</a></span><span class="track"><span class="bar" style="left:${(x * 100).toFixed(1)}%;width:${(w * 100).toFixed(1)}%"></span></span><span class="num">${t.op} ${esc(t.value)}</span></li>`;
    x += w;
    return row;
  });
  return `
    <div class="why-stat waterfall">
      <h4>${esc(stat.label)}<span>${value} ${unit}</span></h4>
      <ul>
        <li class="base"><span class="lbl">Base</span><span class="track"><span class="bar" style="left:0;width:${(baseShare * 100).toFixed(1)}%"></span></span><span class="num">${esc(stat.base)}</span></li>
        ${rows.join('')}
      </ul>
    </div>`;
}

function timeBar(kit: Kit, dir: Direction, tickerLines = 4): string {
  const end = WORLD.endK;
  const pct = (k: number) => `${((k / end) * 100).toFixed(3)}%`;
  const bands = TIMELINE.bands
    .map(
      (b) =>
        `<span class="band${(b.to - b.from) / end < 0.08 ? ' narrow' : ''}" style="left:${pct(b.from)};width:${pct(b.to - b.from)};background:${dir.eras[b.era]}" title="${esc(ERAS[b.era] ?? '')}"><span>${esc(ERAS[b.era] ?? '')}</span></span>`,
    )
    .join('');
  const markers = TIMELINE.markers
    .map((k) => `<span class="marker" style="left:${pct(k)}"></span>`)
    .join('');
  return `
  <section class="bottom" aria-label="Tiempo">
    <div class="time-row">
      <div class="speeds" role="radiogroup" aria-label="Velocidad">
        <button role="radio" aria-checked="true" aria-label="Pausa">${icon('pause')}</button>
        ${['1×', '2×', '4×', 'Máx.'].map((s) => `<button role="radio" aria-checked="false">${s}</button>`).join('')}
      </div>
      <p class="now"><span class="num">${esc(WORLD.year)}</span><span>${esc(WORLD.era)}</span></p>
      <p class="head">simulado hasta <span class="num">${esc(WORLD.head)}</span></p>
      <p class="perf"><span class="num">${esc(WORLD.msPerYear)}</span> ms por año simulado</p>
    </div>
    <div class="timeline" role="slider" aria-label="Línea de tiempo" aria-valuenow="${WORLD.k}">
      <div class="track">${bands}<span class="ahead" style="left:${pct(WORLD.k)};width:${pct(end - WORLD.k)}"></span>${markers}<span class="playhead" style="left:${pct(WORLD.k)}"></span></div>
      <div class="ticks"><span style="left:0">12.000 a.C.</span><span style="left:${pct(7000)}">5000 a.C.</span><span style="left:${pct(12000)}">1 d.C.</span><span style="left:100%">1900 d.C.</span></div>
    </div>
    <ol class="ticker" aria-label="Teletipo">
      ${TICKER.slice(0, tickerLines)
        .map(
          (e) =>
            `<li class="ev ${e.kind}"><span class="year num">${esc(e.year)}</span>${e.kind === 'battle' ? kit.battle() : ''}<a href="#">${esc(e.text)}</a></li>`,
        )
        .join('')}
    </ol>
  </section>`;
}

// ── Mapa con rótulos y símbolos reales ────────────────────────────────────────────────────────

interface LabelOpts {
  readonly maxLabels: number;
  readonly minProvinces: number;
  readonly settlementsMinLevel: number;
  readonly namedMinLevel: number;
  readonly bounds: { x0: number; y0: number; x1: number; y1: number };
  /** Zonas tapadas por paneles (px): ni rótulos ni símbolos. */
  readonly exclude?: readonly { x0: number; y0: number; x1: number; y1: number }[];
  readonly highlight?: number;
}

function mapLayer(kit: Kit, look: string, shotName: string, shot: Shot, o: LabelOpts): string {
  const inside = (p: readonly [number, number] | null): p is readonly [number, number] =>
    !!p && p[0] > o.bounds.x0 && p[0] < o.bounds.x1 && p[1] > o.bounds.y0 && p[1] < o.bounds.y1;
  const taken: { x0: number; y0: number; x1: number; y1: number }[] = [...(o.exclude ?? [])];
  const within = (b: (typeof taken)[number]) =>
    b.x0 > o.bounds.x0 && b.x1 < o.bounds.x1 && b.y0 > o.bounds.y0 && b.y1 < o.bounds.y1;
  const free = (b: (typeof taken)[number]) =>
    taken.every((t) => b.x1 < t.x0 || b.x0 > t.x1 || b.y1 < t.y0 || b.y0 > t.y1);
  const capitals = new Set(shot.polities.map((p) => p.capital));
  const capitalPoints = shot.settlements.flatMap((st) =>
    capitals.has(st.province) && st.at ? [st.at] : [],
  );
  // Primero los rótulos de estados (mandan), después los símbolos que no los tapan; las capitales
  // se dibujan siempre.
  const labels: string[] = [];
  for (const p of shot.polities) {
    if (labels.length >= o.maxLabels) break;
    if (p.provinces < o.minProvinces || !inside(p.anchor) || !p.name) continue;
    const size = Math.min(26, 11 + 3.2 * Math.sqrt(p.provinces / 3));
    const w = p.name.length * size * 0.92;
    const boxAt = (y: number) => ({
      x0: (p.anchor?.[0] ?? 0) - w / 2,
      y0: y - size * 0.7,
      x1: (p.anchor?.[0] ?? 0) + w / 2,
      y1: y + size * 0.7,
    });
    // Si una capital cae debajo del rótulo, el rótulo sube (la capital queda a la vista).
    let y = p.anchor[1];
    const hitsCapital = (b: ReturnType<typeof boxAt>) =>
      capitalPoints.some(
        ([cx, cy]) => cx > b.x0 - 6 && cx < b.x1 + 6 && cy > b.y0 - 6 && cy < b.y1 + 6,
      );
    if (hitsCapital(boxAt(y))) y -= size * 1.25;
    const box = boxAt(y);
    if (!within(box) || !free(box) || hitsCapital(box)) continue;
    taken.push(box);
    labels.push(
      `<span class="realm${p.id === o.highlight ? ' is-selected' : ''}" style="left:${p.anchor[0].toFixed(1)}px;top:${y.toFixed(1)}px;font-size:${size.toFixed(1)}px">${esc(p.name.toUpperCase())}</span>`,
    );
  }
  const syms: string[] = [];
  const order = [...shot.settlements].sort(
    (a, b) =>
      Number(capitals.has(b.province)) - Number(capitals.has(a.province)) || b.level - a.level,
  );
  for (const s of order) {
    const cap = capitals.has(s.province);
    if ((!cap && s.level < o.settlementsMinLevel) || !inside(s.at)) continue;
    const symBox = { x0: s.at[0] - 5, y0: s.at[1] - 5, x1: s.at[0] + 5, y1: s.at[1] + 7 };
    if (!free(symBox) && !cap) continue;
    if (
      cap &&
      (o.exclude ?? []).some(
        (e) => !(symBox.x1 < e.x0 || symBox.x0 > e.x1 || symBox.y1 < e.y0 || symBox.y0 > e.y1),
      )
    )
      continue;
    const nameBox = { ...symBox, x1: symBox.x1 + 7 * (s.name?.length ?? 0) };
    // El nombre solo si no pisa un rótulo ni otro nombre.
    const named =
      (cap ? s.level >= o.namedMinLevel - 1 : s.level >= o.namedMinLevel) && free(nameBox);
    taken.push(named ? nameBox : symBox);
    syms.push(
      `<span class="msym${cap ? ' cap' : ''}" style="left:${s.at[0].toFixed(1)}px;top:${s.at[1].toFixed(1)}px">${kit.settlement(s.level, cap)}${named && s.name ? `<span class="mname">${esc(s.name)}</span>` : ''}</span>`,
    );
  }
  return `
  <div class="map">
    <img class="render" src="${renderUrl(look, shotName, 'jpg')}" alt="" width="${shot.width}" height="${shot.height}">
    <div class="labels">${syms.join('')}${labels.join('')}</div>
  </div>`;
}

/** Escala del recorte: px por km cerca del centro, de pares de anclas reales (mediana). */
function pxPerKm(shot: Shot): number {
  const ps = shot.polities.filter((p) => p.anchor);
  const ratios: number[] = [];
  for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i];
      const b = ps[j];
      if (!a?.anchor || !b?.anchor) continue;
      const dw = Math.hypot(a.world[0] - b.world[0], a.world[1] - b.world[1]) * KM_PER_CELL;
      const ds = Math.hypot(a.anchor[0] - b.anchor[0], a.anchor[1] - b.anchor[1]);
      if (dw > 400 && dw < 2500) ratios.push(ds / dw);
    }
  }
  ratios.sort((x, y) => x - y);
  return ratios[Math.floor(ratios.length / 2)] ?? 0.1;
}

function scaleBar(shot: Shot): string {
  const r = pxPerKm(shot);
  const km = [250, 500, 1000].find((k) => k * r > 110) ?? 1000;
  const w = km * r;
  return `<div class="scalebar" style="--w:${w.toFixed(0)}px"><span class="ruler"><i></i><i></i><i></i><i></i></span><span class="lbl"><span class="num">0</span><span class="num">${km / 2}</span><span class="num">${km} km</span></span></div>`;
}

// ── Páginas ───────────────────────────────────────────────────────────────────────────────────

export function vivoPage(kit: Kit, shot: Shot): string {
  const dir = DIRECTION_CONTENT[kit.id];
  return `
  ${mapLayer(kit, kit.id, 'vivo', shot, {
    maxLabels: 14,
    minProvinces: 4,
    settlementsMinLevel: 3,
    namedMinLevel: 4,
    bounds: { x0: 200, y0: 64, x1: 1080, y1: 740 },
    highlight: POLITY.id,
  })}
  ${topBar(kit)}
  ${rail(kit, dir)}
  <aside class="inspector" aria-label="Inspector">
    <div class="panel-bar"><h2 class="panel-title">Inspector</h2><span class="spacer"></span><button class="btn ghost">${icon('open')}<span>Abrir ficha</span></button><button class="btn ghost" aria-label="Cerrar">${icon('close')}</button></div>
    ${entityHeader(kit, 44)}
    ${facts(POLITY.facts)}
    <h3 class="section-title">Gobernantes</h3>${rulers(4)}
    <h3 class="section-title">Guerras<span class="count num">${POLITY.wars.length}</span></h3>${wars(3)}
    <button class="btn why-btn">${icon('why')}<span>Calcular el porqué</span></button>
  </aside>
  ${timeBar(kit, dir)}`;
}

export function inspectorPage(kit: Kit, shot: Shot): string {
  const dir = DIRECTION_CONTENT[kit.id];
  return `
  ${mapLayer(kit, kit.id, 'cerca', shot, {
    maxLabels: 6,
    minProvinces: 2,
    settlementsMinLevel: 1,
    namedMinLevel: 2,
    bounds: { x0: 16, y0: 64, x1: 970, y1: 750 },
    highlight: POLITY.id,
  })}
  ${topBar(kit)}
  <aside class="inspector wide" aria-label="Inspector">
    <div class="panel-bar"><button class="btn ghost" aria-label="Atrás">${icon('back')}</button><h2 class="panel-title">Inspector</h2><span class="spacer"></span><button class="btn ghost">${icon('open')}<span>Abrir ficha</span></button><button class="btn ghost" aria-label="Cerrar">${icon('close')}</button></div>
    <div class="entity-header">
      ${kit.settlement(3, true)}
      <div>
        <p class="kind">Provincia<span>${esc(PROVINCE.name)}</span></p>
        <h2 class="entity-name">${esc(PROVINCE.settlement)}</h2>
        <p class="asof">a la fecha<span class="num">${esc(WORLD.year)}</span><span>${esc(WORLD.era)}</span></p>
      </div>
    </div>
    ${facts([
      { label: 'Dueño', value: PROVINCE.owner, link: true },
      {
        label: 'Asentamiento',
        value: PROVINCE.settlement,
        note: PROVINCE.settlementLevel,
        link: true,
      },
      { label: 'Población', value: PROVINCE.population, note: `urbana ${PROVINCE.urban}` },
      { label: 'Cultura mayoritaria', value: PROVINCE.culture, link: true },
    ])}
    <h3 class="section-title">Conoce<span class="count num">${PROVINCE.knows.length}</span></h3>
    <p class="chips">${PROVINCE.knows.map((k) => `<a class="chip" href="#">${esc(k)}</a>`).join('')}</p>
    <section class="why" aria-label="Por qué">
      <h3 class="why-title">¿Por qué?<span>estado exacto a la fecha</span></h3>
      <p class="computed">${esc(PROVINCE.why.computed)}</p>
      ${[PROVINCE.why.stats[0], PROVINCE.why.stats[3]].map((s) => (s ? breakdown(kit.id, s) : '')).join('')}
    </section>
  </aside>
  ${timeBar(kit, dir, 2)}`;
}

export function fichaPage(kit: Kit, atlas: Shot): string {
  const mautu = atlas.polities.find((p) => p.id === POLITY.id);
  const crop = mautu?.anchor ?? [720, 450];
  return `
  <header class="topbar page">
    <nav class="crumbs" aria-label="Migas"><a href="#">Resumen</a><a href="#">Estados</a><span aria-current="page">${esc(POLITY.name)}</span></nav>
    <span class="spacer"></span>
    <a class="btn" href="#">${icon('back')}<span>Volver a la vista en vivo</span></a>
    <span class="lang" role="group" aria-label="Idioma"><button aria-pressed="true">es</button><button>en</button></span>
  </header>
  <main class="ficha">
    <div class="ficha-head">
      ${entityHeader(kit, 72, 1)}
      <div class="asof-toggle" role="radiogroup" aria-label="Mostrar">
        <button role="radio" aria-checked="true">a la fecha<span class="num">${esc(WORLD.year)}</span></button>
        <button role="radio" aria-checked="false" disabled>al final<span>con la corrida terminada</span></button>
      </div>
    </div>
    <div class="ficha-cols">
      <section class="col data" aria-label="Datos">
        <div class="locator" style="--src:url(${renderUrl(kit.id, 'atlas', 'jpg')});--x:${crop[0].toFixed(0)}px;--y:${crop[1].toFixed(0)}px" role="img" aria-label="Territorio de ${esc(POLITY.name)} en ${esc(WORLD.year)}"><span class="pin"></span></div>
        ${facts(POLITY.facts)}
        <h3 class="section-title">Gobernantes</h3>${rulers(8)}
        <h3 class="section-title">Guerras<span class="count num">${POLITY.wars.length}</span></h3>${wars(13)}
        <section class="why" aria-label="Por qué">
          <h3 class="why-title">¿Por qué?<span>estado exacto a la fecha</span></h3>
          <p class="computed">${esc(POLITY.why.computed)}</p>
          ${POLITY.why.stats.map((s) => breakdown(kit.id, s)).join('')}
        </section>
      </section>
      <section class="col events" aria-label="Eventos">
        <h2 class="col-title">Eventos<span>con sus causas, hasta lo visto</span></h2>
        <ol class="event-list">
          ${POLITY.events
            .slice(0, 22)
            .map(
              (e) =>
                `<li><span class="year num">${esc(e.year)}</span><span class="text"><a href="#">${esc(e.text)}</a>${e.cause ? `<span class="cause"><span class="por">por</span><a href="#">${esc(e.cause)}</a></span>` : ''}</span></li>`,
            )
            .join('')}
        </ol>
      </section>
    </div>
  </main>`;
}

/** Lugar de la cartela del atlas en cada dirección (px), para que no tape rótulos. */
const CARTOUCHE: Record<Kit['id'], { x0: number; y0: number; x1: number; y1: number }> = {
  grabado: { x0: 30, y0: 460, x1: 390, y1: 870 },
  observatorio: { x0: 1080, y0: 30, x1: 1410, y1: 450 },
  suizo: { x0: 30, y0: 30, x1: 400, y1: 470 },
};

export function atlasPage(kit: Kit, shot: Shot): string {
  const dir = DIRECTION_CONTENT[kit.id];
  const biggest = shot.polities[0];
  return `
  <div class="atlas-sheet">
    ${mapLayer(kit, kit.id, 'atlas', shot, {
      maxLabels: 22,
      minProvinces: 6,
      settlementsMinLevel: 9,
      namedMinLevel: 4,
      bounds: { x0: 30, y0: 30, x1: 1410, y1: 870 },
      exclude: [CARTOUCHE[kit.id]],
    })}
    <div class="neatline" aria-hidden="true"></div>
    <div class="cartouche">
      <p class="kicker">Atlas histórico</p>
      <h1>${kit.id === 'suizo' ? `${esc(biggest?.name ?? '')} es el mayor de los ${WORLD.polities} estados` : `Los estados hacia el año ${esc(WORLD.year)}`}</h1>
      <p class="sub">${kit.id === 'suizo' ? `Estados y ciudades hacia el ${esc(WORLD.year)}, ${esc(WORLD.era.toLowerCase())}` : `${esc(WORLD.title)}, ${WORLD.params.map((p) => esc(p.toLowerCase())).join(', ')}`}</p>
      <dl class="readouts">
        <div><dt>Estados</dt><dd class="num">${WORLD.polities}</dd></div>
        <div><dt>Provincias con dueño</dt><dd class="num">${WORLD.ownedProvinces.toLocaleString('es-AR')}<span> de ${WORLD.provinces.toLocaleString('es-AR')}</span></dd></div>
        <div><dt>Mayor</dt><dd>${esc(biggest?.name ?? '')}<span class="num"> ${biggest?.provinces ?? 0} prov.</span></dd></div>
      </dl>
      ${scaleBar(shot)}
      <dl class="legend compact">
        <div><dt><span class="swatches">${dir.political
          .slice(0, 5)
          .map((c) => `<span class="sw" style="background:${c}"></span>`)
          .join('')}</span></dt><dd>Estados</dd></div>
        <div><dt>${kit.settlement(3, false)}</dt><dd>Gran ciudad</dd></div>
        <div><dt>${kit.settlement(4, false)}</dt><dd>Metrópolis</dd></div>
        <div><dt>${kit.settlement(3, true)}</dt><dd>Capital</dd></div>
      </dl>
      <p class="note">Rótulos y símbolos superpuestos en la maqueta; en el mapa llegan en P3.13 (rótulos) y P2.11 (símbolos).</p>
    </div>
  </div>`;
}

export function hojaPage(kit: Kit): string {
  const dir = DIRECTION_CONTENT[kit.id];
  const uiHex = new Map(dir.ui.map((c) => [c.token, c.hex]));
  const pairRows = dir.pairs
    .map(([fg, bg, use]) => {
      const f = uiHex.get(fg) ?? '#000000';
      const b = uiHex.get(bg) ?? '#ffffff';
      const ratio = contrast(hexToRgb(f), hexToRgb(b));
      return `<tr><td><span class="pair" style="color:${f};background:${b}">Aa 1000 d.C.</span></td><td><code>${fg}</code> sobre <code>${bg}</code></td><td>${esc(use)}</td><td class="num ${ratio >= 4.5 ? 'pass' : 'fail'}">${ratio.toFixed(2)}:1</td></tr>`;
    })
    .join('');
  const pol = dir.political.map(hexToRgb);
  const visionRows = VISIONS.map(
    (v) =>
      `<tr><th scope="row">${VISION_NAMES[v]}</th><td><span class="strip">${pol.map((c) => `<span style="background:${rgbToHex(simulate(c, v))}"></span>`).join('')}</span></td><td class="num">${minDistance(pol, v).toFixed(1)}</td></tr>`,
  ).join('');
  const rampRow = (name: string, ramp: readonly string[]) =>
    `<tr><th scope="row">${name}</th>${VISIONS.map((v) => `<td><span class="strip">${ramp.map((c) => `<span style="background:${rgbToHex(simulate(hexToRgb(c), v))}"></span>`).join('')}</span></td>`).join('')}</tr>`;
  return `
  <main class="hoja">
    <header class="hoja-head">
      <p class="kicker">Dirección ${kit.letter}</p>
      <h1>${esc(kit.name)}</h1>
      <p class="tagline">${esc(kit.tagline)}</p>
      <nav class="mock-links">${(['vivo', 'inspector', 'ficha', 'atlas'] as const).map((p) => `<a class="btn" href="mock.html?d=${kit.id}&p=${p}">${{ vivo: 'Vista en vivo', inspector: 'Inspector con porqué', ficha: 'Ficha', atlas: 'Recorte de atlas' }[p]}</a>`).join('')}</nav>
    </header>
    <section class="concept">
      <p class="lead">${esc(dir.concept)}</p>
      <dl class="facts">
        <div><dt>¿Qué es worldSim2?</dt><dd>${esc(dir.answer)}</dd></div>
        <div><dt>Escena</dt><dd>${esc(dir.scene)}</dd></div>
        <div><dt>Estrategia de color</dt><dd>${esc(dir.strategy)}</dd></div>
      </dl>
    </section>
    <section><h2>Color de la interfaz</h2>
      <ul class="swatch-list">${dir.ui.map((c) => `<li><span class="big-sw" style="background:${c.hex}"></span><code>${c.token}</code><span class="num">${c.hex}</span><span>${esc(c.role)}</span></li>`).join('')}</ul>
      <table class="tbl"><thead><tr><th>Muestra</th><th>Par</th><th>Uso</th><th>Contraste</th></tr></thead><tbody>${pairRows}</tbody></table>
    </section>
    <section><h2>Paleta política (K = ${dir.political.length})</h2>
      <p class="hint">Distancia mínima entre dos colores de la paleta (ΔE en OKLab). Bajo daltonismo hay pares que chocan: la matriz de choques de D63 hace que nunca caigan en vecinos.</p>
      <table class="tbl"><thead><tr><th>Visión</th><th>Colores</th><th>ΔE mín.</th></tr></thead><tbody>${visionRows}</tbody></table>
    </section>
    <section><h2>Rampas de modos de mapa</h2>
      <table class="tbl"><thead><tr><th></th>${VISIONS.map((v) => `<th>${VISION_NAMES[v]}</th>`).join('')}</tr></thead><tbody>${rampRow('Secuencial', dir.sequential)}${rampRow('Divergente', dir.diverging)}${rampRow('Eras', dir.eras)}</tbody></table>
    </section>
    <section><h2>Tipografía</h2>
      <ul class="type-list">${dir.type.map((t) => `<li><span class="role">${esc(t.role)}</span><span class="family">${esc(t.family)}</span><span class="${t.cls} specimen">${esc(t.sample)}</span></li>`).join('')}</ul>
    </section>
    <section class="two"><div><h2>Íconos</h2><p class="hint">${esc(dir.icons)}</p><p class="icon-row">${Object.keys(
      ICONS,
    )
      .map((n) => icon(n))
      .join('')}</p></div>
      <div><h2>Símbolos del mapa</h2><p class="icon-row sym-row">${[0, 1, 2, 3, 4].map((l) => `<span>${kit.settlement(l, false)}<small>${esc(SETTLEMENT_LEVELS[l] ?? '')}</small></span>`).join('')}<span>${kit.settlement(3, true)}<small>Capital</small></span><span>${kit.battle()}<small>Batalla</small></span></p></div>
    </section>
    <section><h2>Emblemas procedurales</h2><p class="hint">Deterministas por la semilla de color de cada estado; el primero es el de ${esc(POLITY.name)}.</p>
      <p class="emblem-row">${[104, 62, 28, 49, 31, 127, 105, 44].map((s) => kit.emblem(s, 56)).join('')}</p>
    </section>
    <section><h2>Lenguaje del atlas</h2>
      <table class="tbl"><thead><tr><th>Qué</th><th>Cómo</th><th>Cuándo</th></tr></thead><tbody>${dir.atlas.map((r) => `<tr><td>${esc(r.what)}</td><td>${esc(r.how)}</td><td><span class="phase p-${r.phase.replace('.', '')}">${r.phase}</span></td></tr>`).join('')}</tbody></table>
    </section>
    <section><h2>Movimiento</h2><ul class="bullets">${dir.motion.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></section>
    <section class="two"><div><h2>A favor</h2><ul class="bullets">${dir.pros.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div><div><h2>En contra</h2><ul class="bullets">${dir.cons.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div></section>
  </main>`;
}
