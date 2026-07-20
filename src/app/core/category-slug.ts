// Canonical category list this shop uses today. The public catalog is stored in Firestore as
// one aggregate document per category (see catalog.service.ts) - these slugs are the doc IDs.
export const CATEGORY_SLUGS: Record<string, string> = {
  'Sör': 'sor',
  'Üdítők': 'uditok',
  'Bor és Pezsgő': 'bor-es-pezsgo',
  'Röviditalok': 'roviditalok',
  'Snack': 'snack',
  'Édesség': 'edesseg',
};

const FALLBACK_SLUG = 'egyeb';

export function categorySlug(category: string): string {
  return CATEGORY_SLUGS[category] || FALLBACK_SLUG;
}

export function allCategorySlugs(): string[] {
  return [...new Set(Object.values(CATEGORY_SLUGS)), FALLBACK_SLUG];
}
