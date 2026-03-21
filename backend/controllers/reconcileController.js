const { parseExcelFile } = require('../services/excelParser');
const { reconcile, mergeCustomers } = require('../services/reconcileService');
const { exportToExcel } = require('../services/exportService');

let currentData = {
  transactions: [],
  reconcileResults: null,
  metadata: null,
  carryForward: null,
};

const upload = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const parsed = parseExcelFile(req.file.path);
    currentData.transactions = parsed.transactions;
    currentData.metadata = parsed.metadata;
    currentData.reconcileResults = null;

    res.json({
      success: true,
      message: `Parsed ${parsed.transactions.length} transactions from "${parsed.sheetName}"`,
      data: {
        transactions: parsed.transactions,
        metadata: parsed.metadata,
        totalRows: parsed.totalRows,
        transactionCount: parsed.transactions.length,
      },
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to parse Excel file', details: err.message });
  }
};

const getReconcile = (req, res) => {
  try {
    if (currentData.transactions.length === 0) {
      return res.status(400).json({ error: 'No transactions loaded. Please upload a file first.' });
    }

    const strictMode = req.query.strict === 'true';

    let allTransactions = [...currentData.transactions];
    if (currentData.carryForward && currentData.carryForward.entries) {
      const cfTxs = currentData.carryForward.entries.map((e, i) => ({
        id: `cf-${i}`,
        date: e.date || '',
        bookType: 'ยกมา',
        voucher: e.voucher || '',
        description: e.customerNameRaw,
        debit: e.difference > 0 ? e.difference : 0,
        credit: e.difference < 0 ? Math.abs(e.difference) : 0,
        rawRow: 0,
        isCarryForward: true,
      }));
      allTransactions = [...cfTxs, ...allTransactions];
    }

    const result = reconcile(allTransactions, { strictMode });
    currentData.reconcileResults = result;

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error('Reconcile error:', err);
    res.status(500).json({ error: 'Reconciliation failed', details: err.message });
  }
};

const merge = (req, res) => {
  try {
    const { sourceNormalized, targetNormalized } = req.body;

    if (!currentData.reconcileResults) {
      return res.status(400).json({ error: 'No reconciliation data. Run reconcile first.' });
    }

    const updatedResults = mergeCustomers(
      currentData.reconcileResults.results,
      sourceNormalized,
      targetNormalized
    );

    currentData.reconcileResults.results = updatedResults;

    const summary = {
      totalCustomers: updatedResults.length,
      totalTransactions: currentData.transactions.length,
      matched: updatedResults.filter(r => r.status === 'matched').length,
      missingCredit: updatedResults.filter(r => r.status === 'missing_credit').length,
      missingDebit: updatedResults.filter(r => r.status === 'missing_debit').length,
      totalDebit: Math.round(updatedResults.reduce((s, r) => s + r.totalDebit, 0) * 100) / 100,
      totalCredit: Math.round(updatedResults.reduce((s, r) => s + r.totalCredit, 0) * 100) / 100,
      totalDifference: Math.round(updatedResults.reduce((s, r) => s + r.difference, 0) * 100) / 100,
    };

    currentData.reconcileResults.summary = summary;

    res.json({
      success: true,
      summary,
      results: updatedResults,
    });
  } catch (err) {
    console.error('Merge error:', err);
    res.status(500).json({ error: 'Merge failed', details: err.message });
  }
};

const exportExcel = (req, res) => {
  try {
    if (!currentData.reconcileResults) {
      return res.status(400).json({ error: 'No reconciliation data. Run reconcile first.' });
    }

    const buffer = exportToExcel(currentData.reconcileResults, currentData.metadata);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=reconciliation_report.xlsx');
    res.send(buffer);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Export failed', details: err.message });
  }
};

const getTransactions = (req, res) => {
  res.json({
    success: true,
    transactions: currentData.transactions,
    metadata: currentData.metadata,
  });
};

const setCarryForward = (req, res) => {
  try {
    currentData.carryForward = req.body;
    res.json({ success: true, message: 'Carry forward data saved' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save carry forward', details: err.message });
  }
};

const getCarryForward = (req, res) => {
  res.json({ success: true, carryForward: currentData.carryForward });
};

const clearCarryForwardData = (req, res) => {
  currentData.carryForward = null;
  res.json({ success: true, message: 'Carry forward cleared' });
};

module.exports = {
  upload, getReconcile, merge, exportExcel, getTransactions,
  setCarryForward, getCarryForward, clearCarryForwardData,
};
