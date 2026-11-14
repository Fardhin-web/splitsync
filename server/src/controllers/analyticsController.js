const { getDb } = require('../db');

function getGroupAnalytics(req, res) {
  try {
    const { groupId } = req.params;
    const db = getDb();

    const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const members = db.prepare(`
      SELECT u.id, u.name, u.email, u.avatar_color
      FROM users u
      INNER JOIN group_members gm ON u.id = gm.user_id
      WHERE gm.group_id = ?
    `).all(groupId);

    const expenses = db.prepare(`
      SELECT * FROM expenses
      WHERE group_id = ? AND is_settlement = 0
    `).all(groupId);

    const splits = db.prepare(`
      SELECT es.* FROM expense_splits es
      INNER JOIN expenses e ON es.expense_id = e.id
      WHERE e.group_id = ? AND e.is_settlement = 0
    `).all(groupId);

    // 1. Category breakdown
    const categoryTotals = {};
    let totalSpendCents = 0;

    for (const exp of expenses) {
      const cat = exp.category || 'Other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + exp.amount_cents;
      totalSpendCents += exp.amount_cents;
    }

    const categoryBreakdown = Object.entries(categoryTotals).map(([category, amount_cents]) => ({
      category,
      amount_cents,
      percentage: totalSpendCents > 0 ? +(((amount_cents / totalSpendCents) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.amount_cents - a.amount_cents);

    // 2. Member contribution vs consumption
    const memberStats = {};
    for (const m of members) {
      memberStats[m.id] = {
        id: m.id,
        name: m.name,
        avatar_color: m.avatar_color,
        paid_cents: 0,
        consumed_cents: 0,
        net_cents: 0
      };
    }

    for (const exp of expenses) {
      if (memberStats[exp.paid_by]) {
        memberStats[exp.paid_by].paid_cents += exp.amount_cents;
      }
    }

    for (const s of splits) {
      if (memberStats[s.user_id]) {
        memberStats[s.user_id].consumed_cents += s.owed_cents;
      }
    }

    for (const id of Object.keys(memberStats)) {
      memberStats[id].net_cents = memberStats[id].paid_cents - memberStats[id].consumed_cents;
    }

    const memberComparison = Object.values(memberStats);

    // 3. Monthly budget tracking
    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let currentMonthSpendCents = 0;

    for (const exp of expenses) {
      if (exp.expense_date && exp.expense_date.startsWith(currentMonthPrefix)) {
        currentMonthSpendCents += exp.amount_cents;
      }
    }

    const budgetCents = group.monthly_budget || 0;
    const budgetUsagePercentage = budgetCents > 0 
      ? Math.min(100, +(((currentMonthSpendCents / budgetCents) * 100).toFixed(1)))
      : 0;

    let budgetStatus = 'emerald'; // < 75%
    if (budgetCents > 0) {
      const ratio = currentMonthSpendCents / budgetCents;
      if (ratio > 0.90) {
        budgetStatus = 'rose';
      } else if (ratio >= 0.75) {
        budgetStatus = 'amber';
      }
    }

    return res.json({
      group: {
        id: group.id,
        name: group.name,
        currency: group.currency,
        monthly_budget: budgetCents,
        current_month_spend_cents: currentMonthSpendCents,
        total_spend_cents: totalSpendCents,
        budget_usage_percentage: budgetUsagePercentage,
        budget_status: budgetStatus
      },
      categoryBreakdown,
      memberComparison,
      expenseCount: expenses.length
    });
  } catch (error) {
    console.error('getGroupAnalytics error:', error);
    return res.status(500).json({ error: 'Failed to generate analytics' });
  }
}

module.exports = {
  getGroupAnalytics
};

