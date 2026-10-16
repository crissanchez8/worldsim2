# ADR-003 · Matemática determinista

| | |
|---|---|
| **Fecha** | 2026-10-15 |
| **Estado** | Aceptado (se confirma entre motores en el spike C) |
| **Fase** | P0 |
| **Decisión en log** | D40 |

## Contexto
ECMAScript no exige resultados idénticos para `Math.sin`, `exp`, `log`, `pow`, etc.: cada
motor los aproxima a su manera. Con un mundo de 14.000 años, un ulp de diferencia diverge. Las
operaciones `+ − × ÷` y `sqrt` sí son exactas en IEEE-754 (y JS no contrae a FMA).

## Opciones consideradas
| Opción | Pros | Contras |
|---|---|---|
| **Port de fdlibm (elegida)** | Algoritmos probados durante décadas, < 1 ulp, licencia permisiva (Sun); solo `+ − × ÷` y bits | Más lento que el nativo (2–3×) |
| Polinomios propios de menor grado | Más rápidos | Precisión a validar a mano; más riesgo |
| Tablas precalculadas | Muy rápidas | Memoria; interpolación con error; cubrir rangos amplios |
| Aritmética de punto fijo | Determinismo trivial | Reescribir toda la matemática; rango y precisión limitados |

## Decisión
- `core/math` porta de fdlibm (FreeBSD): `exp`, `log` y núcleos `k_sin`/`k_cos`, reducción
  `rem_pio2` "media" (Cody–Waite con π/2 en tres partes), `atan`, `atan2`.
- Derivadas: `expm1` y `log1p` (trucos de Kahan/Goldberg), `log2` (exacto en potencias de 2),
  `log10`, `pow` (enteros |n| ≤ 64 por cuadrados, `sqrt` para 0,5, el resto exp(y·ln x), con la
  semántica de casos especiales de `Math.pow`), `tan`, `asin`, `acos` (vía `atan2`), `tanh`,
  `sigmoid`, `hypot`.
- Bits vía `DataView` big-endian (independiente de la plataforma).
- **Allowlist de `Math`** en el motor: `abs floor ceil round trunc sign min max sqrt imul fround
  clz32` + constantes. Todo lo demás falla en lint, incluidas funciones futuras del lenguaje.
- Precisión objetivo del BRIEF: ≤ 1e-12 relativo. Medido: mucho mejor (ver evidencia).
- Rango garantizado de trig: |x| ≤ 2^20·π/2 ≈ 1,6e6 (fuera sigue determinista, con menos
  precisión; el motor no usa ángulos así).

## Consecuencias
- Positivas: resultados bit a bit idénticos donde el motor sea IEEE-754 (a confirmar en el
  spike C con 107 vectores golden).
- Negativas: costo. Medido por llamada: `exp` 13 ns (nativo 4 ns), `sin` 21 ns (nativo 9 ns).
  Aceptable para el presupuesto de P1; si una función domina el perfil, se evalúa una
  aproximación de menor grado documentada aquí.
- Revisar si: el spike C encuentra diferencias (p. ej. en `sqrt` o en conversiones), o el
  perfilado de P1 marca a `core/math` > 15% del tick.

## Evidencia
Error máximo contra V8 en barridos de 200.000 puntos:

| Función | Error máx. | Bit a bit igual a V8 |
|---|---|---|
| exp, log, atan | ≤ 0,8 ulp | ≈ 100% |
| sin, cos | ≤ 1 ulp | 98,7% |
| expm1, log1p, log2, log10, tan, asin, acos | ≤ 2 ulp | 64–79% |
| tanh | 2,2 ulp | 99,2% |
| atan2, hypot | ≤ 1 ulp | — |
| pow (\|y·ln x\| ≤ 70) | 1,1e-14 relativo | — |

Los tests fijan cotas ≈ 4–5 ulp (1e-15 relativo), igualdad exacta en casos especiales (±0,
±∞, NaN) y 107 vectores golden bit a bit.
