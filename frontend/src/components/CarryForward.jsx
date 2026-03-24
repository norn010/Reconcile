import { useCallback, useState, useRef } from 'react';
import { ArrowRightCircle, Trash2, FileText, Calendar, AlertTriangle, Upload, AlertCircle } from 'lucide-react';
import useReconcileStore from '../store/useReconcileStore';

export default function CarryForward() {
  const { carryForward, clearCarryForward, setCarryForwardFile } = useReconcileStore();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setError('กรุณาอัปโหลดไฟล์ Excel (.xlsx หรือ .xls)');
      return;
    }
    setError('');
    setUploading(true);
    try {
      await setCarryForwardFile(file);
    } catch (err) {
      setError(`ไม่สามารถอ่านไฟล์ได้: ${err.message}`);
    } finally {
      setUploading(false);
    }
  }, [setCarryForwardFile]);

  const handleChange = useCallback((e) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  if (carryForward) {
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

  return (
    <div
      className="border border-dashed border-amber-300 bg-amber-50/50 rounded-xl p-4 transition-colors hover:bg-amber-50 hover:border-amber-400"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
          <Upload className="w-5 h-5 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-800">
            อัปโหลดยอดยกมา (ถ้ามี)
          </p>
          <p className="text-xs text-amber-600 mt-0.5">
            ไฟล์สรุปยอดคงค้างจากปีก่อนหน้า — ลาก/วางหรือคลิกเพื่อเลือกไฟล์
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleChange}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors disabled:opacity-50"
        >
          {uploading ? 'กำลังอ่าน...' : 'เลือกไฟล์'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 mt-3 p-2.5 bg-red-50 text-red-700 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
