import { useMemo, useState, Fragment } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import {
  ChevronDown, ChevronRight, ChevronUp,
  Search, Filter, ArrowUpDown, Merge,
  ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight as ChevronRightIcon,
} from 'lucide-react';
import useReconcileStore from '../store/useReconcileStore';
import TransactionDetail from './TransactionDetail';
import MergeModal from './MergeModal';

function StatusBadge({ status }) {
  const config = {
    matched: { label: 'Matched', className: 'bg-success-50 text-success-700 ring-success-600/20' },
    missing_credit: { label: 'Missing Credit', className: 'bg-danger-50 text-danger-700 ring-danger-600/20' },
    missing_debit: { label: 'Missing Debit', className: 'bg-warning-50 text-warning-600 ring-warning-500/20' },
  };
  const c = config[status] || config.matched;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${c.className}`}>
      {c.label}
    </span>
  );
}

export default function ReconcileTable() {
  const {
    reconcileResults, searchQuery, setSearchQuery,
    statusFilter, setStatusFilter, expandedRows,
    toggleRowExpanded, getFilteredResults, setMergeSource,
  } = useReconcileStore();

  const [sorting, setSorting] = useState([]);
  const [showMerge, setShowMerge] = useState(false);
  const [mergeSourceName, setMergeSourceName] = useState('');

  const data = useMemo(() => getFilteredResults(), [reconcileResults, searchQuery, statusFilter]);

  const columns = useMemo(() => [
    {
      id: 'expander',
      header: '',
      size: 40,
      cell: ({ row }) => (
        <button
          onClick={() => toggleRowExpanded(row.original.customerNameNormalized)}
          className="p-1 hover:bg-gray-100 rounded"
        >
          {expandedRows.has(row.original.customerNameNormalized)
            ? <ChevronDown className="w-4 h-4 text-gray-500" />
            : <ChevronRight className="w-4 h-4 text-gray-500" />
          }
        </button>
      ),
    },
    {
      accessorKey: 'customerNameRaw',
      header: 'Customer Name',
      size: 250,
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-gray-900 truncate">{row.original.customerNameRaw}</p>
          <p className="text-xs text-gray-400 truncate font-mono">{row.original.customerNameNormalized}</p>
        </div>
      ),
    },
    {
      accessorKey: 'totalDebit',
      header: 'Total Debit',
      size: 130,
      cell: ({ getValue }) => (
        <span className="font-mono text-sm">
          {getValue().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      accessorKey: 'totalCredit',
      header: 'Total Credit',
      size: 130,
      cell: ({ getValue }) => (
        <span className="font-mono text-sm">
          {getValue().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      accessorKey: 'difference',
      header: 'Difference',
      size: 130,
      cell: ({ getValue }) => {
        const val = getValue();
        return (
          <span className={`font-mono text-sm font-medium ${val === 0 ? 'text-success-600' : 'text-danger-600'}`}>
            {val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      accessorKey: 'transactionCount',
      header: 'Txns',
      size: 70,
      cell: ({ row }) => (
        <span className="text-sm text-gray-600">
          {row.original.debitCount}D / {row.original.creditCount}C
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 140,
      cell: ({ getValue }) => <StatusBadge status={getValue()} />,
    },
    {
      id: 'actions',
      header: '',
      size: 60,
      cell: ({ row }) => (
        <button
          onClick={() => {
            setMergeSource(row.original.customerNameNormalized);
            setMergeSourceName(row.original.customerNameRaw);
            setShowMerge(true);
          }}
          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
          title="Merge with another customer"
        >
          <Merge className="w-4 h-4" />
        </button>
      ),
    },
  ], [expandedRows, toggleRowExpanded, setMergeSource]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  });

  if (!reconcileResults) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customers..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          {['all', 'matched', 'missing_credit', 'missing_debit'].map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${statusFilter === f
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {f === 'all' ? 'All' : f === 'matched' ? 'Matched' : f === 'missing_credit' ? 'Missing Credit' : 'Missing Debit'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id} className="border-b border-gray-200 bg-gray-50/80">
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={header.column.getCanSort() ? 'flex items-center gap-1 cursor-pointer select-none hover:text-gray-700' : ''}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            header.column.getIsSorted() === 'asc' ? <ChevronUp className="w-3 h-3" /> :
                            header.column.getIsSorted() === 'desc' ? <ChevronDown className="w-3 h-3" /> :
                            <ArrowUpDown className="w-3 h-3 opacity-30" />
                          )}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map(row => {
                const isExpanded = expandedRows.has(row.original.customerNameNormalized);
                const rowBg = row.original.status === 'matched'
                  ? 'hover:bg-success-50/30'
                  : row.original.status === 'missing_credit'
                    ? 'bg-danger-50/20 hover:bg-danger-50/40'
                    : 'bg-warning-50/20 hover:bg-warning-50/40';

                return (
                  <Fragment key={row.id}>
                    <tr className={`border-b border-gray-100 transition-colors ${rowBg}`}>
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-4 py-3">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={columns.length} className="p-0">
                          <TransactionDetail transactions={row.original.transactions} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50/50">
          <p className="text-sm text-gray-500">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              data.length
            )}{' '}
            of {data.length} customers
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}
              className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}
              className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-sm text-gray-600">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}
              className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronRightIcon className="w-4 h-4" />
            </button>
            <button onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}
              className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {showMerge && (
        <MergeModal
          sourceNormalized={useReconcileStore.getState().mergeSource}
          sourceName={mergeSourceName}
          onClose={() => setShowMerge(false)}
        />
      )}
    </div>
  );
}

