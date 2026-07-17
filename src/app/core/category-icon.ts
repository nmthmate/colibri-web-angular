const CATEGORY_ICONS: Record<string, string> = {
  'sör': '🍺',
  cider: '🍏',
  'üdítő': '🥤',
  energiaital: '⚡',
  'gyümölcslé': '🧃',
  jegestea: '🧊',
  'szörp': '🍹',
  'ásványvíz': '💧',
  bor: '🍷',
  'pezsgő': '🥂',
  whisky: '🥃',
  vodka: '🍸',
  gin: '🍸',
  rum: '🥃',
  tequila: '🥃',
  'likőr': '🍶',
  'pálinka': '🥃',
  vermut: '🍷',
  brandy: '🥃',
  'rövidital': '🥃',
  abszint: '🥃',
  snack: '🍿',
  'édesség': '🍫',
};

const DEFAULT_ICON = '🛒';

export function categoryIcon(category: unknown): string {
  const key = String(category || '').trim().toLowerCase();
  return CATEGORY_ICONS[key] || DEFAULT_ICON;
}
