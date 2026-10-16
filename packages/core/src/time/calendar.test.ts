import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  addYears,
  fromAstro,
  isEveryNYears,
  isValidYear,
  nextYear,
  tickIndex,
  toAstro,
  yearsBetween,
} from './index';

const year = fc.integer({ min: -20000, max: 3000 }).filter((y) => y !== 0);

describe('core/time · calendario sin año 0', () => {
  it('al 1 a.C. le sigue el 1 d.C.', () => {
    expect(nextYear(-1)).toBe(1);
    expect(addYears(1, -1)).toBe(-1);
    expect(yearsBetween(-1, 1)).toBe(1);
  });

  it('del 12.000 a.C. al 1900 d.C. hay 13.899 años de corrida', () => {
    // −12000 → 1900: 11.999 años hasta el 1 a.C., +1 hasta el 1 d.C., +1899 hasta 1900
    expect(yearsBetween(-12000, 1900)).toBe(13899);
    expect(tickIndex(-12000, -12000)).toBe(0);
    expect(tickIndex(1900, -12000)).toBe(13899);
  });

  it('el año 0 no existe', () => {
    expect(isValidYear(0)).toBe(false);
    expect(() => toAstro(0)).toThrow();
    expect(() => toAstro(1.5)).toThrow();
  });

  it('toAstro y fromAstro son inversas', () => {
    fc.assert(
      fc.property(year, (y) => {
        expect(fromAstro(toAstro(y))).toBe(y);
      }),
    );
  });

  it('sumar y restar años es consistente y nunca da 0', () => {
    fc.assert(
      fc.property(year, fc.integer({ min: -5000, max: 5000 }), (y, n) => {
        const z = addYears(y, n);
        expect(z).not.toBe(0);
        expect(yearsBetween(y, z)).toBe(n);
        expect(addYears(z, -n)).toBe(y);
      }),
    );
  });

  it('cadencia cada N años sobre el índice astronómico', () => {
    expect(isEveryNYears(10, 10)).toBe(true);
    expect(isEveryNYears(-1, 10)).toBe(true); // el 1 a.C. es el astronómico 0
    expect(isEveryNYears(-11, 10)).toBe(true); // astronómico −10
    expect(isEveryNYears(-10, 10)).toBe(false);
    let count = 0;
    for (let y = -12000; y < -11000; y++) if (isEveryNYears(y, 25)) count++;
    expect(count).toBe(40);
  });
});
