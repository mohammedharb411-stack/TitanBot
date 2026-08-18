/**
 * Command category metadata for the command access manager.
 */

export const CATEGORY_ICONS = {
  عيد_ميلاد: '🎂',
  مجتمع: '👥',
  جوهر: 'ℹ️',
  اقتصاد: '💰',
  هزار: '🎮',
  يتبرع: '🎉',
  انضم_لإنشاء: '🔌',
  التسوية: '📊',
  قطع_الأشجار: '📝',
  الاعتدال: '🛡️',
  موسيقى: '🎵',
  أدوار_رد_الفعل: '🎭',
  يبحث: '🔍',
  إحصائيات_الخادم: '📈',
  تكت: '🎫',
  أدوات: '🛠️',
  جدوى: '🔧',
  تَحَقّق: '✅',
  مرحباً: '👋',
};

/** Commands that always stay available so admins can recover access. */
export const PROTECTED_COMMANDS = new Set(['commands', 'configwizard']);

export function normalizeCategoryKey(category) {
  return String(category || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

export function formatCategoryName(rawCategory) {
  return String(rawCategory || '')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getCategoryIcon(category) {
  return CATEGORY_ICONS[category] || CATEGORY_ICONS[formatCategoryName(category)] || '📁';
}
