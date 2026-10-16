# ADR-007 · Hosting, método de deploy y límites gratuitos

| | |
|---|---|
| **Fecha** | 2026-10-16 |
| **Estado** | Aceptado |
| **Fase** | P0 |
| **Decisión en log** | D26 (Q1), D27 (Q2), D31 (deploy) |

## Contexto
Costo fijo cero (D24): sitio estático, previews por PR, sin tarjetas. Los límites gratuitos
cambian: se verificaron en la documentación oficial el 2026-10-14 y se vuelven a verificar en P13.

## Opciones consideradas
| Opción | Pros | Contras |
|---|---|---|
| **Cloudflare Pages Free + direct upload desde GitHub Actions (elegida)** | Previews por rama; 25 MiB por archivo; sin tarjeta; se publica el mismo artefacto que pasó CI | Token de Cloudflare como secreto; un proyecto direct upload no pasa después a Git integration |
| Cloudflare Pages con Git integration | Sin secretos | Doble build; consume el tope de 500 builds/mes; 1 build concurrente |
| Cloudflare Workers + static assets | Dirección que empuja Cloudflare | No hace falta backend; previews por PR menos directos |
| GitHub Pages (plan B) | Cero cuentas nuevas | Sin previews por PR; 1 GB de sitio; 100 GB/mes blando |
| Vercel Hobby | Previews excelentes | Uso no comercial; topes más duros |

## Decisión
- **Cloudflare Pages Free**, proyecto `worldsim2` (direct upload; producción = `main`).
- **Deploy desde GitHub Actions** con `cloudflare/wrangler-action` (wrangler fijado), job
  `deploy` después de `check`: descarga el artefacto `site/` (web + `spikes/*`) y lo publica. El
  primer deploy crea el proyecto.
- **Preview por rama** (`<rama>.worldsim2.pages.dev`) y por commit, comentado en el PR por el
  workflow (un solo comentario que se edita). Sin secretos (forks), el deploy se saltea con aviso.
- **GitHub Actions** en repo público: runners estándar gratis. Jobs: `check` (formato,
  typecheck, lint, tests, bench grueso, build), `determinism` (Playwright × 3 motores; por PR y
  nocturno) y `deploy`.
- `main` protegida: PR + check `check` obligatorios, también para administradores; sin aprobación
  obligatoria.

## Consecuencias
- Positivas: lo publicado es exactamente lo testeado; previews sin costo; CI sin tope de minutos.
- Negativas: el token de Cloudflare es un secreto a rotar si se filtra; si GitHub o Cloudflare
  cambian sus planes gratuitos, el plan B es GitHub Pages (sin previews por PR).
- Revisar si: aparecen límites nuevos en Pages, el sitio supera 20.000 archivos o algún archivo
  de la galería supera 25 MiB (P13).

## Evidencia
**Límites verificados (documentación oficial, 2026-10-14):**

| Servicio | Límites |
|---|---|
| Cloudflare Pages Free | 500 builds/mes (de su CI; el direct upload no corre builds en Cloudflare), 1 build concurrente, 20 min por build, 20.000 archivos por sitio, 25 MiB por archivo, previews sin tope, 100 proyectos por cuenta |
| Cloudflare Workers Free (referencia) | 100.000 requests/día; static assets: 20.000 archivos, 25 MiB por archivo |
| GitHub Actions | Gratis en repos públicos con runners estándar (cambios de precios 2026; el cargo a runners autoalojados se postergó y no aplica a repos públicos) |
| GitHub Pages | Sitio ≤ 1 GB, 100 GB/mes (blando), 10 builds/h (blando), timeout de 10 min |

**Funcionamiento:** primer deploy y preview comentados en el PR #1; preview
`https://phase-p00-fundaciones.worldsim2.pages.dev` sirviendo la app y `/spikes/*` (el
certificado del subdominio de rama tardó unos minutos en emitirse la primera vez).
**Costo:** USD 0; ninguna tarjeta cargada (confirmar en el checkpoint 3 en el panel de uso de
Cloudflare que el direct upload no cuenta builds).
