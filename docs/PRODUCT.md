# Product

> Contexto estratégico de diseño (lo lee la skill `impeccable` antes de cada tarea de UI). Sale de
> `DEVELOPMENT_PLAN.md` §1–§3 y §15.5 y del BRIEF de P2. El aspecto visual vive en
> `docs/design-system.md` (desde P2).

## Register

product

## Users
- **Visitante curioso:** llega por un link o por el portfolio; quiere ver algo impresionante en
  menos de un minuto, sin configurar nada. Mira en una laptop o un monitor de escritorio.
- **Creador de mundos:** configura un planeta, lo mira correr 5–15 minutos como una película y lo
  comparte.
- **Historiador:** recorre la enciclopedia, las capas del mapa, los árboles y las estadísticas;
  quiere entender por qué cayó un imperio, no solo que cayó.
- **Reclutador o par técnico:** evalúa la calidad de lo que hay detrás.
- **El autor:** calibra la simulación con las mismas pantallas.

El trabajo principal: **mirar cómo emerge una historia y poder preguntarle "¿por qué?" a cualquier
cosa que se ve**. Es un observador puro (D8): no hay partida que ganar.

## Product Purpose
worldSim2 genera un planeta físicamente creíble y simula unos 14.000 años de historia
(≈12.000 a.C. → ≈1900) que emergen de reglas trazables. Se mira en vivo, sobre un mapa 3D que de
lejos se vuelve atlas político, y termina en una enciclopedia navegable, un atlas histórico,
estadísticas y árboles. Es una web pública y gratuita.

Éxito: que cada mundo se sienta **creíble** (la geografía y la historia tienen sentido),
**explicable** (cada número tiene su porqué a la vista), **vivo** (el mapa se mueve y cuenta) y
**memorable** (al final hay una historia que dan ganas de recorrer y compartir).

## Brand Personality
Creíble, explicable, viva. La voz es la de un buen atlas o un buen instrumento: sobria, precisa,
sin exagerar, con curiosidad. No dramatiza la historia: muestra datos, causas y fechas, y deja que
el mundo cuente. En español usa voseo rioplatense en la UI solo si la guía de voz lo confirma
(P2.10); los textos de eventos guardan datos, no frases.

Emoción buscada: asombro tranquilo frente al mapa, confianza en los números, ganas de seguir un
link más.

## Anti-references
- AI slop: gradientes violetas, glassmorphism por defecto, emojis como íconos, tarjetas SaaS en
  grilla, tipografía "de siempre" sin razón (Inter, Space Grotesk), sombras difusas por todos
  lados, animación decorativa.
- Disfraces de época: pergamino envejecido con manchas, rosas de los vientos y monstruos marinos
  como relleno, marcos dorados de videojuego.
- "Dashboard sci-fi": negro con neón, brillos, HUD de película.
- Las UIs densas de Paradox en lo que tienen de malo: texto chico de bajo contraste y paneles que
  tapan el mapa.
- DF Legends en crudo: listas de texto sin jerarquía.

## Design Principles
1. **El mapa es el protagonista.** La interfaz lo rodea y lo explica; nunca lo tapa por defecto.
2. **Cada número tiene su porqué.** Base, innovaciones y modificadores con su fuente: la
   explicabilidad se ve, no se promete.
3. **Densidad con jerarquía.** Mucho dato a la vez, ordenado por importancia; las cifras se
   alinean (tabulares) y llevan unidad.
4. **El mundo cuenta, la UI acompaña.** Fechas, causas y nombres reales del mundo antes que
   adjetivos; sin dramatizar.
5. **Una identidad para 14.000 años.** Nada que ate la interfaz a una sola época de la historia
   simulada.

## Accessibility & Inclusion
- WCAG 2.2 AA: contraste programático de todos los pares de texto y de los elementos no textuales.
- Mapas y gráficos legibles con protanopia, deuteranopia y tritanopia (paleta política y rampas
  validadas con simulación).
- Todo se puede usar con teclado; foco siempre visible; atajos que no chocan con lectores de
  pantalla.
- `prefers-reduced-motion` respetado en toda animación.
- Bilingüe es/en desde el día 1; sin textos sueltos.
- Escritorio (1280–2560 px); mobile no entra en v1.
