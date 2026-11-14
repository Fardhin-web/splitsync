import React, { useState, useEffect } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Target, 
  PieChart as PieIcon, 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert,
  Calendar,
  Sparkles
} from 'lucide-react';
import { api } from '../../services/api';
import { formatCurrency, centsToAmount, CATEGORIES } from '../../utils/currency';

const CATEGORY_COLORS = {
  'Food & Dining': '#F59E0B',
  'Rent & Utilities': '#6366F1',
  'Groceries': '#10B981',
  'Travel': '#0EA5E9',
  'Supplies': '#8B5CF6',
  'Entertainment': '#EC4899',
  'Other': '#64748B'
};

export default function AnalyticsView({ groupId, currency = '₹' }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadAnalytics() {
      if (!groupId) return;
      try {
        setIsLoading(true);
        setError(null);
        const res = await api.analytics.get(groupId);
        setData(res);
      } catch (err) {
        setError(err.message || 'Failed to load group analytics');
      } finally {
        setIsLoading(false);
      }
    }
    loadAnalytics();
  }, [groupId]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{error || 'No analytics data'}</p>
      </div>
    );
  }

  const { group, categoryBreakdown = [], memberComparison = [] } = data;
  const budget = group.monthly_budget || 0;
  const currentMonthSpend = group.current_month_spend_cents || 0;
  const remainingBudget = Math.max(0, budget - currentMonthSpend);
  const budgetRatio = budget > 0 ? (currentMonthSpend / budget) : 0;
  const budgetPercent = budget > 0 ? Math.min(100, Math.round(budgetRatio * 100)) : 0;

  // Chart data formatting
  const donutData = categoryBreakdown.map(c => ({
    name: c.category,
    value: centsToAmount(c.amount_cents),
    percentage: c.percentage,
    color: CATEGORY_COLORS[c.category] || '#6366F1'
  }));

  const barData = memberComparison.map(m => ({
    name: m.name,
    'Paid': centsToAmount(m.paid_cents),
    'Consumed': centsToAmount(m.consumed_cents),
    net: centsToAmount(m.net_cents)
  }));

  // Custom tooltips for recharts
  const CustomDonutTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs shadow-xl border border-slate-700">
          <p className="font-bold">{item.name}</p>
          <p className="font-mono mt-0.5">{currency}{item.value.toFixed(2)} ({item.percentage}%)</p>
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl text-xs shadow-xl border border-slate-700 space-y-1">
          <p className="font-bold border-b border-slate-700 pb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={`item-${index}`} className="flex items-center justify-between gap-3 font-mono">
              <span style={{ color: entry.color }}>{entry.name}:</span>
              <span className="font-bold">{currency}{entry.value.toFixed(2)}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* 1. Monthly Budget Tracker Progress Hero */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              group.budget_status === 'rose'
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                : group.budget_status === 'amber'
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
            }`}>
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Monthly Budget Tracker
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Expenditure pacing against group budget limit
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
              group.budget_status === 'rose'
                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800'
                : group.budget_status === 'amber'
                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800'
            }`}>
              {budgetPercent}% Consumed
            </span>
          </div>
        </div>

        {budget > 0 ? (
          <div>
            {/* Progress Bar with Color Shift */}
            <div className="w-full h-3.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  group.budget_status === 'rose'
                    ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                    : group.budget_status === 'amber'
                    ? 'bg-gradient-to-r from-emerald-500 to-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${budgetPercent}%` }}
              />
            </div>

            {/* Quick figures */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-left">
              <div className="min-w-0">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block truncate">Target Budget</span>
                <p className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5 truncate">
                  {formatCurrency(budget, currency)}
                </p>
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block truncate">Current Month Spent</span>
                <p className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5 truncate">
                  {formatCurrency(currentMonthSpend, currency)}
                </p>
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block truncate">Remaining Budget</span>
                <p className={`text-lg font-bold font-mono mt-0.5 truncate ${remainingBudget > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {formatCurrency(remainingBudget, currency)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 text-center text-xs text-slate-500">
            No monthly budget cap has been set for this group yet. You can set one in group settings.
          </div>
        )}
      </div>

      {/* 2. Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category-wise spending Donut Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-5 sm:p-6 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between mb-4 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <PieIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                Category-wise Spending
              </h3>
            </div>
            <span className="text-xs font-semibold text-slate-400 shrink-0">
              Total {formatCurrency(group.total_spend_cents, currency)}
            </span>
          </div>

          {donutData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              No category data available yet
            </div>
          ) : (
            <div className="h-72 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomDonutTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(value) => <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Member contribution vs consumption Bar Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-5 sm:p-6 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between mb-4 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                Contribution vs. Consumption
              </h3>
            </div>
            <span className="text-xs font-semibold text-slate-400 shrink-0">
              Paid vs. Consumed
            </span>
          </div>

          {barData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              No member comparison data available yet
            </div>
          ) : (
            <div className="h-72 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -5, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                    interval={0}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                    tickFormatter={(val) => `${currency}${val}`}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(value) => <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{value}</span>}
                  />
                  <Bar dataKey="Paid" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Consumed" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
