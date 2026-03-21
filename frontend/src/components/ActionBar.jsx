import { useState } from 'react';
import {
  Play, Download, ToggleLeft, ToggleRight,
  RotateCcw, Loader2, ArrowRightCircle, Check,
} from 'lucide-react';
import useReconcileStore from '../store/useReconcileStore';
import { exportReconcileToExcel } from '../utils/excelExport';

export default function ActionBar() {
  const {
    transactions, reconcileResults, summary, metadata,
    isReconciling, strictMode, carryForward,
    runReconcile, toggleStrictMode, reset,
    saveCarryForwardFromResults,
  } = useReconcileStore();

  const [saved, setSaved] = useState(false);

  if (transactions.length === 0) return null;

  const handleExport = () => {
    if (reconcileResults && summary) {
      exportReconcileToExcel({ summary, results: reconcileResults }, metadata);
    }
  };

  const handleSaveCarryForward = () => {
    saveCarryForwardFromResults();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const unmatchedCount = reconcileResults
    ? reconcileResults.filter(r => r.status !== 'matched').length
    : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={runReconcile}
          disabled={isReconciling || transactions.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg font-medium
                     hover:bg-primary-700 active:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors shadow-sm shadow-primary-600/20"
        >
          {isReconciling
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Play className="w-4 h-4" />
          }
          {isReconciling ? 'Processing...' : carryForward ? 'Reconcile (+ ยกยอด)' : 'Reconcile'}
        </button>

        <button
          onClick={toggleStrictMode}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm
                     text-gray-600 hover:bg-gray-50 transition-colors"
          title={strictMode ? 'Strict match: exact names only' : 'Fuzzy match: similar names grouped'}
        >
          {strictMode
            ? <ToggleRight className="w-5 h-5 text-primary-500" />
            : <ToggleLeft className="w-5 h-5 text-gray-400" />
          }
          {strictMode ? 'Strict Match' : 'Fuzzy Match'}
        </button>

        {reconcileResults && (
          <>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm
                         text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export Excel
            </button>

            {unmatchedCount > 0 && (
              <button
                onClick={handleSaveCarryForward}
                disabled={saved}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${saved
                    ? 'bg-success-50 text-success-700 border border-success-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                  }`}
              >
                {saved
                  ? <><Check className="w-4 h-4" /> บันทึกแล้ว</>
                  : <><ArrowRightCircle className="w-4 h-4" /> ยกยอดไปปีถัดไป ({unmatchedCount})</>
                }
              </button>
            )}
          </>
        )}

        <div className="flex-1" />

        <button
          onClick={reset}
          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-400 hover:text-danger-500
                     hover:bg-danger-50 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
      </div>
    </div>
  );
}
