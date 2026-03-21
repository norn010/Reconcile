export default function TransactionDetail({ transactions }) {
  return (
    <div className="bg-gray-50 border-t border-b border-gray-200 animate-slide-down">
      <div className="px-6 py-3">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Transaction Details ({transactions.length} records)
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase">
                <th className="pb-2 pr-4">Date</th>
                <th className="pb-2 pr-4">Book</th>
                <th className="pb-2 pr-4">Voucher</th>
                <th className="pb-2 pr-4">Description</th>
                <th className="pb-2 pr-4 text-right">Debit</th>
                <th className="pb-2 pr-4 text-right">Credit</th>
                <th className="pb-2">Type</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, i) => (
                <tr key={i} className={`border-t border-gray-100 ${tx.isCarryForward ? 'bg-amber-50/50' : ''}`}>
                  <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">{tx.date}</td>
                  <td className="py-2 pr-4 text-gray-600">
                    {tx.isCarryForward
                      ? <span className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">ยกมา</span>
                      : tx.bookType
                    }
                  </td>
                  <td className="py-2 pr-4 text-gray-600 font-mono text-xs">{tx.voucher}</td>
                  <td className="py-2 pr-4 text-gray-700 max-w-xs truncate">{tx.description}</td>
                  <td className="py-2 pr-4 text-right font-mono text-gray-600">
                    {tx.debit > 0 ? tx.debit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono text-gray-600">
                    {tx.credit > 0 ? tx.credit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                  </td>
                  <td className="py-2">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium
                      ${tx.type === 'debit'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-purple-50 text-purple-700'}`}>
                      {tx.type === 'debit' ? 'DR' : 'CR'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
