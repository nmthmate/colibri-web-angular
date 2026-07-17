const CATEGORY_ICONS: Record<string, string> = {
  'sör': '🍺',
  'üdítők': '🥤',
  'bor és pezsgő': '🍷',
  'röviditalok': '🥃',
  snack: '🍿',
  'édesség': '🍫',
};

const DEFAULT_ICON = '🛒';

export function categoryIcon(category: unknown): string {
  const key = String(category || '').trim().toLowerCase();
  return CATEGORY_ICONS[key] || DEFAULT_ICON;
}
