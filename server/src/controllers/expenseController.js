const crypto = require('crypto');
const { getDb } = require('../db');

/**
 * Calculates equal splits with remainder cents distributed cleanly.
 * e.g., 1000 cents split among 3 people -> [334, 333, 333]
 */
function computeEqualSplits(totalCents, participantIds) {
  const count = participantIds.length;
  if (count === 0) return [];

  const baseShare = Math.floor(totalCents / count);
  const remainder = totalCents % count;

  return participantIds.map((userId, index) => ({
    userId,
    owedCents: baseShare + (index < remainder ? 1 : 0),
    percentage: +( (100 / count).toFixed(2) )
  }));
}

function createExpense(req, res) {
  try {
    const {
      groupId,
      title,
      amountCents,
      category = 'Food & Dining',
      splitType = 'EQUAL',
      expenseDate,
      notes = '',
      paidBy,
      splits = []
    } = req.body;

    if (!groupId || !title || !amountCents || !paidBy) {
      return res.status(400).json({ error: 'Group, title, amount, and payer are required' });
    }

    const totalCents = Math.round(Number(amountCents));
    if (totalCents <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than zero' });
    }

    const db = getDb();
    const dateStr = expenseDate || new Date().toISOString().split('T')[0];

    // Compute splits based on splitType
    let resolvedSplits = [];

    if (splitType === 'EQUAL') {
      const participantIds = splits.length > 0 ? splits.map(s => s.userId) : [paidBy];
      resolvedSplits = computeEqualSplits(totalCents, participantIds);
    } else if (splitType === 'EXACT') {
      // Validate sum matches exactly
      let sum = 0;
      for (const s of splits) {
        sum += Math.round(Number(s.owedCents || 0));
      }
      if (sum !== totalCents) {
        return res.status(400).json({
          error: `Sum of exact shares (${sum} cents) does not match total expense amount (${totalCents} cents)`
        });
      }
      resolvedSplits = splits.map(s => ({
        userId: s.userId,
        owedCents: Math.round(Number(s.owedCents)),
        percentage: +( ((s.owedCents / totalCents) * 100).toFixed(2) )
      }));
    } else if (splitType === 'PERCENT') {
      // Validate percentages sum to ~100%
      let totalPct = 0;
      for (const s of splits) {
        totalPct += Number(s.percentage || 0);
      }
      if (Math.abs(totalPct - 100) > 0.5) {
        return res.status(400).json({
          error: `Percentages must add up to 100% (currently ${totalPct.toFixed(1)}%)`
        });
      }

      // Convert percentages to cents and allocate remainder to the first participant
      let allocatedCents = 0;
      resolvedSplits = splits.map((s, idx) => {
        const pct = Number(s.percentage);
        const cents = Math.round((totalCents * pct) / 100);
        allocatedCents += cents;
        return {
          userId: s.userId,
          owedCents: cents,
          percentage: pct
        };
      });

      // Fix rounding variance if any
      const variance = totalCents - allocatedCents;
      if (variance !== 0 && resolvedSplits.length > 0) {
        resolvedSplits[0].owedCents += variance;
      }
    }

    const expenseId = crypto.randomUUID();

    const insertTransaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO expenses (id, group_id, paid_by, title, amount_cents, category, split_type, expense_date, notes, is_settlement)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `).run(expenseId, groupId, paidBy, title.trim(), totalCents, category, splitType, dateStr, notes.trim());

      const insertSplitStmt = db.prepare(`
        INSERT INTO expense_splits (id, expense_id, user_id, owed_cents, percentage)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const s of resolvedSplits) {
        const splitId = crypto.randomUUID();
        insertSplitStmt.run(splitId, expenseId, s.userId, s.owedCents, s.percentage);
      }
    });

    insertTransaction();

    const createdExpense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expenseId);
    const createdSplits = db.prepare('SELECT * FROM expense_splits WHERE expense_id = ?').all(expenseId);

    return res.status(201).json({
      expense: {
        ...createdExpense,
        splits: createdSplits
      }
    });
  } catch (error) {
    console.error('createExpense error:', error);
    return res.status(500).json({ error: 'Failed to record expense' });
  }
}

