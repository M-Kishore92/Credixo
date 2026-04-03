export default function Badge({ type = 'info', label, className = '' }) {
  const typeMap = {
    approve: 'badge-approve',
    review: 'badge-review',
    reject: 'badge-reject',
    low: 'badge-low',
    moderate: 'badge-moderate',
    high: 'badge-high',
    info: 'badge-info',
  };

  return (
    <span className={`badge ${typeMap[type] || 'badge-info'} ${className}`}>
      {label}
    </span>
  );
}

export function DecisionBadge({ decision }) {
  const map = {
    'Approve': { type: 'approve', label: 'Approved' },
    'Human Review': { type: 'review', label: 'Human Review' },
    'Reject': { type: 'reject', label: 'Rejected' },
  };
  const config = map[decision] || { type: 'info', label: decision };
  return <Badge type={config.type} label={config.label} />;
}

export function RiskBadge({ riskBand }) {
  const map = {
    'Low Risk': 'low',
    'Moderate Risk': 'moderate',
    'High Risk': 'high',
  };
  return <Badge type={map[riskBand] || 'info'} label={riskBand} />;
}
