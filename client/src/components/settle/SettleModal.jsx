import React, { useState, useEffect } from 'react';
import { X, ArrowRight, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { centsToAmount, amountToCents, formatCurrency } from '../../utils/currency';

export default function SettleModal({
  isOpen,
  onClose,
  group,
  initialTransfer = null,
  onSettled
}) {
  const { showToast } = useToast();
  const [payerId, setPayerId] = useState('');
  const [receiverId, setReceiverId] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const members = group?.members || [];
  const currency = group?.currency || '₹';

  useEffect(() => {
    if (initialTransfer) {
      setPayerId(initialTransfer.from || '');
      setReceiverId(initialTransfer.to || '');
      setAmount(centsToAmount(initialTransfer.amount_cents).toString());
      setNotes('Direct settlement payment via SplitSync');
    } else if (members.length >= 2) {
      setPayerId(members[0].id);
      setReceiverId(members[1].id);
      setAmount('');
      setNotes('');
    }
  }, [initialTransfer, group, isOpen]);

  if (!isOpen || !group) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!payerId || !receiverId) {
      showToast('Please select both payer and receiver', 'error');
      return;
    }
    if (payerId === receiverId) {
      showToast('Payer and receiver cannot be the same person', 'error');
      return;
    }

    const amountCents = amountToCents(amount);
    if (amountCents <= 0) {
      showToast('Please enter a valid settlement amount', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.expenses.settle({
        groupId: group.id,
        payerId,
        receiverId,
        amountCents,
        notes: notes.trim()
      });

      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch (cErr) {
        // ignore confetti errors if blocked
      }

      showToast(`Settlement of ${formatCurrency(amountCents, currency)} recorded successfully!`, 'success');
      onSettled();
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to record settlement', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const payer = members.find(m => m.id === payerId);
  const receiver = members.find(m => m.id === receiverId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Settle Up Debt
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Record a direct transfer payment in {group.name}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Visual transfer preview */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ backgroundColor: payer?.avatar_color || '#4F46E5' }}
              >
                {payer?.name?.charAt(0).toUpperCase() || 'P'}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Payer</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[85px] sm:max-w-[110px] block">
                  {payer?.name || 'Select Payer'}
                </span>
              </div>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 mx-2" />

            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ backgroundColor: receiver?.avatar_color || '#10B981' }}
              >
                {receiver?.name?.charAt(0).toUpperCase() || 'R'}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Receiver</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[85px] sm:max-w-[110px] block">
                  {receiver?.name || 'Select Receiver'}
                </span>
              </div>
            </div>
          </div>

          {/* Payer and Receiver Selectors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">
                Who Paid?
              </label>
              <select
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">
                Paid To Whom?
              </label>
              <select
                value={receiverId}
                onChange={(e) => setReceiverId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">
              Settlement Amount ({currency})
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
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
                className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Payment Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Paid via UPI / GPay / Cash"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

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
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-sm shadow-emerald-600/30 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Recording...
                </>
              ) : (
                'Confirm Settlement'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