function updateExpense(req, res) {
  try {
    const { expenseId } = req.params;
    const {
      title,
      amountCents,
      category,
      splitType,
      expenseDate,
      notes,
      paidBy,
      splits = []
    } = req.body;

    const db = getDb();
    const existing = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expenseId);
    if (!existing) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const totalCents = Math.round(Number(amountCents || existing.amount_cents));
    const effectiveSplitType = splitType || existing.split_type;

    let resolvedSplits = [];
    if (effectiveSplitType === 'EQUAL') {
      const participantIds = splits.length > 0 ? splits.map(s => s.userId) : [paidBy || existing.paid_by];
      resolvedSplits = computeEqualSplits(totalCents, participantIds);
    } else if (effectiveSplitType === 'EXACT') {
      let sum = 0;
      for (const s of splits) sum += Math.round(Number(s.owedCents || 0));
      if (sum !== totalCents) {
        return res.status(400).json({ error: `Sum of exact shares (${sum}) must match total (${totalCents})` });
      }
      resolvedSplits = splits.map(s => ({
        userId: s.userId,
        owedCents: Math.round(Number(s.owedCents)),
        percentage: +( ((s.owedCents / totalCents) * 100).toFixed(2) )
      }));
    } else if (effectiveSplitType === 'PERCENT') {
      let totalPct = 0;
      for (const s of splits) totalPct += Number(s.percentage || 0);
      if (Math.abs(totalPct - 100) > 0.5) {
        return res.status(400).json({ error: `Percentages must add up to 100% (currently ${totalPct}%)` });
      }
      let allocatedCents = 0;
      resolvedSplits = splits.map(s => {
        const pct = Number(s.percentage);
        const cents = Math.round((totalCents * pct) / 100);
        allocatedCents += cents;
        return { userId: s.userId, owedCents: cents, percentage: pct };
      });
      const variance = totalCents - allocatedCents;
      if (variance !== 0 && resolvedSplits.length > 0) {
        resolvedSplits[0].owedCents += variance;
      }
    }

    const updateTransaction = db.transaction(() => {
      db.prepare(`
        UPDATE expenses
        SET title = ?, amount_cents = ?, category = ?, split_type = ?, expense_date = ?, notes = ?, paid_by = ?
        WHERE id = ?
      `).run(
        title !== undefined ? title.trim() : existing.title,
        totalCents,
        category || existing.category,
        effectiveSplitType,
        expenseDate || existing.expense_date,
        notes !== undefined ? notes.trim() : existing.notes,
        paidBy || existing.paid_by,
        expenseId
      );

      // Re-insert splits if updated
      if (resolvedSplits.length > 0) {
        db.prepare('DELETE FROM expense_splits WHERE expense_id = ?').run(expenseId);
        const insertSplitStmt = db.prepare(`
          INSERT INTO expense_splits (id, expense_id, user_id, owed_cents, percentage)
          VALUES (?, ?, ?, ?, ?)
        `);
        for (const s of resolvedSplits) {
          insertSplitStmt.run(crypto.randomUUID(), expenseId, s.userId, s.owedCents, s.percentage);
        }
      }
    });

    updateTransaction();

    const updatedExpense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expenseId);
    const updatedSplits = db.prepare('SELECT * FROM expense_splits WHERE expense_id = ?').all(expenseId);

    return res.json({
      expense: {
        ...updatedExpense,
        splits: updatedSplits
      }
    });
  } catch (error) {
    console.error('updateExpense error:', error);
    return res.status(500).json({ error: 'Failed to update expense' });
  }
}

function deleteExpense(req, res) {
  try {
    const { expenseId } = req.params;
    const db = getDb();

    const existing = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expenseId);
    if (!existing) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    db.prepare('DELETE FROM expenses WHERE id = ?').run(expenseId);
    return res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('deleteExpense error:', error);
    return res.status(500).json({ error: 'Failed to delete expense' });
  }
}

/**
 * Record a direct settlement payment between two users
 */
function recordSettlement(req, res) {
  try {
    const { groupId, payerId, receiverId, amountCents, notes = '' } = req.body;

    if (!groupId || !payerId || !receiverId || !amountCents) {
      return res.status(400).json({ error: 'Group, payer, receiver, and amount are required' });
    }

    const totalCents = Math.round(Number(amountCents));
    if (totalCents <= 0) {
      return res.status(400).json({ error: 'Settlement amount must be positive' });
    }

    const db = getDb();
    const payer = db.prepare('SELECT name FROM users WHERE id = ?').get(payerId);
    const receiver = db.prepare('SELECT name FROM users WHERE id = ?').get(receiverId);

    const expenseId = crypto.randomUUID();
    const title = `Settlement: ${payer ? payer.name : 'User'} paid ${receiver ? receiver.name : 'User'}`;
    const dateStr = new Date().toISOString().split('T')[0];

    const insertTx = db.transaction(() => {
      db.prepare(`
        INSERT INTO expenses (id, group_id, paid_by, title, amount_cents, category, split_type, expense_date, notes, is_settlement)
        VALUES (?, ?, ?, ?, ?, 'Settlement', 'EXACT', ?, ?, 1)
      `).run(expenseId, groupId, payerId, title, totalCents, dateStr, notes.trim());

      db.prepare(`
        INSERT INTO expense_splits (id, expense_id, user_id, owed_cents, percentage)
        VALUES (?, ?, ?, ?, 100)
      `).run(crypto.randomUUID(), expenseId, receiverId, totalCents);
    });

    insertTx();

    return res.status(201).json({
      message: 'Settlement recorded successfully',
      settlement: {
        id: expenseId,
        group_id: groupId,
        payerId,
        receiverId,
        amount_cents: totalCents,
        date: dateStr
      }
    });
  } catch (error) {
    console.error('recordSettlement error:', error);
    return res.status(500).json({ error: 'Failed to record settlement' });
  }
}

module.exports = {
  createExpense,
  updateExpense,
  deleteExpense,
  recordSettlement
};

