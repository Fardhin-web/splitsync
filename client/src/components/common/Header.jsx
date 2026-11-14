import React from 'react';
import { Plus, Users, Menu, Sparkles, ArrowRightLeft, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

export default function Header({
  currentGroup,
  onOpenNewExpense,
  onOpenAddMember,
  onOpenSettle,
  onToggleSidebar
}) {
  if (!currentGroup) return null;

  const budget = currentGroup.monthly_budget || 0;
  const currentSpend = currentGroup.current_month_spend_cents || 0;
  const budgetRatio = budget > 0 ? (currentSpend / budget) : 0;
  const budgetPercent = budget > 0 ? Math.min(100, Math.round(budgetRatio * 100)) : 0;

  let budgetBadgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60';
  if (budgetRatio > 0.90) {
    budgetBadgeColor = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60';
  } else if (budgetRatio >= 0.75) {
    budgetBadgeColor = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60';
  }

  return (
    <header className="h-16 px-4 lg:px-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between sticky top-0 z-30 transition-colors">
      {/* Left: Group Info */}
      <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
        {/* Mobile menu button */}
        <button
          onClick={onToggleSidebar}
          aria-label="Open menu"
          className="p-2 -ml-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg lg:hidden shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
              {currentGroup.name}
            </h1>
            <span className="shrink-0 px-2 py-0.5 text-[11px] font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {currentGroup.currency}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
            <span className="shrink-0">{currentGroup.members?.length || 0} flatmates</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium truncate">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">DSA Net Minimization Active</span>
              <span className="sm:hidden">DSA Active</span>
            </span>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Budget Pill if configured */}
        {budget > 0 && (
          <div className={`hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-semibold ${budgetBadgeColor}`}>
            <span>{budgetPercent}% budget</span>
            <div className="w-10 h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden shrink-0">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  budgetRatio > 0.90 ? 'bg-rose-500' : budgetRatio >= 0.75 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${budgetPercent}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={onOpenSettle}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors"
        >
          <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
          <span>Settle</span>
        </button>

        <button
          onClick={onOpenAddMember}
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 rounded-xl border border-indigo-200/60 dark:border-indigo-800/60 transition-colors"
        >
          <Users className="w-3.5 h-3.5" />
          <span>Add Flatmate</span>
        </button>

        <button
          onClick={onOpenNewExpense}
          className="flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-sm shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Expense</span>
        </button>
      </div>
    </header>
  );
}
