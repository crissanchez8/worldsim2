# P2.2 · Tres direcciones de diseño (checkpoint 🎨 1)

> Registro en el repo de lo que se presenta en el preview (`/tools/design/`). Las direcciones son
> las de D58. Elección pendiente: P2.3.

## Cómo se hicieron
- **Datos reales:** semilla 1, mundo mediano, continentes, k = 13000 (1000 d.C.). El protagonista
  es **Mautu**, el estado más grande del año (41 provincias, 19.040.655 personas), con capital en
  Maimai (provincia 401). Nombres, cifras, eventos con causas y términos del porqué salen de la UI
  de P1 (`tools/design/scripts/extract-ui.mjs` → `tools/design/src/data/ui-es.json`).
- **Renders reales del mapa:** el parámetro de desarrollo `?look=grabado|observatorio|suizo`
  (`apps/web/src/map/looks.ts`) cambia colores, tierra (plana, hipsométrica), sombra con tinte,
  costa, curvas de nivel, retícula, banda o halo de frontera, frontera en el tono del relleno,
  paleta política y generalización de ríos, sobre el mismo shader TSL. `p1` (por defecto) es el mapa
  de P1 sin cambios. Las tomas salen del build con el Chrome instalado
  (`tools/design/scripts/shoot-map.mjs`) y guardan la posición en pantalla de capitales,
  asentamientos y anclas de rótulos.
- **Superpuesto en la maqueta (aproximación):** rótulos de estados y ciudades (llegan al mapa en
  P3.13) y símbolos de asentamiento (P2.11).
- **Paleta política de las maquetas:** cada polity cae en la paleta por un hash de su color de P1.
  Dos vecinos pueden repetir color: el coloreo de grafo es D63 (sesión paralela).

Comandos (con `pnpm --filter @ws/web build && pnpm --filter @ws/web preview --port 4176`):
```
node tools/design/scripts/shoot-map.mjs --look suizo --k 13000 --x 470 --z 330 --distance 700 --name atlas
node tools/design/scripts/extract-ui.mjs --k 13000
pnpm --filter @ws/design dev                 # http://localhost:5173/tools/design/
node tools/design/scripts/capture.mjs --base http://localhost:5173 --out docs/phases/P02/img
```

## Las tres direcciones
| | A · Grabado | B · Observatorio | C · Atlas suizo |
|---|---|---|---|
| ¿Qué es worldSim2? | Un documento | Un experimento | Una obra de consulta |
| Tema | Claro: papel blanco, tinta ferrogálica | Oscuro: grafito mate, bermellón de señal | Claro: blanco neutro, rojo editorial |
| Tipografía (OFL) | Libre Caslon Text + Display | IBM Plex Sans Condensed + Plex Mono | Schibsted Grotesk + Newsreader |
| Mapa (real hoy) | Banda de acuarela en la frontera, costa a pluma, retícula | Curvas de nivel, bandas de profundidad, retícula | Hipsometría con sombra violácea, frontera oscura con halo |
| Porqué | Libro de cuentas (base, términos con puntos guía, total con doble filete) | Lectura grande + regla de factores (log) | Cascada con etiquetas directas |
| Emblema | Escudo con regla de esmaltes | Sigilo en escala graduada | Bandera 3:2 |
| Íconos | Trazo 1,25 px, puntas rectas | 1,5 px, puntas cortadas | 1,75 px, puntas redondas |
| Contraste mínimo de texto | 4,83:1 | 4,96:1 | 5,02:1 |

Capturas en `img/`: `<dirección>-vivo|inspector|ficha|atlas|hoja.jpg` y `portada.jpg`.

## Recomendación (de Claude)
**A · Grabado**, con las reglas de gráficos editoriales de C (títulos que concluyen, etiquetas
directas).
- **Por qué:**
  - es la identidad más propia, para una web pública de portfolio;
  - su lenguaje cartográfico ya es real (coloreado de contorno);
  - es la mejor para la enciclopedia y la crónica de P11.
- **Qué vigilar:** la densidad de la serif en tablas. Si cansa en la galería (checkpoint 2), plan
  B: una grotesca chica solo para tablas, como mezcla explícita.
- **No recomiendo B como dirección por defecto:** el género "sala de control oscura" es el más
  cercano al slop de dashboards y el más flojo para leer. Es la alternativa válida si la escena es
  mirar de noche.
- **C es la opción segura:** la más legible y barata, pero la que menos identidad deja.

## Crítica anti-slop
- **Detector de `impeccable`:** 0 hallazgos sobre `tools/design`.
- **Revisión de diseño:** la hice yo en secuencia, sin subagentes (independencia degradada: no se
  pidieron).
- **Corregido antes de mostrar:**
  - rótulos tapados por símbolos o por paneles;
  - capitales debajo del nombre de su estado;
  - texto secundario de B en 4,37:1 (ahora 4,96:1);
  - "d . C ." espaciado por las cifras tabulares de Schibsted;
  - ríos chicos que saturaban la vista de cerca.
- **Pendiente, y no es de diseño:**
  - escalones de 20 km en las fronteras (P3.13);
  - calibración de la simulación ("Edad moderna temprana" en el 1000 d.C.; P4/P5, D56).
