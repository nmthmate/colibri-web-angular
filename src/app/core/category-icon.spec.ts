import { categoryIcon } from './category-icon';

describe('categoryIcon', () => {
  it('maps known categories to their icon', () => {
    expect(categoryIcon('sör')).toBe('🍺');
    expect(categoryIcon('Üdítők')).toBe('🥤');
    expect(categoryIcon('bor és pezsgő')).toBe('🍷');
  });

  it('is case-insensitive and trims whitespace', () => {
    expect(categoryIcon('  SÖR  ')).toBe('🍺');
  });

  it('falls back to the default icon for unknown or missing categories', () => {
    expect(categoryIcon('ismeretlen kategória')).toBe('🛒');
    expect(categoryIcon(undefined)).toBe('🛒');
    expect(categoryIcon('')).toBe('🛒');
  });
});
