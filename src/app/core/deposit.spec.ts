import { getDepositAmount, isDrsEligibleCategory } from './deposit';

describe('isDrsEligibleCategory', () => {
  it('accepts the DRS-eligible categories', () => {
    expect(isDrsEligibleCategory('sör')).toBe(true);
    expect(isDrsEligibleCategory('Üdítők')).toBe(true);
    expect(isDrsEligibleCategory('bor és pezsgő')).toBe(true);
    expect(isDrsEligibleCategory('röviditalok')).toBe(true);
  });

  it('rejects other categories', () => {
    expect(isDrsEligibleCategory('snack')).toBe(false);
    expect(isDrsEligibleCategory('édesség')).toBe(false);
    expect(isDrsEligibleCategory(undefined)).toBe(false);
  });
});

describe('getDepositAmount', () => {
  it('returns null for categories outside the DRS scheme', () => {
    expect(getDepositAmount({ name: 'Chips 100 g', category: 'snack', price: '500 Ft' })).toBeNull();
  });

  it('returns null when there is no package/volume/deposit signal', () => {
    expect(getDepositAmount({ name: 'Ismeretlen csomagolású ital', category: 'sör', price: '500 Ft' })).toBeNull();
  });

  it('returns 50 for a canned soft drink with a volume marker', () => {
    expect(
      getDepositAmount({ name: 'Coca Cola 0,5 L can', category: 'üdítők', price: '600 Ft' })
    ).toBe(50);
  });

  it('returns 25 for bottled beer', () => {
    expect(
      getDepositAmount({ name: 'Dreher Classic 0,5 L palack', category: 'sör', price: '450 Ft' })
    ).toBe(25);
  });

  it('returns 50 for canned beer, not 25', () => {
    expect(getDepositAmount({ name: 'Dreher Classic 0,5 L can', category: 'sör', price: '450 Ft' })).toBe(
      50
    );
  });

  it('honors the explicit deposit flag even without a package/volume marker in the name', () => {
    expect(getDepositAmount({ name: 'Titokzatos üdítő', category: 'üdítők', price: '400 Ft', deposit: true })).toBe(
      50
    );
  });

  it('returns null for missing product data', () => {
    expect(getDepositAmount(undefined)).toBeNull();
    expect(getDepositAmount(null)).toBeNull();
  });
});
