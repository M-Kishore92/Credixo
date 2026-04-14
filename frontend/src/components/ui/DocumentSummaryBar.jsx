import { Info } from 'lucide-react';

export default function DocumentSummaryBar({ uploadedCount, totalFields = 7, fieldStatuses }) {
  const getStatusColor = () => {
    if (uploadedCount <= 2) return { bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.3)', text: '#92400E' };
    if (uploadedCount <= 5) return { bg: 'rgba(91, 110, 232, 0.08)', border: 'rgba(91, 110, 232, 0.3)', text: 'var(--color-primary)' };
    return { bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.3)', text: '#065F46' };
  };

  const colors = getStatusColor();

  return (
    <div style={{
      padding: '18px 24px',
      borderRadius: 16,
      marginBottom: 32,
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      transition: 'all 0.3s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0, color: colors.text }}>
          Documents uploaded: {uploadedCount} of {totalFields} fields
        </p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {fieldStatuses.map((f, i) => (
          <span key={i} style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '4px 12px',
            borderRadius: 8,
            background: f.uploaded ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.1)',
            color: f.uploaded ? '#065F46' : 'var(--color-text-muted)',
            border: `1px solid ${f.uploaded ? 'rgba(16, 185, 129, 0.2)' : 'rgba(148, 163, 184, 0.1)'}`,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4
          }}>
            {f.label} {f.uploaded ? '✓' : ''}
          </span>
        ))}
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic', marginLeft: 4 }}>
          [others: manual entry]
        </span>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Info size={16} style={{ color: colors.text, opacity: 0.7, marginTop: 2, flexShrink: 0 }} />
        <p style={{ fontSize: '0.8rem', margin: 0, color: colors.text, opacity: 0.85, lineHeight: 1.5 }}>
          More documents = higher score confidence. Missing documents will not reject
          the application but may route it to Human Review.
        </p>
      </div>
    </div>
  );
}
