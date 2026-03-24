import { extractCustomerName, normalizeName, shouldSkipDescription } from './normalizeName';
import stringSimilarity from 'string-similarity';

export function reconcileTransactions(transactions, options = {}) {
  const { strictMode = false } = options;

  const customerGroups = groupByCustomer(transactions, strictMode);

  const activeGroups = [];
  const cfResolvedGroups = [];

  for (const group of customerGroups) {
    const hasMainTx = group.transactions.some(tx => !tx.isCarryForward);
    const hasCFTx = group.transactions.some(tx => tx.isCarryForward);

    if (hasCFTx && !hasMainTx) {
      cfResolvedGroups.push(group);
      continue;
    }
    activeGroups.push(group);
  }

  const results = activeGroups.map(group => {
    const totalDebit = group.transactions
      .reduce((sum, tx) => sum + (tx.debit || 0), 0);
    const totalCredit = group.transactions
      .reduce((sum, tx) => sum + (tx.credit || 0), 0);

    const difference = Math.round((totalDebit - totalCredit) * 100) / 100;
    const absDiff = Math.abs(difference);

    let status;
    if (absDiff < 0.01) {
      status = 'matched';
    } else if (difference > 0) {
      status = 'missing_credit';
    } else {
      status = 'missing_debit';
    }

    return {
      customerNameRaw: group.raw,
      customerNameNormalized: group.normalized,
      aliases: group.aliases || [group.normalized],
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      difference,
      absDifference: Math.round(absDiff * 100) / 100,
      status,
      transactionCount: group.transactions.length,
      debitCount: group.transactions.filter(tx => tx.debit > 0).length,
      creditCount: group.transactions.filter(tx => tx.credit > 0).length,
      transactions: group.transactions.map(tx => ({
        ...tx,
        type: tx.debit > 0 ? 'debit' : 'credit',
        amount: tx.debit > 0 ? tx.debit : tx.credit,
      })),
    };
  });

  results.sort((a, b) => {
    const statusOrder = { missing_credit: 0, missing_debit: 1, matched: 2 };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return b.absDifference - a.absDifference;
  });

  const cfResolvedTotal = cfResolvedGroups.reduce((s, g) => {
    return s + g.transactions.reduce((ss, tx) => ss + (tx.credit || 0) - (tx.debit || 0), 0);
  }, 0);

  const summary = {
    totalCustomers: results.length,
    totalTransactions: transactions.filter(tx => !tx.isCarryForward).length,
    matched: results.filter(r => r.status === 'matched').length,
    missingCredit: results.filter(r => r.status === 'missing_credit').length,
    missingDebit: results.filter(r => r.status === 'missing_debit').length,
    totalDebit: Math.round(results.reduce((s, r) => s + r.totalDebit, 0) * 100) / 100,
    totalCredit: Math.round(results.reduce((s, r) => s + r.totalCredit, 0) * 100) / 100,
    totalDifference: Math.round(results.reduce((s, r) => s + r.difference, 0) * 100) / 100,
    cfResolved: cfResolvedGroups.length,
    cfResolvedTotal: Math.round(cfResolvedTotal * 100) / 100,
  };

  return { summary, results };
}

function groupByCustomer(transactions, strictMode) {
  const normalizedMap = new Map();

  for (const tx of transactions) {
    if (shouldSkipDescription(tx.description)) continue;

    const raw = extractCustomerName(tx.description);
    const normalized = normalizeName(raw);

    if (!normalized) continue;

    tx.customerNameRaw = raw;
    tx.customerNameNormalized = normalized;

    if (!normalizedMap.has(normalized)) {
      normalizedMap.set(normalized, { raw, normalized, transactions: [] });
    }
    normalizedMap.get(normalized).transactions.push(tx);
  }

  if (strictMode) {
    return Array.from(normalizedMap.values());
  }

  const keys = Array.from(normalizedMap.keys());
  const merged = new Map();
  const visited = new Set();

  for (const key of keys) {
    if (visited.has(key)) continue;

    const group = normalizedMap.get(key);
    const mergedGroup = {
      raw: group.raw,
      normalized: key,
      aliases: [key],
      transactions: [...group.transactions],
    };

    for (const otherKey of keys) {
      if (otherKey === key || visited.has(otherKey)) continue;

      const similarity = stringSimilarity.compareTwoStrings(key, otherKey);

      const shorter = key.length <= otherKey.length ? key : otherKey;
      const longer = key.length <= otherKey.length ? otherKey : key;
      const isSubstring = shorter.length >= 6 && longer.startsWith(shorter);

      let shouldMerge = similarity >= 0.75 || isSubstring;

      if (!shouldMerge && similarity >= 0.65) {
        const rawA = group.raw.replace(/\s+/g, ' ').trim().toLowerCase();
        const rawB = normalizedMap.get(otherKey).raw.replace(/\s+/g, ' ').trim().toLowerCase();
        const wordsA = rawA.split(/\s+/).filter(w => w.length >= 2);
        const wordsB = rawB.split(/\s+/).filter(w => w.length >= 2);
        if (wordsA.length >= 2 && wordsB.length >= 2) {
          const shared = wordsA.filter(w => wordsB.some(w2 => w === w2 || stringSimilarity.compareTwoStrings(w, w2) >= 0.85));
          const ratio = shared.length / Math.min(wordsA.length, wordsB.length);
          if (ratio >= 0.6) shouldMerge = true;
        }
      }

      if (shouldMerge) {
        const otherGroup = normalizedMap.get(otherKey);
        mergedGroup.transactions.push(...otherGroup.transactions);
        mergedGroup.aliases.push(otherKey);
        visited.add(otherKey);
      }
    }

    visited.add(key);
    merged.set(key, mergedGroup);
  }

  return Array.from(merged.values());
}

export function mergeCustomerGroups(results, sourceNorm, targetNorm) {
  const sourceIdx = results.findIndex(r => r.customerNameNormalized === sourceNorm);
  const targetIdx = results.findIndex(r => r.customerNameNormalized === targetNorm);

  if (sourceIdx === -1 || targetIdx === -1) return results;

  const newResults = [...results];
  const source = { ...newResults[sourceIdx] };
  const target = { ...newResults[targetIdx] };

  target.transactions = [...target.transactions, ...source.transactions];
  target.aliases = [...target.aliases, ...source.aliases];
  target.totalDebit = Math.round((target.totalDebit + source.totalDebit) * 100) / 100;
  target.totalCredit = Math.round((target.totalCredit + source.totalCredit) * 100) / 100;
  target.difference = Math.round((target.totalDebit - target.totalCredit) * 100) / 100;
  target.absDifference = Math.round(Math.abs(target.difference) * 100) / 100;
  target.transactionCount = target.transactions.length;
  target.debitCount = target.transactions.filter(tx => tx.debit > 0).length;
  target.creditCount = target.transactions.filter(tx => tx.credit > 0).length;

  if (target.absDifference < 0.01) {
    target.status = 'matched';
  } else if (target.difference > 0) {
    target.status = 'missing_credit';
  } else {
    target.status = 'missing_debit';
  }

  newResults[targetIdx] = target;
  newResults.splice(sourceIdx, 1);

  return newResults;
}
