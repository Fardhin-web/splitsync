import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Receipt, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Utensils, 
  Home, 
  ShoppingCart, 
  Compass, 
  Package, 
  Film,
  Divide,
  SlidersHorizontal,
  Percent,
  Calendar
} from 'lucide-react';
import { formatCurrency, getCategoryMeta, CATEGORIES } from '../../utils/currency';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function ExpenseList({
  expenses = [],
  currency = '₹',
  currentUserId,
  onEditExpense,
  onDeleted
}) {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Category Icon Resolver
  const getCategoryIcon = (iconName) => {
    switch (iconName) {
      case 'Utensils': return <Utensils className="w-4 h-4" />;
      case 'Home': return <Home className="w-4 h-4" />;
      case 'ShoppingCart': return <ShoppingCart className="w-4 h-4" />;
      case 'Compass': return <Compass className="w-4 h-4" />;
      case 'Package': return <Package className="w-4 h-4" />;
      case 'Film': return <Film className="w-4 h-4" />;
      case 'CheckCircle2': return <CheckCircle2 className="w-4 h-4" />;
      default: return <Receipt className="w-4 h-4" />;
    }
  };

  const handleDelete = async (expenseId, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      await api.expenses.delete(expenseId);
      showToast('Expense deleted successfully', 'success');
      onDeleted();
    } catch (err) {
      showToast(err.message || 'Failed to delete expense', 'error');
    }
  };

  // Filter expenses
  const filtered = expenses.filter(exp => {
    const matchesSearch = 
      exp.title.toLowerCase().includes(search.toLowerCase()) ||
      (exp.notes && exp.notes.toLowerCase().includes(search.toLowerCase())) ||
      (exp.paid_by_name && exp.paid_by_name.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = selectedCategory === 'ALL' || exp.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-4 sm:p-5 lg:p-6">
      {/* Top Controls: Search & Category Chips */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Recent Itemized Expenses
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Showing {filtered.length} of {expenses.length} recorded purchases
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, notes, payer..."
            className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-3 border-b border-slate-100 dark:border-slate-800 no-scrollbar">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            selectedCategory === 'ALL'
              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          All Categories
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              selectedCategory === cat.id
                ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Expense Items Feed */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="p-8 sm:p-10 text-center rounded-xl bg-slate-50 dark:bg-slate-850 border border-dashed border-slate-200 dark:border-slate-800">
            <Receipt className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No matching expenses found
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Try adjusting your search query or category filter
            </p>
          </div>
        ) : (
          filtered.map(exp => {
            const meta = getCategoryMeta(exp.category);
            const isSettlement = exp.is_settlement === 1;
            const splits = exp.splits || [];
            
            // Check personal involvement
            const isPayer = exp.paid_by === currentUserId;
            const mySplit = splits.find(s => s.user_id === currentUserId);
            const myOwedCents = mySplit ? mySplit.owed_cents : 0;

            return (
              <div
                key={exp.id}
                className="group p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:shadow-sm"
              >
                {/* Left: Category Icon & Details */}
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs mt-0.5 sm:mt-0 ${meta.bg}`}
                  >
                    {getCategoryIcon(meta.icon)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate max-w-full">
                        {exp.title}
                      </h4>
                      {isSettlement && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 rounded shrink-0">
                          Settlement
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      <span className="flex items-center gap-1 shrink-0">
                        <Calendar className="w-3 h-3" />
                        {exp.expense_date}
                      </span>
                      <span>•</span>
                      <span className="truncate">
                        Paid by <strong className="font-semibold text-slate-700 dark:text-slate-300">{exp.paid_by_name}</strong>
                      </span>
                      {!isSettlement && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
                            {exp.split_type === 'EQUAL' && <Divide className="w-3 h-3 text-indigo-500" />}
                            {exp.split_type === 'EXACT' && <SlidersHorizontal className="w-3 h-3 text-indigo-500" />}
                            {exp.split_type === 'PERCENT' && <Percent className="w-3 h-3 text-indigo-500" />}
                            {exp.split_type} ({splits.length})
                          </span>
                        </>
                      )}
                    </div>

                    {exp.notes && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 italic truncate mt-0.5">
                        "{exp.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Personal Status, Total Amount & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  <div className="text-left sm:text-right">
                    <div className="text-base font-extrabold font-mono text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {formatCurrency(exp.amount_cents, currency)}
                    </div>

                    {/* Personal lens */}
                    {!isSettlement && (
                      <div className="text-[11px] font-medium whitespace-nowrap">
                        {isPayer ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            You lent {formatCurrency(exp.amount_cents - (myOwedCents || 0), currency)}
                          </span>
                        ) : myOwedCents > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400 font-semibold">
                            You borrowed {formatCurrency(myOwedCents, currency)}
                          </span>
                        ) : (
                          <span className="text-slate-400">Not involved</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions - visible on mobile, hover on desktop */}
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                    {!isSettlement && (
                      <button
                        onClick={() => onEditExpense(exp)}
                        title="Edit expense"
                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(exp.id, exp.title)}
                      title="Delete expense"
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
