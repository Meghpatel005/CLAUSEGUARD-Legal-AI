/**
 * AnalysisPanel — renders the complete document analysis:
 *   overview cards → risk meter → summary → clause list
 */

import { useEffect, useRef } from 'react';
import { FileText, Users, Calendar, ShieldAlert, BookOpen } from 'lucide-react';
import RiskBadge from './RiskBadge.jsx';
import ClauseCard from './ClauseCard.jsx';

// ── Risk score SVG ring ────────────────────────────────────────────────────

function RiskRing({ score, level }) {
  const RADIUS = 40;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const offset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;

  const RING_COLOR = {
    low:      '#22c55e',
    medium:   '#eab308',
    high:     '#f97316',
    critical: '#ef4444',
  };

  const ringRef = useRef(null);

  useEffect(() => {
    if (ringRef.current) {
      ringRef.current.style.setProperty('--target-offset', `${offset}px`);
    }
  }, [offset]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={RADIUS} fill="none" stroke="#21262d" strokeWidth="7" />
          <circle
            ref={ringRef}
            cx="48" cy="48" r={RADIUS}
            fill="none"
            stroke={RING_COLOR[level] ?? '#eab308'}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            className="score-ring-animate"
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.25,0.46,0.45,0.94)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-gray-100 leading-none">{score}</span>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">/ 100</span>
        </div>
      </div>
      <RiskBadge level={level} />
    </div>
  );
}

// ── Overview metric card ───────────────────────────────────────────────────

function MetricCard({ icon, label, value }) {
  return (
    <div className="card p-4 flex items-start gap-3">
      <div className="shrink-0 w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-gray-100 truncate">{value || '—'}</p>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function AnalysisPanel({ analysis, docMeta }) {
  const {
    document_type,
    summary,
    key_parties = [],
    effective_date,
    clauses = [],
    overall_risk_score,
    overall_risk_level,
  } = analysis;

  // Group clauses by risk level for the breakdown display
  const riskCounts = clauses.reduce((acc, c) => {
    acc[c.risk_level] = (acc[c.risk_level] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6 pb-10">

      {/* ── Overview row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          icon={<BookOpen size={18} strokeWidth={1.5} />}
          label="Document Type"
          value={document_type}
        />
        <MetricCard
          icon={<FileText size={18} strokeWidth={1.5} />}
          label="Pages / Words"
          value={`${docMeta.page_count} pages · ${docMeta.word_count.toLocaleString()} words`}
        />
        <MetricCard
          icon={<Users size={18} strokeWidth={1.5} />}
          label="Key Parties"
          value={key_parties.length ? key_parties.join(' · ') : 'Not identified'}
        />
        <MetricCard
          icon={<Calendar size={18} strokeWidth={1.5} />}
          label="Effective Date"
          value={effective_date ?? 'Not specified'}
        />
      </div>

      {/* ── Risk overview card ────────────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <ShieldAlert size={18} className="text-brand" />
          <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">
            Risk Overview
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-8">
          <RiskRing score={overall_risk_score} level={overall_risk_level} />

          <div className="flex-1 space-y-2 w-full">
            {[
              { level: 'critical', label: 'Critical' },
              { level: 'high',     label: 'High' },
              { level: 'medium',   label: 'Medium' },
              { level: 'low',      label: 'Low' },
            ].map(({ level, label }) => {
              const count = riskCounts[level] ?? 0;
              const pct = clauses.length ? (count / clauses.length) * 100 : 0;
              return (
                <div key={level} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-14 text-right">{label}</span>
                  <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 bg-risk-${level}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-gray-400 w-4">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Document summary ──────────────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={16} className="text-brand" />
          <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">
            Plain-Language Summary
          </h2>
        </div>
        <p className="text-gray-300 leading-relaxed text-sm">{summary}</p>
      </div>

      {/* ── Clause list ───────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">
            Identified Clauses ({clauses.length})
          </h2>
          <span className="text-xs text-gray-500">Click a clause to expand</span>
        </div>

        {clauses.length === 0 ? (
          <div className="card p-8 text-center text-gray-500 text-sm">
            No clauses were identified in this document.
          </div>
        ) : (
          <div className="space-y-2">
            {clauses.map((clause, i) => (
              <ClauseCard key={clause.id} clause={clause} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
