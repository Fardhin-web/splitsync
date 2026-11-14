const crypto = require('crypto');
const { getDb } = require('../db');
const { getDebtSummary } = require('../algorithms/debtSimplifier');

function listGroups(req, res) {
  try {
    const db = getDb();
    const userId = req.user.id;

    const groups = db.prepare(`
      SELECT g.*, 
        (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id) AS member_count,
        (SELECT COALESCE(SUM(amount_cents), 0) FROM expenses e WHERE e.group_id = g.id AND e.is_settlement = 0) AS total_spend_cents
      FROM groups g
      INNER JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = ?
      ORDER BY g.created_at DESC
    `).all(userId);

    // Calculate user's individual net balance for each group
    const enrichedGroups = groups.map(group => {
      const members = db.prepare(`
        SELECT u.id, u.name, u.email, u.avatar_color
        FROM users u
        INNER JOIN group_members gm ON u.id = gm.user_id
        WHERE gm.group_id = ?
      `).all(group.id);

      const expenses = db.prepare('SELECT * FROM expenses WHERE group_id = ?').all(group.id);
      const splits = db.prepare(`
        SELECT es.* FROM expense_splits es
        INNER JOIN expenses e ON es.expense_id = e.id
        WHERE e.group_id = ?
      `).all(group.id);

      const memberIds = members.map(m => m.id);
      const userMap = {};
      members.forEach(m => { userMap[m.id] = m; });

      const debtSummary = getDebtSummary(memberIds, expenses, splits, userMap);
      const myNetBalance = debtSummary.netBalances[userId] || 0;

      return {
        ...group,
        my_net_balance_cents: myNetBalance,
        members
      };
    });

    return res.json({ groups: enrichedGroups });
  } catch (error) {
    console.error('listGroups error:', error);
    return res.status(500).json({ error: 'Failed to retrieve groups' });
  }
}

function getGroupById(req, res) {
  try {
    const db = getDb();
    const { groupId } = req.params;
    const userId = req.user.id;

    // Check membership
    const membership = db.prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, userId);
    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const members = db.prepare(`
      SELECT u.id, u.name, u.email, u.avatar_color, gm.joined_at
      FROM users u
      INNER JOIN group_members gm ON u.id = gm.user_id
      WHERE gm.group_id = ?
      ORDER BY gm.joined_at ASC
    `).all(groupId);

    const expenses = db.prepare(`
      SELECT e.*, u.name as paid_by_name, u.avatar_color as paid_by_avatar
      FROM expenses e
      INNER JOIN users u ON e.paid_by = u.id
      WHERE e.group_id = ?
      ORDER BY e.expense_date DESC, e.created_at DESC
    `).all(groupId);

    const splits = db.prepare(`
      SELECT es.*, u.name as user_name
      FROM expense_splits es
      INNER JOIN expenses e ON es.expense_id = e.id
      INNER JOIN users u ON es.user_id = u.id
      WHERE e.group_id = ?
    `).all(groupId);

    const memberIds = members.map(m => m.id);
    const userMap = {};
    members.forEach(m => { userMap[m.id] = m; });

    const debtSummary = getDebtSummary(memberIds, expenses, splits, userMap);

    // Compute monthly spend and budget progress
    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    let currentMonthSpendCents = 0;
    let totalSpendCents = 0;

    for (const exp of expenses) {
      if (!exp.is_settlement) {
        totalSpendCents += exp.amount_cents;
        if (exp.expense_date && exp.expense_date.startsWith(currentMonthPrefix)) {
          currentMonthSpendCents += exp.amount_cents;
        }
      }
    }

    // Attach splits to expenses
    const splitsMap = {};
    for (const s of splits) {
      if (!splitsMap[s.expense_id]) splitsMap[s.expense_id] = [];
      splitsMap[s.expense_id].push(s);
    }

    const enrichedExpenses = expenses.map(e => ({
      ...e,
      splits: splitsMap[e.id] || []
    }));

    return res.json({
      group: {
        ...group,
        total_spend_cents: totalSpendCents,
        current_month_spend_cents: currentMonthSpendCents,
        members
      },
      expenses: enrichedExpenses,
      debtSummary,
      currentUserId: userId
    });
  } catch (error) {
    console.error('getGroupById error:', error);
    return res.status(500).json({ error: 'Failed to retrieve group details' });
  }
}

