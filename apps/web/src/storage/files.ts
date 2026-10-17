// Exportar e importar `.wsim` (P1.6, D51): el archivo es el mismo formato que se guarda.
import { time } from '@ws/core';
import { decodeWsim } from '@ws/history';
import type { NewSavedWorld } from './world-store';

/** Descarga los bytes como archivo (acción del usuario: un botón). */
export function downloadFile(bytes: Uint8Array, name: string): void {
  const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** Nombre del archivo: semilla, tamaño y último año (sin caracteres raros). */
export function wsimName(seed: number, size: string, lastYear: number): string {
  return `worldsim2-${seed}-${size}-${lastYear < 0 ? `${-lastYear}bc` : `${lastYear}ad`}.wsim`;
}

/** Lee un `.wsim` (valida que lo sea) y arma los metadatos para guardarlo en la lista. */
export function importedMeta(bytes: Uint8Array, savedAt: number): NewSavedWorld {
  const file = decodeWsim(bytes);
  const years = file.header.years;
  return {
    params: file.header.params,
    worldHash: file.header.worldHash,
    engineVersion: file.header.engineVersion,
    years,
    lastYear: time.addYears(file.data.startYear, Math.max(0, years - 1)),
    savedAt,
    size: bytes.length,
  };
}
