import { CallSummary } from '../types/index';

interface SummaryCardProps {
  summary: CallSummary;
  onClose: () => void;
}

const STATUS_CONFIG = {
  RESOLVED:   { icon: '✅', label: 'Resolved',   cls: 'resolved'   },
  UNRESOLVED: { icon: '⚠️', label: 'Unresolved', cls: 'unresolved' },
  ESCALATED:  { icon: '🔁', label: 'Escalated',  cls: 'escalated'  },
};

const INTENT_LABELS: Record<string, string> = {
  ORDER_TRACKING:    '📦 Order Tracking',
  ORDER_CANCELLATION:'❌ Order Cancellation',
  RETURN_REQUEST:    '🔄 Return Request',
  POLICY_QUERY:      '📋 Policy Query',
  GENERAL_INQUIRY:   '💬 General Inquiry',
  OUT_OF_SCOPE:      '🚫 Out of Scope',
  NO_INTERACTION:    '—  No Interaction',
  UNKNOWN:           '❓ Unknown',
};

export function SummaryCard({ summary, onClose }: SummaryCardProps) {
  const statusCfg = STATUS_CONFIG[summary.resolution_status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.UNRESOLVED;
  const intentLabel = INTENT_LABELS[summary.customer_intent] ?? summary.customer_intent;

  const jsonDisplay = JSON.stringify(summary, null, 2);

  const copyJson = () => {
    navigator.clipboard.writeText(jsonDisplay);
  };

  return (
    <div className="summary-overlay" role="dialog" aria-modal="true" aria-label="Call Summary">
      <div className="summary-card">
        {/* Header */}
        <div className="summary-header">
          <div>
            <h2 className="summary-title">Call Summary</h2>
            <p className="summary-subtitle">Post-call structured report</p>
          </div>
          <button className="summary-close-btn" onClick={onClose} aria-label="Close summary">✕</button>
        </div>

        {/* Status badges */}
        <div className="summary-badges">
          <div className={`summary-badge summary-badge--${statusCfg.cls}`}>
            <span>{statusCfg.icon}</span>
            <span>{statusCfg.label}</span>
          </div>
          <div className="summary-badge summary-badge--intent">
            <span>{intentLabel}</span>
          </div>
          {summary.order_id && (
            <div className="summary-badge summary-badge--order">
              <span>🆔</span>
              <span>{summary.order_id}</span>
            </div>
          )}
        </div>

        {/* Summary text */}
        <div className="summary-text-block">
          <h3>Summary</h3>
          <p>{summary.call_summary}</p>
        </div>

        {/* JSON block */}
        <div className="summary-json-block">
          <div className="summary-json-header">
            <span>Structured Output (JSON)</span>
            <button className="summary-copy-btn" onClick={copyJson}>📋 Copy</button>
          </div>
          <pre className="summary-json">
            <code>{jsonDisplay}</code>
          </pre>
        </div>

        <div className="summary-footer">
          <button className="btn btn--primary" onClick={onClose}>Start New Call</button>
        </div>
      </div>
    </div>
  );
}
