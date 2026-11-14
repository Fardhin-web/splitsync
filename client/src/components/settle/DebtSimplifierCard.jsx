import React, { useState } from 'react';
import { 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Info, 
  Cpu, 
  Layers, 
  ShieldCheck,
  TrendingDown
} from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

export default function DebtSimplifierCard({
  debtSummary,
  currency = '₹',
  members = [],
  onSettleTransfer,
  isSidebar = false
}) {
  const [mode, setMode] = useState('simplified'); // 'simplified' | 'raw'

  if (!debtSummary) return null;

  const { simplifiedDebts = [], rawDebts = [], netBalances = {}, metrics = {} } = debtSummary;
  const activeDebts = mode === 'simplified' ? simplifiedDebts : rawDebts;

  // Build sorted net balances
  const sortedMembers = [...members].sort((a, b) => {
    const balA = netBalances[a.id] || 0;
    const balB = netBalances[b.id] || 0;
    return balB - balA;
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-4 sm:p-5 lg:p-6 mb-6">
      {/* Top Header & Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Debt Simplification Engine
            </h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 rounded-md border border-indigo-200/50 dark:border-indigo-800/50 shrink-0">
              <Cpu className="w-3 h-3" />
              O(N log N)
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Greedy net-balance minimization eliminates cyclic debts
          </p>
        </div>

        {/* The Evaluator UI Toggle */}
        <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60 self-start sm:self-auto shrink-0">
          <button
            onClick={() => setMode('simplified')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'simplified'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>Simplified ({metrics.simplifiedTransactionCount || 0})</span>
          </button>
          <button
            onClick={() => setMode('raw')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'raw'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Raw ({metrics.rawTransactionCount || 0})</span>
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      {metrics.rawTransactionCount > metrics.simplifiedTransactionCount && (
        <div className="mt-3.5 p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 via-indigo-500/10 to-transparent border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium min-w-0">
            <TrendingDown className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="truncate">
              {mode === 'simplified' ? (
                <>
                  <strong className="font-bold">{metrics.transactionsSaved} transfers saved</strong> ({metrics.reductionPercentage}% reduction)!
                </>
              ) : (
                <>
                  Viewing raw pairwise debts. Switch to <strong>Simplified</strong> to eliminate loop debts.
                </>
              )}
            </span>
          </div>
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 self-start sm:self-auto shrink-0">
            {metrics.simplifiedTransactionCount} vs {metrics.rawTransactionCount} transfers
          </span>
        </div>
      )}

      {/* Active Debts List */}
      <div className="mt-4">
        {activeDebts.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-slate-50 dark:bg-slate-850 border border-dashed border-slate-200 dark:border-slate-800">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-90" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              All Balances Settled Up!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              No outstanding debts remain in this group. Everyone is even!
            </p>
          </div>
        ) : (
          <div className={isSidebar ? 'grid grid-cols-1 gap-2.5' : 'grid grid-cols-1 md:grid-cols-2 gap-3'}>
            {activeDebts.map((transfer, idx) => (
              <div
                key={`${transfer.from}-${transfer.to}-${idx}`}
                className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/60 hover:bg-white dark:hover:bg-slate-850 hover:border-indigo-200 dark:hover:border-indigo-800/80 transition-all flex items-center justify-between gap-2 shadow-xs"
              >
                {/* Debtor & Creditor Flow with truncation */}
                <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1">
                  {/* From (Debtor) */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 shadow-xs"
                      style={{ backgroundColor: transfer.fromUser?.avatar_color || '#DC2626' }}
                    >
                      {transfer.fromUser?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[65px] sm:max-w-[90px]">
                        {transfer.fromUser?.name}
                      </p>
                      <span className="text-[9px] text-rose-500 font-semibold uppercase tracking-wider block">
                        Owes
                      </span>
                    </div>
                  </div>

                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0 mx-0.5" />

                  {/* To (Creditor) */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 shadow-xs"
                      style={{ backgroundColor: transfer.toUser?.avatar_color || '#059669' }}
                    >
                      {transfer.toUser?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[65px] sm:max-w-[90px]">
                        {transfer.toUser?.name}
                      </p>
                      <span className="text-[9px] text-emerald-500 font-semibold uppercase tracking-wider block">
                        Gets
                      </span>
                    </div>
                  </div>
                </div>

                {/* Amount & Settle Button */}
                <div className="flex items-center gap-2 shrink-0 ml-1">
                  <div className="text-right">
                    <span className="text-xs sm:text-sm font-extrabold font-mono text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {formatCurrency(transfer.amount_cents, currency)}
                    </span>
                  </div>
                  <button
                    onClick={() => onSettleTransfer(transfer)}
                    className="px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-white bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-600 dark:hover:bg-indigo-600 rounded-lg border border-indigo-200/60 dark:border-indigo-800/60 transition-all shadow-xs shrink-0"
                  >
                    Settle
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Net Balances Summary Bar */}
      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5">
          Flatmate Net Standings (Paid - Consumed)
        </h3>
        <div className={isSidebar ? 'grid grid-cols-1 sm:grid-cols-2 gap-2' : 'grid grid-cols-2 sm:grid-cols-4 gap-2.5'}>
          {sortedMembers.map((m) => {
            const balance = netBalances[m.id] || 0;
            const isPos = balance > 0;
            const isNeg = balance < 0;

            return (
              <div
                key={m.id}
                className="p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-850/40 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                    style={{ backgroundColor: m.avatar_color || '#6366F1' }}
                  >
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                    {m.name}
                  </span>
                </div>
                <span
                  className={`text-xs font-bold font-mono shrink-0 whitespace-nowrap ${
                    isPos
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : isNeg
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-400'
                  }`}
                >
                  {isPos && '+'}
                  {formatCurrency(balance, currency)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
