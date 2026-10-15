import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME } from './index';

describe('@ws/history', () => {
  it('carga el módulo', () => {
    expect(PACKAGE_NAME).toBe('@ws/history');
  });
});
