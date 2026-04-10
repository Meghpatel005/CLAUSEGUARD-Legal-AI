/**
 * UploadZone — drag-and-drop PDF upload panel.
 */

import { useRef, useState } from 'react';
import { Shield, Upload, FileText, AlertCircle } from 'lucide-react';

export default function UploadZone({ onUpload, disabled }) {
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState(null);
  const inputRef = useRef(null);

  const validateAndSubmit = (file) => {
    setLocalError(null);
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setLocalError('Only PDF files are supported.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setLocalError('File must be under 20 MB.');
      return;
    }
    onUpload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    validateAndSubmit(file);
  };

  const handleFileInput = (e) => {
    validateAndSubmit(e.target.files?.[0]);
    // Reset so same file can be re-uploaded
    e.target.value = '';
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="flex flex-col items-center gap-4 mb-12">
        <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/30 flex items-center justify-center">
          <Shield size={32} className="text-brand" strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-100 tracking-tight">
            ClauseGuard <span className="text-brand">AI</span>
          </h1>
          <p className="text-gray-400 mt-2 text-base max-w-md">
            Upload a legal document for instant clause analysis, risk assessment,
            and plain-language explanation.
          </p>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`
          w-full max-w-xl border-2 border-dashed rounded-2xl p-12
          flex flex-col items-center gap-4 cursor-pointer select-none
          transition-all duration-200
          ${dragging
            ? 'border-brand bg-brand/5 scale-[1.01]'
            : 'border-surface-3 bg-surface-1 hover:border-brand/50 hover:bg-surface-2'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <div className={`
          w-14 h-14 rounded-xl flex items-center justify-center
          transition-colors duration-200
          ${dragging ? 'bg-brand/20' : 'bg-surface-2'}
        `}>
          {dragging
            ? <Upload size={28} className="text-brand" />
            : <FileText size={28} className="text-gray-400" />
          }
        </div>

        <div className="text-center">
          <p className="text-gray-100 font-medium">
            {dragging ? 'Release to upload' : 'Drag & drop your PDF here'}
          </p>
          <p className="text-gray-500 text-sm mt-1">
            or{' '}
            <span className="text-brand hover:text-brand-light underline underline-offset-2">
              browse files
            </span>
          </p>
        </div>

        <p className="text-xs text-gray-600 mt-2">
          PDF only · Max 20 MB · Text-based documents only
        </p>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleFileInput}
          disabled={disabled}
        />
      </div>

      {/* Local validation error */}
      {localError && (
        <div className="mt-4 flex items-center gap-2 text-risk-high text-sm bg-risk-high/10 border border-risk-high/30 px-4 py-2.5 rounded-lg max-w-xl w-full">
          <AlertCircle size={16} className="shrink-0" />
          {localError}
        </div>
      )}

      {/* Feature list */}
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl w-full">
        {[
          { icon: '🔍', label: 'Clause Detection', desc: 'Identifies and categorises key clauses' },
          { icon: '⚠️', label: 'Risk Scoring',      desc: 'Flags high-risk provisions with explanation' },
          { icon: '💬', label: 'Document Chat',     desc: 'Ask questions, get grounded answers' },
        ].map(({ icon, label, desc }) => (
          <div key={label} className="card p-4 text-center">
            <div className="text-2xl mb-2">{icon}</div>
            <p className="text-sm font-semibold text-gray-200">{label}</p>
            <p className="text-xs text-gray-500 mt-1">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
