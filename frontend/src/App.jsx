import { ArrowDownUp } from 'lucide-react';
import FileUpload from './components/FileUpload';
import DataPreview from './components/DataPreview';
import ActionBar from './components/ActionBar';
import Dashboard from './components/Dashboard';
import ReconcileTable from './components/ReconcileTable';
import CarryForward from './components/CarryForward';
import useReconcileStore from './store/useReconcileStore';

export default function App() {
  const { transactions, reconcileResults } = useReconcileStore();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
                <ArrowDownUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Financial Reconciliation</h1>
                <p className="text-xs text-gray-400 -mt-0.5">Debit & Credit Matching System</p>
              </div>
            </div>
            {transactions.length > 0 && (
              <div className="hidden sm:flex items-center gap-4 text-sm text-gray-500">
                <span>{transactions.length} transactions</span>
                {reconcileResults && (
                  <span className="text-success-600 font-medium">
                    {reconcileResults.filter(r => r.status === 'matched').length} matched
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <CarryForward />

        {transactions.length === 0 && (
          <div className="max-w-2xl mx-auto pt-12">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Upload your Excel file</h2>
              <p className="text-gray-500 mt-2">
                Upload a general ledger Excel file to automatically reconcile
                debit and credit transactions by customer.
              </p>
            </div>
            <FileUpload />
          </div>
        )}

        {transactions.length > 0 && (
          <>
            <FileUpload />
            <DataPreview />
            <ActionBar />
            <Dashboard />
            <ReconcileTable />
          </>
        )}
      </main>

      <footer className="border-t border-gray-200 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-xs text-gray-400 text-center">
            Financial Reconciliation System — Designed for scaling to database-backed operations
          </p>
        </div>
      </footer>
    </div>
  );
}
