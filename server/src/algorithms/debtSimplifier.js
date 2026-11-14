/**
 * ============================================================================
 * Algorithmic Debt Simplification Engine
 * ============================================================================
 * 
 * PROBLEM STATEMENT:
 * In group expense splitting (e.g., student flatmates, trips, projects), 
 * members pay for varied items with various splits. A naive ledger creates
 * dense, cyclic pairwise debts (e.g., Alice owes Bob, Bob owes Charlie, 
 * Charlie owes Alice). This creates unnecessary friction and high transaction 
 * counts (up to O(N^2) pairwise transfers).
 * 
 * ALGORITHM: Greedy Net-Balance Minimization
 * 
 * MATHEMATICAL FOUNDATION:
 * 1. For any closed economic system of expenses, the sum of all members' 
 *    net balances must equal zero:
 *       ∑ (Total Paid_i - Total Share_i) = 0
 * 2. Partition the set of members into two disjoint subsets:
 *       - Debtors  (D): { u ∈ Members | Net(u) < 0 }
 *       - Creditors (C): { u ∈ Members | Net(u) > 0 }
 * 3. In each greedy iteration, take the member with the largest debt (max |Net_D|)
 *    and the member with the largest credit (max Net_C). Settle the transfer:
 *       transfer = min(|Net_D|, Net_C)
 *    This transfer guarantees that at least one member's balance becomes 
 *    strictly 0 in every single step!
 * 4. Maximum number of transactions is strictly bounded by (N - 1), 
 *    where N is the number of active participants with non-zero balances.
 * 
 * TIME COMPLEXITY:
 * - Net balance aggregation: O(M), where M = total expense split records.
 * - Initial sorting / priority heap creation: O(N log N), where N = number of members.
 * - Greedy matching loop: At most N - 1 iterations. With a priority queue 
 *   or binary insertion, each step takes O(log N).
 * - Overall Time Complexity: O(M + N log N) — optimal for real-time online query execution.
 * 
 * SPACE COMPLEXITY:
 * - O(N) auxiliary space to store net balance maps and priority lists.
 * ============================================================================
 */

/**
 * Calculates net balance for every member in integer cents.
 * Positive (+) balance = Creditor (is owed money)
 * Negative (-) balance = Debtor (owes money)
 * 
 * @param {Array<string>} memberIds - List of user IDs in the group
 * @param {Array<Object>} expenses - List of group expenses
 * @param {Array<Object>} expenseSplits - List of individual expense split items
 * @returns {Record<string, number>} Map of userId -> netBalanceInCents
 */
function calculateNetBalances(memberIds, expenses, expenseSplits) {
  const netBalances = {};
  
  // Initialize all members with 0 cents
  for (const id of memberIds) {
    netBalances[id] = 0;
  }

  // Map splits by expenseId for fast lookup
  const splitsByExpense = {};
  for (const split of expenseSplits) {
    if (!splitsByExpense[split.expense_id]) {
      splitsByExpense[split.expense_id] = [];
    }
    splitsByExpense[split.expense_id].push(split);
  }

  for (const exp of expenses) {
    const paidBy = exp.paid_by;
    const amount = Number(exp.amount_cents);

    if (netBalances[paidBy] === undefined) {
      netBalances[paidBy] = 0;
    }

    if (exp.is_settlement) {
      // Direct settlement payment: paidBy gave money to the split participant
      const splits = splitsByExpense[exp.id] || [];
      for (const s of splits) {
        const receiver = s.user_id;
        const settledAmount = Number(s.owed_cents);
        
        // Payer's balance improves (+), Receiver's balance decreases (-)
        netBalances[paidBy] += settledAmount;
        if (netBalances[receiver] === undefined) netBalances[receiver] = 0;
        netBalances[receiver] -= settledAmount;
      }
    } else {
      // Standard group expense:
      // The person who paid has a positive credit for the full amount
      netBalances[paidBy] += amount;

      // Each participant owes their designated share
      const splits = splitsByExpense[exp.id] || [];
      for (const s of splits) {
        const participantId = s.user_id;
        const owedShare = Number(s.owed_cents);
        
        if (netBalances[participantId] === undefined) {
          netBalances[participantId] = 0;
        }
        netBalances[participantId] -= owedShare;
      }
    }
  }

  return netBalances;
}

/**
 * Greedy Net-Balance Simplification Algorithm
 * Reduces N*(N-1) potential pairwise transactions down to at most N - 1 clean transfers.
 * 
 * @param {Record<string, number>} netBalances - Map of userId -> netBalance in cents
 * @param {Record<string, Object>} userMap - Map of userId -> user entity (name, email, avatar_color)
 * @returns {Array<Object>} List of simplified debt transfer instructions
 */
