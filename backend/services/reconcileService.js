const { groupByCustomer, normalizeName, extractCustomerName } = require('./nameExtractor');

function reconcile(transactions, options = {}) {
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

    const debitTxs = group.transactions.filter(tx => tx.debit > 0);
    const creditTxs = group.transactions.filter(tx => tx.credit > 0);

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
      debitCount: debitTxs.length,
      creditCount: creditTxs.length,
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

function mergeCustomers(results, sourceNormalized, targetNormalized) {
  const sourceIdx = results.findIndex(r => r.customerNameNormalized === sourceNormalized);
  const targetIdx = results.findIndex(r => r.customerNameNormalized === targetNormalized);

  if (sourceIdx === -1 || targetIdx === -1) {
    throw new Error('Customer not found');
  }

  const source = results[sourceIdx];
  const target = results[targetIdx];

  target.transactions.push(...source.transactions);
  target.aliases.push(...source.aliases);
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

  results.splice(sourceIdx, 1);

  return results;
}

module.exports = { reconcile, mergeCustomers };
