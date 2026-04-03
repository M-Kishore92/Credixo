import { Check } from 'lucide-react';

export default function StepIndicator({ steps, currentStep }) {
  const progress = ((currentStep) / steps.length) * 100;

  return (
    <div style={{ padding: '24px 20px' }}>
      {/* Progress bar */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Progress</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'var(--font-mono)' }}>{Math.round(progress)}%</span>
        </div>
        <div style={{
          height: 6,
          background: 'var(--color-border)',
          borderRadius: 999,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, var(--color-primary), var(--color-accent))',
            borderRadius: 999,
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {steps.map((step, i) => {
          const isCompleted = i < currentStep;
          const isCurrent = i === currentStep;
          const isFuture = i > currentStep;

          return (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              {/* Line + Circle */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 28 }}>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  flexShrink: 0,
                  transition: 'all 0.3s ease',
                  ...(isCompleted ? {
                    background: 'var(--color-success)',
                    color: 'white',
                  } : isCurrent ? {
                    background: 'var(--color-primary)',
                    color: 'white',
                    boxShadow: '0 0 0 4px rgba(91, 110, 232, 0.2)',
                  } : {
                    background: 'var(--color-border)',
                    color: 'var(--color-text-muted)',
                  }),
                }}>
                  {isCompleted ? <Check size={14} strokeWidth={3} /> : i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div style={{
                    width: 2,
                    height: 28,
                    background: isCompleted ? 'var(--color-success)' : 'var(--color-border)',
                    transition: 'background 0.3s ease',
                  }} />
                )}
              </div>

              {/* Label */}
              <div style={{ paddingTop: 4, paddingBottom: 20 }}>
                <span style={{
                  fontSize: '0.875rem',
                  fontWeight: isCurrent ? 700 : 500,
                  color: isCurrent ? 'var(--color-text-primary)' : isFuture ? 'var(--color-text-muted)' : 'var(--color-text-secondary)',
                  transition: 'all 0.3s ease',
                }}>
                  {step}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
