import { CheckCircle, XCircle, AlertTriangle, Users, FileText, ArrowDownUp, ArchiveRestore } from 'lucide-react';
import useReconcileStore from '../store/useReconcileStore';

function StatCard({ icon: Icon, label, value, color, subtext }) {
  const colorClasses = {
    blue: 'bg-primary-50 text-primary-600',
    green: 'bg-success-50 text-success-600',
    red: 'bg-danger-50 text-danger-600',
    amber: 'bg-warning-50 text-warning-600',
    gray: 'bg-gray-50 text-gray-600',
    teal: 'bg-teal-50 text-teal-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { summary } = useReconcileStore();

  if (!summary) return null;

  const matchRate = summary.totalCustomers > 0
    ? Math.round((summary.matched / summary.totalCustomers) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Reconciliation Summary</h2>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          icon={FileText}
          label="Total Records"
          value={summary.totalTransactions.toLocaleString()}
          color="gray"
        />
        <StatCard
          icon={Users}
          label="Customers"
          value={summary.totalCustomers.toLocaleString()}
          color="blue"
        />
        <StatCard
          icon={CheckCircle}
          label="Matched"
          value={summary.matched.toLocaleString()}
          color="green"
          subtext={`${matchRate}% match rate`}
        />
        <StatCard
          icon={XCircle}
          label="Missing Credit"
          value={summary.missingCredit.toLocaleString()}
          color="red"
        />
        <StatCard
          icon={AlertTriangle}
          label="Missing Debit"
          value={summary.missingDebit.toLocaleString()}
          color="amber"
        />
        <StatCard
          icon={ArrowDownUp}
          label="Net Difference"
          value={summary.totalDifference.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          color={summary.totalDifference === 0 ? 'green' : 'red'}
        />
      </div>

      {summary.cfResolved > 0 && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-center gap-3">
          <ArchiveRestore className="w-5 h-5 text-teal-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-teal-800">
              ยอดยกมาที่เคลียร์แล้ว {summary.cfResolved.toLocaleString()} ราย
            </p>
            <p className="text-xs text-teal-600">
              ยอดรวม {Math.abs(summary.cfResolvedTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท — รายการจากยอดยกมาที่ไม่มีรายการในไฟล์ปัจจุบัน (ถือว่าเคลียร์แล้ว)
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-500 mb-2">Total Debit</p>
          <p className="text-xl font-bold text-gray-900">
            {summary.totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-500 mb-2">Total Credit</p>
          <p className="text-xl font-bold text-gray-900">
            {summary.totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>
    </div>
  );
}