function simplifyDebts(netBalances, userMap = {}) {
  // Debtors owe money (balance < 0)
  // Creditors are owed money (balance > 0)
  const debtors = [];
  const creditors = [];

  for (const [userId, balance] of Object.entries(netBalances)) {
    // Avoid tiny fractional floating residues if any
    const rounded = Math.round(balance);
    if (rounded < -0.01) {
      debtors.push({ userId, amount: Math.abs(rounded) });
    } else if (rounded > 0.01) {
      creditors.push({ userId, amount: rounded });
    }
  }

  // Sort descending by amount to maximize debt reduction per transfer step
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const simplifiedTransfers = [];
  let dIndex = 0;
  let cIndex = 0;

  while (dIndex < debtors.length && cIndex < creditors.length) {
    const debtor = debtors[dIndex];
    const creditor = creditors[cIndex];

    // Settle the minimum of the two balances
    const settleAmount = Math.min(debtor.amount, creditor.amount);

    if (settleAmount > 0) {
      simplifiedTransfers.push({
        from: debtor.userId,
        fromUser: userMap[debtor.userId] || { id: debtor.userId, name: 'User' },
        to: creditor.userId,
        toUser: userMap[creditor.userId] || { id: creditor.userId, name: 'User' },
        amount_cents: settleAmount
      });
    }

    debtor.amount -= settleAmount;
    creditor.amount -= settleAmount;

    // Advance indices if balance is completely resolved
    if (debtor.amount === 0) {
      dIndex++;
    }
    if (creditor.amount === 0) {
      cIndex++;
    }
  }

  return simplifiedTransfers;
}

/**
 * Calculates Raw Pairwise Debts directly from individual expense splits
 * without multi-hop graph simplification.
 * For each pair (A, B), calculates the net direct directional debt.
 * 
 * @param {Array<string>} memberIds - List of user IDs
 * @param {Array<Object>} expenses - List of expenses
 * @param {Array<Object>} expenseSplits - List of splits
 * @param {Record<string, Object>} userMap - User metadata map
 * @returns {Array<Object>} List of unsimplified pairwise debts
 */
function calculateRawPairwiseDebts(memberIds, expenses, expenseSplits, userMap = {}) {
  // Directed edge debt graph: debtMatrix[debtorId][creditorId] = cents owed
  const matrix = {};
  for (const u1 of memberIds) {
    matrix[u1] = {};
    for (const u2 of memberIds) {
      matrix[u1][u2] = 0;
    }
  }

  const splitsByExpense = {};
  for (const split of expenseSplits) {
    if (!splitsByExpense[split.expense_id]) {
      splitsByExpense[split.expense_id] = [];
    }
    splitsByExpense[split.expense_id].push(split);
  }

  for (const exp of expenses) {
    const payer = exp.paid_by;
    const splits = splitsByExpense[exp.id] || [];

    if (exp.is_settlement) {
      // Direct settlement: payer gave money to receiver
      for (const s of splits) {
        const receiver = s.user_id;
        const amount = Number(s.owed_cents);
        if (matrix[receiver] && matrix[receiver][payer] !== undefined) {
          // Reduces receiver's debt to payer or increases payer's credit
          matrix[payer][receiver] -= amount;
        }
      }
    } else {
      for (const s of splits) {
        const participant = s.user_id;
        const share = Number(s.owed_cents);
        if (participant !== payer && matrix[participant] && matrix[participant][payer] !== undefined) {
          matrix[participant][payer] += share;
        }
      }
    }
  }

  // Cancel direct bidirectional debts between pairs: if A owes B $10 and B owes A $6, A owes B $4
  const rawTransfers = [];
  const processedPairs = new Set();

  for (let i = 0; i < memberIds.length; i++) {
    for (let j = i + 1; j < memberIds.length; j++) {
      const u1 = memberIds[i];
      const u2 = memberIds[j];
      const pairKey = [u1, u2].sort().join('::');

      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);

      const u1OwesU2 = (matrix[u1] && matrix[u1][u2]) || 0;
      const u2OwesU1 = (matrix[u2] && matrix[u2][u1]) || 0;

      const netDirect = u1OwesU2 - u2OwesU1;

      if (netDirect > 0) {
        rawTransfers.push({
          from: u1,
          fromUser: userMap[u1] || { id: u1, name: 'User' },
          to: u2,
          toUser: userMap[u2] || { id: u2, name: 'User' },
          amount_cents: Math.round(netDirect)
        });
      } else if (netDirect < 0) {
        rawTransfers.push({
          from: u2,
          fromUser: userMap[u2] || { id: u2, name: 'User' },
          to: u1,
          toUser: userMap[u1] || { id: u1, name: 'User' },
          amount_cents: Math.round(Math.abs(netDirect))
        });
      }
    }
  }

  return rawTransfers;
}

/**
 * High-level Debt & Settlement Summary
 * Returns both simplified and raw debts, along with reduction metrics.
 */
function getDebtSummary(memberIds, expenses, expenseSplits, userMap = {}) {
  const netBalances = calculateNetBalances(memberIds, expenses, expenseSplits);
  const simplifiedDebts = simplifyDebts(netBalances, userMap);
  const rawDebts = calculateRawPairwiseDebts(memberIds, expenses, expenseSplits, userMap);

  const rawCount = rawDebts.length;
  const simplifiedCount = simplifiedDebts.length;
  const reductionPercentage = rawCount > 0 
    ? Math.max(0, Math.round(((rawCount - simplifiedCount) / rawCount) * 100))
    : 0;

  return {
    netBalances,
    simplifiedDebts,
    rawDebts,
    metrics: {
      rawTransactionCount: rawCount,
      simplifiedTransactionCount: simplifiedCount,
      transactionsSaved: Math.max(0, rawCount - simplifiedCount),
      reductionPercentage
    }
  };
}

module.exports = {
  calculateNetBalances,
  simplifyDebts,
  calculateRawPairwiseDebts,
  getDebtSummary
};

