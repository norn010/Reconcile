import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import useReconcileStore from '../store/useReconcileStore';

export default function DataPreview() {
  const { transactions, metadata } = useReconcileStore();
  const [showPreview, setShowPreview] = useState(false);
  const [previewCount, setPreviewCount] = useState(10);

  if (transactions.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div>
          <h3 className="font-medium text-gray-900">Parsed Data Preview</h3>
          {metadata && (
            <p className="text-xs text-gray-500 mt-0.5">
              {metadata.companyName && <span>{metadata.companyName.trim().substring(0, 60)}</span>}
              {metadata.dateRange && <span> | {metadata.dateRange}</span>}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {showPreview ? 'Hide' : 'Show'} Preview
        </button>
      </div>

      {showPreview && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">#</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Book</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Voucher</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Debit</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Credit</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, previewCount).map((tx, i) => (
                <tr key={tx.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                  <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{tx.date}</td>
                  <td className="px-4 py-2 text-gray-600">{tx.bookType}</td>
                  <td className="px-4 py-2 text-gray-600 font-mono text-xs">{tx.voucher}</td>
                  <td className="px-4 py-2 text-gray-700 max-w-xs truncate">{tx.description}</td>
                  <td className="px-4 py-2 text-right font-mono text-gray-600">
                    {tx.debit > 0 ? tx.debit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-gray-600">
                    {tx.credit > 0 ? tx.credit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length > previewCount && (
            <div className="p-3 text-center border-t border-gray-100">
              <button
                onClick={() => setPreviewCount(prev => Math.min(prev + 20, transactions.length))}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Show more ({transactions.length - previewCount} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
