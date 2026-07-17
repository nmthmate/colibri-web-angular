import { Product } from './product.model';

const DRS_ELIGIBLE_CATEGORIES = new Set(['sör', 'üdítők', 'bor és pezsgő', 'röviditalok']);

const COMBINING_DIACRITICS = /[̀-ͯ]/g;

function normalizeCategory(category: unknown): string {
  return String(category || '').trim().toLowerCase();
}

function getNormalizedName(name: unknown): string {
  return String(name || '')
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS, '')
    .toLowerCase();
}

function tokenizeName(name: unknown): string[] {
  return getNormalizedName(name)
    .split(/[^a-z0-9.]+/)
    .filter((token) => token.length > 0);
}

function hasDrsPackage(name: unknown): boolean {
  const tokens = tokenizeName(name);
  return tokens.some(
    (token) =>
      token === 'can' ||
      token === 'pet' ||
      token === 'pal' ||
      token === 'pal.' ||
      token.startsWith('palack') ||
      token === 'dob' ||
      token === 'dob.' ||
      token.startsWith('doboz') ||
      token === 'uveg' ||
      token.startsWith('uveges')
  );
}

function hasGlassPackage(name: unknown): boolean {
  const tokens = tokenizeName(name);
  return tokens.some(
    (token) =>
      token === 'pal' || token === 'pal.' || token.startsWith('palack') || token === 'uveg' || token.startsWith('uveges')
  );
}

function hasVolumeMarker(name: unknown): boolean {
  const normalized = getNormalizedName(name);
  return /\b\d+(?:[.,]\d+)?\s*(?:l|ml)\b/.test(normalized);
}

export function isDrsEligibleCategory(category: unknown): boolean {
  return DRS_ELIGIBLE_CATEGORIES.has(normalizeCategory(category));
}

export function getDepositAmount(product: Product | undefined | null): number | null {
  const category = normalizeCategory(product?.category);
  if (!isDrsEligibleCategory(category)) {
    return null;
  }

  const name = String(product?.name || '');
  const depositByData = product?.deposit === true;
  const depositByPackage = hasDrsPackage(name);
  const depositByVolume = hasVolumeMarker(name);

  if (!depositByData && !depositByPackage && !depositByVolume) {
    return null;
  }

  const isBeerOrCider = category === 'sör' || category === 'cider';
  if (isBeerOrCider && hasGlassPackage(name)) {
    return 25;
  }

  return 50;
}
