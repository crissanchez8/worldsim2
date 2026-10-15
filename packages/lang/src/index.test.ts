import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME } from './index';

describe('@ws/lang', () => {
  it('carga el módulo', () => {
    expect(PACKAGE_NAME).toBe('@ws/lang');
  });
});
