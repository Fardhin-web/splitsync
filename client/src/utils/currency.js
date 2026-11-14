/**
 * Utility functions for currency and financial calculations.
 * All monetary amounts in SplitSync are stored and manipulated
 * as integer cents/paise (amount * 100) to eliminate IEEE 754 
 * floating point rounding errors.
 */

export function centsToAmount(cents) {
  if (cents === null || cents === undefined || isNaN(cents)) return 0;
  return Number(cents) / 100;
}

export function amountToCents(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return 0;
  return Math.round(Number(amount) * 100);
}

export function formatCurrency(cents, symbol = '₹') {
  const numeric = centsToAmount(cents);
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numeric);

  return `${symbol}${formatted}`;
}

export const CATEGORIES = [
  { id: 'Food & Dining', name: 'Food & Dining', color: '#F59E0B', bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', icon: 'Utensils' },
  { id: 'Rent & Utilities', name: 'Rent & Utilities', color: '#6366F1', bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400', icon: 'Home' },
  { id: 'Groceries', name: 'Groceries', color: '#10B981', bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', icon: 'ShoppingCart' },
  { id: 'Travel', name: 'Travel', color: '#0EA5E9', bg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400', icon: 'Compass' },
  { id: 'Supplies', name: 'Supplies', color: '#8B5CF6', bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400', icon: 'Package' },
  { id: 'Entertainment', name: 'Entertainment', color: '#EC4899', bg: 'bg-pink-500/10 text-pink-600 dark:text-pink-400', icon: 'Film' },
  { id: 'Settlement', name: 'Settlement', color: '#059669', bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', icon: 'CheckCircle2' }
];

export function getCategoryMeta(categoryId) {
  const found = CATEGORIES.find(c => c.id === categoryId);
  return found || {
    id: categoryId || 'Other',
    name: categoryId || 'Other',
    color: '#64748B',
    bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
    icon: 'Receipt'
  };
}

