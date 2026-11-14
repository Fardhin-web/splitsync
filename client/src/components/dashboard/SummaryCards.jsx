import React from 'react';
import { 
  CreditCard, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Target, 
  AlertTriangle,
  CheckCircle,
  TrendingUp
} from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

export default function SummaryCards({
  group,
  debtSummary,
  currentUserId,
  onOpenSettle
}) {
  if (!group) return null;

  const currency = group.currency || '₹';
  const totalSpend = group.total_spend_cents || 0;
  const budget = group.monthly_budget || 0;
  const currentMonthSpend = group.current_month_spend_cents || 0;

  // Calculate my balance
  const myNetBalance = (debtSummary?.netBalances && debtSummary.netBalances[currentUserId]) || 0;
  const isOwed = myNetBalance > 0;
  const isOwing = myNetBalance < 0;

  // Budget calculations
  const remainingBudget = Math.max(0, budget - currentMonthSpend);
  const budgetUsageRatio = budget > 0 ? (currentMonthSpend / budget) : 0;
  const budgetUsagePercent = budget > 0 ? Math.min(100, Math.round(budgetUsageRatio * 100)) : 0;

  let budgetStatus = 'emerald';
  let budgetColorClasses = 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20';
  let progressColor = 'bg-emerald-500';

  if (budgetUsageRatio > 0.90) {
    budgetStatus = 'rose';
    budgetColorClasses = 'text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/60 bg-rose-50/50 dark:bg-rose-950/20';
    progressColor = 'bg-rose-500';
  } else if (budgetUsageRatio >= 0.75) {
    budgetStatus = 'amber';
    budgetColorClasses = 'text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20';
    progressColor = 'bg-amber-500';
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Total Group Spend */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between min-w-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate">
            Total Group Spend
          </span>
          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
            <CreditCard className="w-4 h-4" />
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight font-mono truncate">
            {formatCurrency(totalSpend, currency)}
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 truncate">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            Across roommate expenses
          </p>
        </div>
      </div>

      {/* 2. You Are Owed (Emerald) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between min-w-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 truncate">
            You Are Owed
          </span>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ArrowDownLeft className="w-4 h-4" />
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight font-mono truncate">
            {isOwed ? formatCurrency(myNetBalance, currency) : `${currency}0.00`}
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
            {isOwed ? 'Net credit across all roommates' : 'No pending reimbursements'}
          </p>
        </div>
      </div>

      {/* 3. You Owe (Rose) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between min-w-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 truncate">
            You Owe
          </span>
          <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-xl sm:text-2xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight font-mono truncate">
            {isOwing ? formatCurrency(Math.abs(myNetBalance), currency) : `${currency}0.00`}
          </div>
          <div className="flex items-center justify-between mt-1 gap-2">
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
              {isOwing ? 'Outstanding balance' : 'All debts settled!'}
            </p>
            {isOwing && (
              <button
                onClick={onOpenSettle}
                className="text-[11px] sm:text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline shrink-0"
              >
                Settle Now →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Group Target Budget */}
      <div className={`p-4 sm:p-5 rounded-2xl border shadow-xs flex flex-col justify-between min-w-0 ${budget > 0 ? budgetColorClasses : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800'}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
            {budget > 0 ? 'Monthly Budget' : 'Group Budget'}
          </span>
          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
            <Target className="w-4 h-4" />
          </div>
        </div>
        <div className="min-w-0">
          {budget > 0 ? (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xl sm:text-2xl font-extrabold tracking-tight font-mono truncate">
                  {formatCurrency(remainingBudget, currency)}
                </span>
                <span className="text-xs font-semibold opacity-80 shrink-0">
                  {budgetUsagePercent}% spent
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                  style={{ width: `${budgetUsagePercent}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <div className="text-lg sm:text-xl font-bold text-slate-400 dark:text-slate-500 font-mono truncate">
                No Cap Set
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 mt-1 truncate">
                Configure monthly budget cap
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
