import { useState, useMemo } from 'react';
import { X, Merge, Search, AlertCircle } from 'lucide-react';
import useReconcileStore from '../store/useReconcileStore';

export default function MergeModal({ sourceNormalized, sourceName, onClose }) {
  const { reconcileResults, setMergeTarget, executeMerge } = useReconcileStore();
  const [search, setSearch] = useState('');
  const [confirmTarget, setConfirmTarget] = useState(null);

  const candidates = useMemo(() => {
    if (!reconcileResults) return [];
    let items = reconcileResults.filter(r => r.customerNameNormalized !== sourceNormalized);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(r =>
        r.customerNameRaw.toLowerCase().includes(q) ||
        r.customerNameNormalized.toLowerCase().includes(q)
      );
    }
    return items.slice(0, 20);
  }, [reconcileResults, sourceNormalized, search]);

  const handleMerge = (target) => {
    setConfirmTarget(target);
  };

  const confirmMerge = () => {
    if (!confirmTarget) return;

    setMergeTarget(confirmTarget.customerNameNormalized);
    setTimeout(() => {
      executeMerge();
      onClose();
    }, 0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col animate-fade-in relative overflow-hidden">
        {!confirmTarget ? (
          <>
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <div>
            <h3 className="text-lg font-semibold text-gray-900">Merge Customers</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Merge <span className="font-medium text-primary-600">{sourceName}</span> into:
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search target customer..."
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {candidates.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No matching customers found</p>
          ) : (
            candidates.map(c => (
              <button
                key={c.customerNameNormalized}
                onClick={() => handleMerge(c)}
                className="w-full flex items-center justify-between p-3 hover:bg-primary-50 rounded-lg transition-colors text-left group"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate">{c.customerNameRaw}</p>
                  <p className="text-xs text-gray-400 font-mono truncate">{c.customerNameNormalized}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {c.transactionCount} txns | DR: {c.totalDebit.toLocaleString()} | CR: {c.totalCredit.toLocaleString()}
                  </p>
                </div>
                <Merge className="w-4 h-4 text-gray-300 group-hover:text-primary-500 shrink-0 ml-3" />
              </button>
            ))
          )}
        </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center animate-fade-in">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-6">ยืนยันการรวมข้อมูล</h3>
            
            <div className="w-full bg-gray-50 rounded-xl p-5 mb-8 border border-gray-100">
               <p className="text-sm font-medium text-gray-700 mb-3">{sourceName}</p>
               <div className="flex items-center justify-center gap-2 mb-3 text-gray-400 text-sm font-medium">
                 <span className="h-px w-8 bg-gray-300"></span>
                 <span>mergeไปที่---&gt;</span>
                 <span className="h-px w-8 bg-gray-300"></span>
               </div>
               <p className="text-base font-semibold text-primary-600">{confirmTarget.customerNameRaw}</p>
            </div>
            
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setConfirmTarget(null)}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmMerge}
                className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors shadow-sm"
              >
                ยืนยันการรวม
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
