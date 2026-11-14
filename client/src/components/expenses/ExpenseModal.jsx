import React, { useState, useEffect } from 'react';
import { 
  X, 
  Receipt, 
  Check, 
  AlertCircle, 
  Loader2, 
  Users, 
  Divide, 
  Percent, 
  SlidersHorizontal 
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { 
  CATEGORIES, 
  centsToAmount, 
  amountToCents, 
  formatCurrency 
} from '../../utils/currency';

export default function ExpenseModal({
  isOpen,
  onClose,
  group,
  expenseToEdit = null,
  onSaved
}) {
  const { showToast } = useToast();
  const members = group?.members || [];
  const currency = group?.currency || '₹';

  // Form State
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food & Dining');
  const [paidBy, setPaidBy] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [notes, setNotes] = useState('');
  const [splitType, setSplitType] = useState('EQUAL'); // 'EQUAL' | 'EXACT' | 'PERCENT'
  
  // Custom split values per member
  // For Equal: Set of included userIds
  const [equalParticipants, setEqualParticipants] = useState(new Set());
  // For Exact: Map of userId -> string amount
  const [exactAmounts, setExactAmounts] = useState({});
  // For Percent: Map of userId -> string percentage
  const [percentages, setPercentages] = useState({});

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (expenseToEdit) {
        setTitle(expenseToEdit.title);
        setAmount(centsToAmount(expenseToEdit.amount_cents).toString());
        setCategory(expenseToEdit.category || 'Food & Dining');
        setPaidBy(expenseToEdit.paid_by);
        setExpenseDate(expenseToEdit.expense_date || new Date().toISOString().split('T')[0]);
        setNotes(expenseToEdit.notes || '');
        setSplitType(expenseToEdit.split_type || 'EQUAL');

        // Populate splits
        const splitList = expenseToEdit.splits || [];
        if (expenseToEdit.split_type === 'EQUAL') {
          setEqualParticipants(new Set(splitList.map(s => s.user_id)));
        } else if (expenseToEdit.split_type === 'EXACT') {
          const m = {};
          splitList.forEach(s => { m[s.user_id] = centsToAmount(s.owed_cents).toString(); });
          setExactAmounts(m);
        } else if (expenseToEdit.split_type === 'PERCENT') {
          const p = {};
          splitList.forEach(s => { p[s.user_id] = (s.percentage || 0).toString(); });
          setPercentages(p);
        }
      } else {
        // Reset for new expense
        setTitle('');
        setAmount('');
        setCategory('Food & Dining');
        setPaidBy(members[0]?.id || '');
        setExpenseDate(new Date().toISOString().split('T')[0]);
        setNotes('');
        setSplitType('EQUAL');
        
        // Include all members by default for Equal split
        setEqualParticipants(new Set(members.map(m => m.id)));

        // Equal distribution for percent initial values
        const defaultPct = members.length > 0 ? (100 / members.length).toFixed(1) : 0;
        const initialPcts = {};
        members.forEach(m => { initialPcts[m.id] = defaultPct; });
        setPercentages(initialPcts);

        const initialExact = {};
        members.forEach(m => { initialExact[m.id] = ''; });
        setExactAmounts(initialExact);
      }
    }
  }, [isOpen, expenseToEdit, group]);

  if (!isOpen || !group) return null;

  const totalCents = amountToCents(amount);

  // Equal split calculations
  const equalCount = equalParticipants.size;
  const equalPerPersonCents = equalCount > 0 ? Math.floor(totalCents / equalCount) : 0;

  // Exact split calculations
  let exactAllocatedCents = 0;
  for (const m of members) {
    exactAllocatedCents += amountToCents(exactAmounts[m.id] || 0);
  }
  const exactRemainingCents = totalCents - exactAllocatedCents;

  // Percentage split calculations
  let totalPercent = 0;
  for (const m of members) {
    totalPercent += Number(percentages[m.id] || 0);
  }
  const remainingPercent = +( (100 - totalPercent).toFixed(1) );

  const toggleEqualParticipant = (id) => {
    setEqualParticipants(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      showToast('Please enter an expense title', 'error');
      return;
    }
    if (totalCents <= 0) {
      showToast('Please enter a valid expense amount', 'error');
      return;
    }
    if (!paidBy) {
      showToast('Please select who paid', 'error');
      return;
    }

    let payloadSplits = [];

    if (splitType === 'EQUAL') {
      if (equalParticipants.size === 0) {
        showToast('Select at least one participant for the equal split', 'error');
        return;
      }
      payloadSplits = Array.from(equalParticipants).map(userId => ({ userId }));
    } else if (splitType === 'EXACT') {
      if (exactRemainingCents !== 0) {
        showToast(`Exact shares sum (${formatCurrency(exactAllocatedCents, currency)}) must match total (${formatCurrency(totalCents, currency)})`, 'error');
        return;
      }
      payloadSplits = members.map(m => ({
        userId: m.id,
        owedCents: amountToCents(exactAmounts[m.id] || 0)
      }));
    } else if (splitType === 'PERCENT') {
      if (Math.abs(remainingPercent) > 0.5) {
        showToast(`Percentages must sum to 100% (currently ${totalPercent.toFixed(1)}%)`, 'error');
        return;
      }
      payloadSplits = members.map(m => ({
        userId: m.id,
        percentage: Number(percentages[m.id] || 0)
      }));
    }

    try {
      setIsSubmitting(true);
      const payload = {
        groupId: group.id,
        title: title.trim(),
        amountCents: totalCents,
        category,
        splitType,
        expenseDate,
        notes: notes.trim(),
        paidBy,
        splits: payloadSplits
      };

      if (expenseToEdit) {
        await api.expenses.update(expenseToEdit.id, payload);
        showToast('Expense updated successfully!', 'success');
      } else {
        await api.expenses.create(payload);
        showToast('Expense added successfully!', 'success');
      }

      onSaved();
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to save expense', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {expenseToEdit ? 'Edit Expense' : 'Add New Expense'}
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Record a shared transaction in {group.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {/* Title and Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Expense Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Groceries at Supermarket"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Total Amount ({currency})
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                  {currency}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full pl-7 pr-3 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Category and Paid By */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {CATEGORIES.filter(c => c.id !== 'Settlement').map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Paid By
              </label>
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date & Split Mode Tabs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Split Mode
              </label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="text-xs px-2.5 py-1 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => setSplitType('EQUAL')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  splitType === 'EQUAL'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Divide className="w-3.5 h-3.5" />
                Equal
              </button>
              <button
                type="button"
                onClick={() => setSplitType('EXACT')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  splitType === 'EXACT'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Exact Amounts
              </button>
              <button
                type="button"
                onClick={() => setSplitType('PERCENT')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  splitType === 'PERCENT'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Percent className="w-3.5 h-3.5" />
                Percentage
              </button>
            </div>
          </div>

          {/* Mode 1: Equal Split Content */}
          {splitType === 'EQUAL' && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Select Participants ({equalParticipants.size}/{members.length})
                </span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(equalPerPersonCents, currency)} / person
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {members.map(m => {
                  const isChecked = equalParticipants.has(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleEqualParticipant(m.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition-all ${
                        isChecked
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                          style={{ backgroundColor: m.avatar_color || '#6366F1' }}
                        >
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate">{m.name}</span>
                      </div>
                      <div className={`w-4 h-4 rounded-md flex items-center justify-center border shrink-0 ml-1.5 ${
                        isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-700'
                      }`}>
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mode 2: Exact Amounts Content */}
          {splitType === 'EXACT' && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-700 dark:text-slate-300">
                  Specify Exact Amounts
                </span>
                <span className={`font-mono ${exactRemainingCents === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {exactRemainingCents === 0 ? '✓ Balanced exactly' : `Remaining: ${formatCurrency(exactRemainingCents, currency)}`}
                </span>
              </div>

              <div className="space-y-2">
                {members.map(m => (
                  <div key={m.id} className="flex items-center justify-between gap-2.5 p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                        style={{ backgroundColor: m.avatar_color || '#6366F1' }}
                      >
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                        {m.name}
                      </span>
                    </div>

                    <div className="relative w-28 sm:w-32 shrink-0">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        {currency}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={exactAmounts[m.id] || ''}
                        onChange={(e) => setExactAmounts({ ...exactAmounts, [m.id]: e.target.value })}
                        placeholder="0.00"
                        className="w-full pl-6 pr-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-slate-100 text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mode 3: Percentage Split Content */}
          {splitType === 'PERCENT' && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-700 dark:text-slate-300">
                  Assign Percentages
                </span>
                <span className={`font-mono ${Math.abs(remainingPercent) <= 0.1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {Math.abs(remainingPercent) <= 0.1 ? '✓ Sum: 100%' : `Remaining: ${remainingPercent}%`}
                </span>
              </div>

              <div className="space-y-2">
                {members.map(m => {
                  const pct = Number(percentages[m.id] || 0);
                  const approxCents = Math.round((totalCents * pct) / 100);

                  return (
                    <div key={m.id} className="flex items-center justify-between gap-2.5 p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                          style={{ backgroundColor: m.avatar_color || '#6366F1' }}
                        >
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                          {m.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-mono text-slate-400">
                          {formatCurrency(approxCents, currency)}
                        </span>
                        <div className="relative w-20">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={percentages[m.id] || ''}
                            onChange={(e) => setPercentages({ ...percentages, [m.id]: e.target.value })}
                            placeholder="0"
                            className="w-full pl-2 pr-6 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-slate-100 text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Paid through UPI, bill attached on flat chat"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-sm shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                expenseToEdit ? 'Save Changes' : 'Record Expense'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

