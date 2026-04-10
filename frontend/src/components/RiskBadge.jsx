/**
 * RiskBadge — colour-coded pill for risk levels.
 */

const CONFIG = {
  low:      { label: 'Low Risk',      classes: 'bg-risk-low/15 text-risk-low border border-risk-low/30' },
  medium:   { label: 'Medium Risk',   classes: 'bg-risk-medium/15 text-risk-medium border border-risk-medium/30' },
  high:     { label: 'High Risk',     classes: 'bg-risk-high/15 text-risk-high border border-risk-high/30' },
  critical: { label: 'Critical Risk', classes: 'bg-risk-critical/15 text-risk-critical border border-risk-critical/30' },
};

/**
 * @param {{ level: 'low'|'medium'|'high'|'critical', size?: 'sm'|'md' }} props
 */
export default function RiskBadge({ level, size = 'md' }) {
  const cfg = CONFIG[level] ?? CONFIG.medium;
  const sizeClass = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-0.5';

  return (
    <span className={`risk-badge ${cfg.classes} ${sizeClass}`}>
      {cfg.label}
    </span>
  );
}
