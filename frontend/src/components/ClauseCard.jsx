/**
 * ClauseCard — expandable single-clause display.
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, Info } from 'lucide-react';
import RiskBadge from './RiskBadge.jsx';

const CATEGORY_COLORS = {
  Termination:     'bg-red-500/10 text-red-400 border-red-500/20',
  Liability:       'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Confidentiality: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Payment:         'bg-green-500/10 text-green-400 border-green-500/20',
  IP:              'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Indemnification: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  'Governing Law': 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  'Non-Compete':   'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  Warranty:        'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
};

const RISK_ICONS = {
  low:      <Info size={14} className="text-risk-low shrink-0 mt-0.5" />,
  medium:   <AlertTriangle size={14} className="text-risk-medium shrink-0 mt-0.5" />,
  high:     <AlertTriangle size={14} className="text-risk-high shrink-0 mt-0.5" />,
  critical: <AlertTriangle size={14} className="text-risk-critical shrink-0 mt-0.5" />,
};

const RISK_LEFT_BORDER = {
  low:      'border-l-risk-low',
  medium:   'border-l-risk-medium',
  high:     'border-l-risk-high',
  critical: 'border-l-risk-critical',
};

export default function ClauseCard({ clause, index }) {
  const [expanded, setExpanded] = useState(false);

  const categoryClass =
    CATEGORY_COLORS[clause.category] ?? 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  const leftBorder = RISK_LEFT_BORDER[clause.risk_level] ?? 'border-l-gray-500';

  return (
    <div
      className={`
        card border-l-[3px] ${leftBorder}
        transition-all duration-200 overflow-hidden
      `}
    >
      {/* Header row — always visible */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left p-4 flex items-start gap-3 hover:bg-surface-2/50 transition-colors"
        aria-expanded={expanded}
      >
        {/* Index pill */}
        <span className="shrink-0 w-6 h-6 rounded-md bg-surface-2 text-xs font-mono font-medium text-gray-400 flex items-center justify-center mt-0.5">
          {index + 1}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-semibold text-gray-100 text-sm leading-snug">
              {clause.title}
            </span>
            <RiskBadge level={clause.risk_level} size="sm" />
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${categoryClass}`}>
              {clause.category}
            </span>
          </div>
        </div>

        <div className="shrink-0 text-gray-500 mt-0.5">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-surface-3 pt-4 space-y-4">
          {/* Clause text excerpt */}
          {clause.text && (
            <div className="bg-surface-0 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2">
                Clause Excerpt
              </p>
              <p className="text-sm text-gray-300 leading-relaxed font-mono whitespace-pre-wrap">
                {clause.text}
              </p>
            </div>
          )}

          {/* Risk reason */}
          {clause.risk_reason && (
            <div className="flex gap-2.5">
              {RISK_ICONS[clause.risk_level]}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">
                  Risk Assessment
                </p>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {clause.risk_reason}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
