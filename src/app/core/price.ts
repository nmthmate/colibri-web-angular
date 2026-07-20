const PRICE_FORMATTER = new Intl.NumberFormat('hu-HU');

export function formatPrice(price: number | undefined | null): string {
  if (!price || !Number.isFinite(price)) {
    return 'Ár érdeklődjön';
  }
  return `${PRICE_FORMATTER.format(price)} Ft`;
}

export function parsePriceText(priceText: unknown): number {
  const numeric = Number(String(priceText || '').replace(/[^\d]/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
}
