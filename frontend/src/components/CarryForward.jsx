import { ArrowRightCircle, Trash2, FileText, Calendar, AlertTriangle } from 'lucide-react';
import useReconcileStore from '../store/useReconcileStore';

export default function CarryForward() {
  const { carryForward, clearCarryForward } = useReconcileStore();

  if (!carryForward) return null;

  const savedDate = new Date(carryForward.savedAt);
  const dateStr = savedDate.toLocaleDateString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
          <ArrowRightCircle className="w-5 h-5 text-amber-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-amber-900">ยอดยกมาจากปีก่อน</h3>
            <span className="px-2 py-0.5 bg-amber-200 text-amber-800 rounded-full text-xs font-medium">
              Carry Forward
            </span>
          </div>

          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex items-center gap-2 text-sm text-amber-800">
              <FileText className="w-3.5 h-3.5" />
              <span className="truncate">{carryForward.sourceFile}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-amber-800">
              <Calendar className="w-3.5 h-3.5" />
              <span>{dateStr}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{carryForward.totalEntries} รายการคงค้าง</span>
            </div>
            <div className="text-sm font-mono font-semibold text-amber-900">
              {carryForward.totalDifference.toLocaleString(undefined, {
                minimumFractionDigits: 2, maximumFractionDigits: 2,
              })} บาท
            </div>
          </div>

          <p className="mt-2 text-xs text-amber-600">
            ยอดนี้จะถูกนำไปรวมกับไฟล์ใหม่ที่อัพโหลดโดยอัตโนมัติเมื่อกด Reconcile
          </p>
        </div>

        <button
          onClick={clearCarryForward}
          className="p-2 text-amber-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
          title="ลบยอดยกมา"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
