#!/usr/bin/env node
// Punto de entrada: registra tsx para ejecutar el código TS del monorepo sin build previo.
import { register } from 'tsx/esm/api';

register();
const { main } = await import('../src/main.ts');
process.exitCode = await main(process.argv.slice(2));
