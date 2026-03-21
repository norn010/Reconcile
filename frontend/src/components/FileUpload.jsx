import { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, X, AlertCircle } from 'lucide-react';
import useReconcileStore from '../store/useReconcileStore';

export default function FileUpload() {
  const { setFile, isUploading, fileName, transactions, reset } = useReconcileStore();
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');

  const handleFile = useCallback(async (file) => {
    setError('');
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setError('Please upload an Excel file (.xlsx or .xls)');
      return;
    }
    try {
      await setFile(file);
    } catch (err) {
      setError(`Failed to parse file: ${err.message}`);
    }
  }, [setFile]);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleChange = useCallback((e) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  if (transactions.length > 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-success-50 rounded-lg flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5 text-success-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{fileName}</p>
            <p className="text-sm text-gray-500">{transactions.length} transactions loaded</p>
          </div>
        </div>
        <button
          onClick={reset}
          className="p-2 text-gray-400 hover:text-danger-500 hover:bg-danger-50 rounded-lg transition-colors"
          title="Remove file"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer
          ${dragActive
            ? 'border-primary-400 bg-primary-50'
            : 'border-gray-300 hover:border-primary-300 hover:bg-gray-50'
          }
          ${isUploading ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input').click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".xlsx,.xls"
          onChange={handleChange}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-3">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center
            ${dragActive ? 'bg-primary-100' : 'bg-gray-100'}`}>
            <Upload className={`w-7 h-7 ${dragActive ? 'text-primary-500' : 'text-gray-400'}`} />
          </div>
          <div>
            <p className="text-lg font-medium text-gray-700">
              {isUploading ? 'Parsing file...' : 'Drop your Excel file here'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              or <span className="text-primary-500 font-medium">browse</span> to choose a file
            </p>
          </div>
          <p className="text-xs text-gray-400">Supports .xlsx and .xls files up to 50MB</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-danger-50 text-danger-700 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
