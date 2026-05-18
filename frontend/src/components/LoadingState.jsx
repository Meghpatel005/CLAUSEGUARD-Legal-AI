/**
 * LoadingState — full-panel animated loading indicator.
 */

import { Shield } from 'lucide-react';

export default function LoadingState({ phase, statusMessage }) {
  const messages = {
    uploading: {
      title: 'Uploading document…',
      subtitle: 'Validating PDF, extracting text (OCR if scanned), and preparing chunks.',
    },
    analyzing: {
      title: 'Analysing clauses…',
      subtitle:
        statusMessage ||
        'AI is reviewing provisions, risk levels, and page citations. You can keep this tab open.',
    },
  };

  const msg = messages[phase] ?? { title: 'Processing…', subtitle: statusMessage || '' };

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-6">
      {/* Animated shield ring */}
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle
            cx="40" cy="40" r="34"
            fill="none"
            stroke="#21262d"
            strokeWidth="5"
          />
          <circle
            cx="40" cy="40" r="34"
            fill="none"
            stroke="#7c3aed"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray="213.6"
            strokeDashoffset="53"
            className="animate-spin origin-center"
            style={{ animationDuration: '1.4s' }}
          />
        </svg>
        <Shield
          size={28}
          className="absolute inset-0 m-auto text-brand"
          strokeWidth={1.5}
        />
      </div>

      <div className="text-center max-w-sm">
        <p className="text-lg font-semibold text-gray-100 mb-1">{msg.title}</p>
        <p className="text-sm text-gray-400 leading-relaxed">{msg.subtitle}</p>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-brand animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }}
          />
        ))}
      </div>
    </div>
  );
}
