import { create } from 'zustand';
import { parseExcelFile, parseCarryForwardFile } from '../utils/parseExcel';
import { reconcileTransactions, mergeCustomerGroups } from '../utils/reconcileEngine';

const CARRY_FORWARD_KEY = 'reconcile_carry_forward';

function loadCarryForward() {
  try {
    const raw = localStorage.getItem(CARRY_FORWARD_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveCarryForward(data) {
  try {
    localStorage.setItem(CARRY_FORWARD_KEY, JSON.stringify(data));
  } catch { /* quota exceeded — ignore */ }
}

function clearCarryForward() {
  localStorage.removeItem(CARRY_FORWARD_KEY);
}

const useReconcileStore = create((set, get) => ({
  file: null,
  fileName: '',
  isUploading: false,

  transactions: [],
  metadata: null,

  reconcileResults: null,
  summary: null,
  isReconciling: false,
  strictMode: false,

  // Carry-forward state
  carryForward: loadCarryForward(),

  searchQuery: '',
  statusFilter: 'all',
  expandedRows: new Set(),
  mergeSource: null,
  mergeTarget: null,

  setFile: async (file) => {
    set({ isUploading: true, file, fileName: file.name });
    try {
      const parsed = await parseExcelFile(file);
      set({
        transactions: parsed.transactions,
        metadata: parsed.metadata,
        isUploading: false,
        reconcileResults: null,
        summary: null,
      });
      return parsed;
    } catch (err) {
      set({ isUploading: false });
      throw err;
    }
  },

  runReconcile: () => {
    const { transactions, strictMode, carryForward } = get();
    if (transactions.length === 0) return;

    set({ isReconciling: true });

    setTimeout(() => {
      let allTransactions = [...transactions];

      if (carryForward) {
        const cfTransactions = carryForward.entries.map((entry, i) => ({
          id: `cf-${i}`,
          date: entry.date || '',
          bookType: 'ยกมา',
          voucher: entry.voucher || '',
          description: entry.customerNameRaw,
          debit: entry.difference > 0 ? entry.difference : 0,
          credit: entry.difference < 0 ? Math.abs(entry.difference) : 0,
          rawRow: 0,
          isCarryForward: true,
          carryForwardSource: carryForward.sourceFile,
        }));
        allTransactions = [...cfTransactions, ...allTransactions];
      }

      const result = reconcileTransactions(allTransactions, { strictMode });
      set({
        reconcileResults: result.results,
        summary: result.summary,
        isReconciling: false,
      });
    }, 100);
  },

  saveCarryForwardFromResults: () => {
    const { reconcileResults, fileName, metadata } = get();
    if (!reconcileResults) return;

    const unmatched = reconcileResults.filter(r => r.status !== 'matched');

    const cfData = {
      sourceFile: fileName,
      savedAt: new Date().toISOString(),
      metadata: metadata,
      totalEntries: unmatched.length,
      totalDifference: Math.round(
        unmatched.reduce((s, r) => s + r.difference, 0) * 100
      ) / 100,
      entries: unmatched.map(r => ({
        customerNameRaw: r.customerNameRaw,
        customerNameNormalized: r.customerNameNormalized,
        totalDebit: r.totalDebit,
        totalCredit: r.totalCredit,
        difference: r.difference,
        status: r.status,
        date: r.transactions[0]?.date || '',
        voucher: r.transactions[0]?.voucher || '',
      })),
    };

    saveCarryForward(cfData);
    set({ carryForward: cfData });
    return cfData;
  },

  setCarryForwardFile: async (file) => {
    const cfData = await parseCarryForwardFile(file);
    saveCarryForward(cfData);
    set({ carryForward: cfData });
    return cfData;
  },

  clearCarryForward: () => {
    clearCarryForward();
    set({ carryForward: null });
  },

  toggleStrictMode: () => {
    set({ strictMode: !get().strictMode });
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setStatusFilter: (filter) => set({ statusFilter: filter }),

  toggleRowExpanded: (normalized) => {
    const { expandedRows } = get();
    const newSet = new Set(expandedRows);
    if (newSet.has(normalized)) {
      newSet.delete(normalized);
    } else {
      newSet.add(normalized);
    }
    set({ expandedRows: newSet });
  },

  setMergeSource: (normalized) => set({ mergeSource: normalized }),
  setMergeTarget: (normalized) => set({ mergeTarget: normalized }),

  executeMerge: () => {
    const { reconcileResults, mergeSource, mergeTarget } = get();
    if (!reconcileResults || !mergeSource || !mergeTarget) return;

    const newResults = mergeCustomerGroups(reconcileResults, mergeSource, mergeTarget);

    const summary = {
      totalCustomers: newResults.length,
      totalTransactions: get().transactions.length,
      matched: newResults.filter(r => r.status === 'matched').length,
      missingCredit: newResults.filter(r => r.status === 'missing_credit').length,
      missingDebit: newResults.filter(r => r.status === 'missing_debit').length,
      totalDebit: Math.round(newResults.reduce((s, r) => s + r.totalDebit, 0) * 100) / 100,
      totalCredit: Math.round(newResults.reduce((s, r) => s + r.totalCredit, 0) * 100) / 100,
      totalDifference: Math.round(newResults.reduce((s, r) => s + r.difference, 0) * 100) / 100,
    };

    set({
      reconcileResults: newResults,
      summary,
      mergeSource: null,
      mergeTarget: null,
    });
  },

  reset: () => set({
    file: null,
    fileName: '',
    transactions: [],
    metadata: null,
    reconcileResults: null,
    summary: null,
    searchQuery: '',
    statusFilter: 'all',
    expandedRows: new Set(),
    mergeSource: null,
    mergeTarget: null,
  }),

  getFilteredResults: () => {
    const { reconcileResults, searchQuery, statusFilter } = get();
    if (!reconcileResults) return [];

    let filtered = reconcileResults;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.customerNameRaw.toLowerCase().includes(q) ||
        r.customerNameNormalized.toLowerCase().includes(q) ||
        r.aliases.some(a => a.toLowerCase().includes(q))
      );
    }

    return filtered;
  },
}));

export default useReconcileStore;