function createGroup(req, res) {
  try {
    const { name, currency = '₹', monthly_budget = 0 } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const db = getDb();
    const groupId = crypto.randomUUID();
    const budgetCents = Math.max(0, Math.round(Number(monthly_budget) || 0));

    const insertGroup = db.transaction(() => {
      db.prepare(`
        INSERT INTO groups (id, name, currency, monthly_budget, created_by)
        VALUES (?, ?, ?, ?, ?)
      `).run(groupId, name.trim(), currency, budgetCents, req.user.id);

      db.prepare(`
        INSERT INTO group_members (group_id, user_id)
        VALUES (?, ?)
      `).run(groupId, req.user.id);
    });

    insertGroup();

    const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);
    return res.status(201).json({ group });
  } catch (error) {
    console.error('createGroup error:', error);
    return res.status(500).json({ error: 'Failed to create group' });
  }
}

function addMember(req, res) {
  try {
    const { groupId } = req.params;
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const db = getDb();
    const cleanEmail = email.toLowerCase().trim();

    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);

    // If user doesn't exist yet, create a quick mock user profile
    if (!user) {
      const newUserId = crypto.randomUUID();
      const userName = name && name.trim() ? name.trim() : cleanEmail.split('@')[0];
      const AVATAR_COLORS = ['#4F46E5', '#059669', '#D97706', '#DC2626', '#7C3AED', '#2563EB', '#DB2777', '#0D9488'];
      const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
      
      db.prepare(`
        INSERT INTO users (id, name, email, password_hash, avatar_color)
        VALUES (?, ?, ?, ?, ?)
      `).run(newUserId, userName, cleanEmail, 'temp_mock_hash', avatarColor);

      user = db.prepare('SELECT * FROM users WHERE id = ?').get(newUserId);
    }

    // Check if already member
    const existing = db.prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, user.id);
    if (existing) {
      return res.status(400).json({ error: 'User is already a member of this group' });
    }

    db.prepare('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)').run(groupId, user.id);

    return res.status(201).json({
      message: 'Member added successfully',
      member: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar_color: user.avatar_color
      }
    });
  } catch (error) {
    console.error('addMember error:', error);
    return res.status(500).json({ error: 'Failed to add member' });
  }
}

function updateGroup(req, res) {
  try {
    const { groupId } = req.params;
    const { name, currency, monthly_budget } = req.body;
    const db = getDb();

    const existing = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);
    if (!existing) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const newName = name !== undefined ? name.trim() : existing.name;
    const newCurrency = currency !== undefined ? currency : existing.currency;
    const newBudget = monthly_budget !== undefined ? Math.round(Number(monthly_budget)) : existing.monthly_budget;

    db.prepare(`
      UPDATE groups
      SET name = ?, currency = ?, monthly_budget = ?
      WHERE id = ?
    `).run(newName, newCurrency, newBudget, groupId);

    const updated = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);
    return res.json({ group: updated });
  } catch (error) {
    console.error('updateGroup error:', error);
    return res.status(500).json({ error: 'Failed to update group' });
  }
}

function deleteGroup(req, res) {
  try {
    const { groupId } = req.params;
    const db = getDb();

    const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    db.prepare('DELETE FROM groups WHERE id = ?').run(groupId);
    return res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('deleteGroup error:', error);
    return res.status(500).json({ error: 'Failed to delete group' });
  }
}

module.exports = {
  listGroups,
  getGroupById,
  createGroup,
  addMember,
  updateGroup,
  deleteGroup
};

