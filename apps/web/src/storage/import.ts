// Importar un `.wsim` (P1.6): valida el archivo y arma sus metadatos para la lista de guardados.
// Módulo aparte: trae el lector del motor y "Crear" lo carga solo al importar (P1.9).
import { time } from '@ws/core';
import { decodeWsim } from '@ws/history';
import type { NewSavedWorld } from './world-store';

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
