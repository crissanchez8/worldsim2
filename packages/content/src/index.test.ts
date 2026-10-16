import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME } from './index';

describe('@ws/content', () => {
  it('carga el módulo', () => {
    expect(PACKAGE_NAME).toBe('@ws/content');
  });
});
