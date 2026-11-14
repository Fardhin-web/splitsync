const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getDb } = require('./db');

function runSeed() {
  const db = getDb();

  // Check if users table already has data
  const existingCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (existingCount && existingCount.count > 0) {
    console.log('[Seed] Database already seeded. Skipping initial seeding.');
    return;
  }

  console.log('[Seed] Seeding realistic student flatmate & trip data...');

  const passwordHash = bcrypt.hashSync('password123', 10);

  // 1. Create 4 Roommate Users
  const users = [
    {
      id: crypto.randomUUID(),
      name: 'Alex Rivera',
      email: 'alex@studentflat.com',
      avatar_color: '#4F46E5' // Indigo
    },
    {
      id: crypto.randomUUID(),
      name: 'Priya Sharma',
      email: 'priya@studentflat.com',
      avatar_color: '#059669' // Emerald
    },
    {
      id: crypto.randomUUID(),
      name: 'Maya Patel',
      email: 'maya@studentflat.com',
      avatar_color: '#DB2777' // Pink
    },
    {
      id: crypto.randomUUID(),
      name: 'Jordan Lee',
      email: 'jordan@studentflat.com',
      avatar_color: '#D97706' // Amber
    }
  ];

  const insertUserStmt = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, avatar_color)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const u of users) {
    insertUserStmt.run(u.id, u.name, u.email, passwordHash, u.avatar_color);
  }

  const [alex, priya, maya, jordan] = users;

  // 2. Create Group 1: "Flat 302 Expenses"
  const group1Id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO groups (id, name, currency, monthly_budget, created_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(group1Id, 'Flat 302 Expenses', '₹', 4500000, alex.id); // ₹45,000.00 budget

  // 3. Create Group 2: "Goa Beach Getaway"
  const group2Id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO groups (id, name, currency, monthly_budget, created_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(group2Id, 'Goa Beach Getaway', '₹', 4000000, alex.id); // ₹40,000.00 budget

  // Add members to both groups
  const insertMemberStmt = db.prepare(`
    INSERT INTO group_members (group_id, user_id)
    VALUES (?, ?)
  `);

  for (const u of users) {
    insertMemberStmt.run(group1Id, u.id);
    insertMemberStmt.run(group2Id, u.id);
  }

  // 4. Create 12 Varied Expenses with Splits
  const insertExpenseStmt = db.prepare(`
    INSERT INTO expenses (id, group_id, paid_by, title, amount_cents, category, split_type, expense_date, notes, is_settlement)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `);

  const insertSplitStmt = db.prepare(`
    INSERT INTO expense_splits (id, expense_id, user_id, owed_cents, percentage)
    VALUES (?, ?, ?, ?, ?)
  `);

  function addExpenseWithSplits({
    groupId,
    paidBy,
    title,
    amountCents,
    category,
    splitType,
    date,
    notes,
    splits
  }) {
    const expenseId = crypto.randomUUID();
    insertExpenseStmt.run(expenseId, groupId, paidBy, title, amountCents, category, splitType, date, notes);

    for (const s of splits) {
      insertSplitStmt.run(crypto.randomUUID(), expenseId, s.userId, s.owedCents, s.percentage);
    }
  }

  // Helper for equal split across specific participants
  function makeEqualSplits(totalCents, participantIds) {
    const count = participantIds.length;
    const base = Math.floor(totalCents / count);
    const rem = totalCents % count;
    return participantIds.map((userId, idx) => ({
      userId,
      owedCents: base + (idx < rem ? 1 : 0),
      percentage: +( (100 / count).toFixed(2) )
    }));
  }

  const allFour = [alex.id, priya.id, maya.id, jordan.id];

  // Group 1 Expenses (8 expenses)
  // 1. Rent
  addExpenseWithSplits({
    groupId: group1Id,
    paidBy: alex.id,
    title: 'Monthly Apartment Rent & Maintenance',
    amountCents: 2400000, // ₹24,000
    category: 'Rent & Utilities',
    splitType: 'EQUAL',
    date: '2026-11-01',
    notes: 'Paid via bank transfer for November flat lease',
    splits: makeEqualSplits(2400000, allFour)
  });

  // 2. WiFi
  addExpenseWithSplits({
    groupId: group1Id,
    paidBy: jordan.id,
    title: 'High-speed Fiber Internet (Airtel)',
    amountCents: 149900, // ₹1,499
    category: 'Rent & Utilities',
    splitType: 'EQUAL',
    date: '2026-11-02',
    notes: '300 Mbps unlimited plan renewal',
    splits: makeEqualSplits(149900, allFour)
  });

  // 3. Supermarket Grocery
  addExpenseWithSplits({
    groupId: group1Id,
    paidBy: priya.id,
    title: 'Mega Supermarket Grocery Haul',
    amountCents: 564000, // ₹5,640
    category: 'Groceries',
    splitType: 'EQUAL',
    date: '2026-11-04',
    notes: 'Rice, oil, eggs, milk, pantry spices, detergent',
    splits: makeEqualSplits(564000, allFour)
  });

  // 4. Cleaning Supplies
  addExpenseWithSplits({
    groupId: group1Id,
    paidBy: maya.id,
    title: 'Flat Cleaning & Hygiene Supplies',
    amountCents: 125000, // ₹1,250
    category: 'Supplies',
    splitType: 'EQUAL',
    date: '2026-11-05',
    notes: 'Mops, floor cleaners, kitchen paper towels',
    splits: makeEqualSplits(125000, allFour)
  });

  // 5. Late Night Pizza (Only Alex, Priya, Jordan)
  addExpenseWithSplits({
    groupId: group1Id,
    paidBy: alex.id,
    title: 'Late Night Study Pizza & Garlic Bread',
    amountCents: 185000, // ₹1,850
    category: 'Food & Dining',
    splitType: 'EQUAL',
    date: '2026-11-07',
    notes: 'Maya was sleeping so 3-way split',
    splits: makeEqualSplits(185000, [alex.id, priya.id, jordan.id])
  });

  // 6. Electricity
  addExpenseWithSplits({
    groupId: group1Id,
    paidBy: jordan.id,
    title: 'Monthly State Electricity Board Bill',
    amountCents: 312000, // ₹3,120
    category: 'Rent & Utilities',
    splitType: 'EQUAL',
    date: '2026-11-08',
    notes: 'Power bill including AC units usage',
    splits: makeEqualSplits(312000, allFour)
  });

  // 7. Streaming Subscriptions
  addExpenseWithSplits({
    groupId: group1Id,
    paidBy: maya.id,
    title: 'Living Room TV Streaming Bundle',
    amountCents: 79900, // ₹799
    category: 'Entertainment',
    splitType: 'EQUAL',
    date: '2026-11-09',
    notes: 'Netflix 4K + Spotify Family for the apartment',
    splits: makeEqualSplits(79900, allFour)
  });

  // 8. Farmers Market
  addExpenseWithSplits({
    groupId: group1Id,
    paidBy: priya.id,
    title: 'Weekend Organic Farmers Market Veggies',
    amountCents: 210000, // ₹2,100
    category: 'Groceries',
    splitType: 'EQUAL',
    date: '2026-11-10',
    notes: 'Fresh veggies, fruits, cottage cheese',
    splits: makeEqualSplits(210000, allFour)
  });

  // Group 2 Expenses (4 expenses for Goa Trip)
  // 9. Beach Villa Airbnb
  addExpenseWithSplits({
    groupId: group2Id,
    paidBy: alex.id,
    title: 'Candolim Heritage Villa Booking (3 Nights)',
    amountCents: 1800000, // ₹18,000
    category: 'Travel',
    splitType: 'EQUAL',
    date: '2026-11-03',
    notes: 'Full private villa with pool',
    splits: makeEqualSplits(1800000, allFour)
  });

  // 10. Car Rental & Highway Tolls
  addExpenseWithSplits({
    groupId: group2Id,
    paidBy: jordan.id,
    title: 'Rental SUV & Highway Toll Passes',
    amountCents: 420000, // ₹4,200
    category: 'Travel',
    splitType: 'EQUAL',
    date: '2026-11-04',
    notes: 'Fuel tank full refill + fastag tolls',
    splits: makeEqualSplits(420000, allFour)
  });

  // 11. Beach Shack Seafood (Percentage Split: Alex 30%, Priya 30%, Maya 20%, Jordan 20%)
  addExpenseWithSplits({
    groupId: group2Id,
    paidBy: priya.id,
    title: 'Curlies Beach Shack Sunset Dinner',
    amountCents: 540000, // ₹5,400
    category: 'Food & Dining',
    splitType: 'PERCENT',
    date: '2026-11-05',
    notes: 'Alex & Priya ordered specialty platters',
    splits: [
      { userId: alex.id, owedCents: 162000, percentage: 30 },
      { userId: priya.id, owedCents: 162000, percentage: 30 },
      { userId: maya.id, owedCents: 108000, percentage: 20 },
      { userId: jordan.id, owedCents: 108000, percentage: 20 }
    ]
  });

  // 12. Water Sports & Scuba (Exact Split: Alex ₹2500, Jordan ₹3000, Maya ₹2500)
  addExpenseWithSplits({
    groupId: group2Id,
    paidBy: maya.id,
    title: 'Grand Island Scuba & Parasailing Combo',
    amountCents: 800000, // ₹8,000
    category: 'Entertainment',
    splitType: 'EXACT',
    date: '2026-11-06',
    notes: 'Jordan took video package',
    splits: [
      { userId: alex.id, owedCents: 250000, percentage: 31.25 },
      { userId: jordan.id, owedCents: 300000, percentage: 37.5 },
      { userId: maya.id, owedCents: 250000, percentage: 31.25 }
    ]
  });

  console.log('[Seed] Database successfully seeded with 4 users, 2 groups, and 12 realistic expenses!');
}

if (require.main === module) {
  runSeed();
}

module.exports = {
  runSeed
};

