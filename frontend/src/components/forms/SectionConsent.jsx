import { motion } from 'framer-motion';
import { ShieldCheck, FileText, ArrowRight } from 'lucide-react';

export default function SectionConsent({ register, errors, watch, setValue }) {
  const selected = watch('verification_mode') || 'self_reported';

  const options = [
    {
      id: 'aa_uli',
      icon: <ShieldCheck size={28} />,
      title: 'Digital Data Pull via AA / ULI',
      tag: 'Recommended — Fast Track',
      tagColor: '#10b981',
      description:
        'Consent to securely fetch your income, utility payment, and mobile recharge records via Sahamati Account Aggregator (AA) and Unified Lending Interface (ULI). Verified data receives full scoring weight.',
      benefits: [
        'Faster processing — no manual document uploads',
        'Verified data receives full scoring weight',
        'Higher chance of automated approval',
      ],
    },
    {
      id: 'self_reported',
      icon: <FileText size={28} />,
      title: 'Self-Reported Only',
      tag: 'Fallback — Manual Review',
      tagColor: '#f59e0b',
      description:
        'Provide all information manually. Your application will still be processed, but self-reported data is down-weighted and will require additional human review by a loan officer.',
      benefits: [
        'No external data sharing required',
        'Full control of submitted information',
        'Application still fully functional',
      ],
    },
  ];

  return (
    <div>
      <h2
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '1.3rem',
          marginBottom: 8,
          color: 'var(--color-text-primary)',
        }}
      >
        🔐 Consent & Data Verification
      </h2>
      <p
        style={{
          fontSize: '0.85rem',
          color: 'var(--color-text-muted)',
          marginBottom: 24,
          lineHeight: 1.5,
        }}
      >
        Choose how your financial and behavioral data will be sourced. Digital data pull
        via AA/ULI is recommended for faster, higher-confidence scoring. You may also
        self-report — this never blocks your application, but shifts verification to a loan officer.
      </p>

      <div style={{ display: 'flex', gap: 20 }}>
        {options.map((opt) => {
          const isSelected = selected === opt.id;
          return (
            <motion.label
              key={opt.id}
              whileHover={{ scale: 1.015, y: -2 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setValue('verification_mode', opt.id)}
              style={{
                flex: 1,
                cursor: 'pointer',
                padding: 24,
                borderRadius: 16,
                border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: isSelected
                  ? 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.06) 100%)'
                  : 'var(--color-surface)',
                boxShadow: isSelected
                  ? '0 4px 20px rgba(99,102,241,0.15)'
                  : '0 1px 4px rgba(0,0,0,0.04)',
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <input
                type="radio"
                value={opt.id}
                {...register('verification_mode')}
                checked={isSelected}
                onChange={() => setValue('verification_mode', opt.id)}
                style={{ position: 'absolute', opacity: 0 }}
              />

              {/* Tag badge */}
              <span
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: '#fff',
                  background: opt.tagColor,
                  padding: '3px 10px',
                  borderRadius: 20,
                  letterSpacing: '0.02em',
                }}
              >
                {opt.tag}
              </span>

              {/* Icon + Title */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 12,
                  color: isSelected ? 'var(--color-primary)' : 'var(--color-text-primary)',
                }}
              >
                {opt.icon}
                <span
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '1.05rem',
                    fontWeight: 600,
                  }}
                >
                  {opt.title}
                </span>
              </div>

              {/* Description */}
              <p
                style={{
                  fontSize: '0.82rem',
                  color: 'var(--color-text-muted)',
                  lineHeight: 1.5,
                  marginBottom: 14,
                }}
              >
                {opt.description}
              </p>

              {/* Benefits */}
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {opt.benefits.map((b, i) => (
                  <li
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: '0.8rem',
                      color: 'var(--color-text-secondary)',
                      marginBottom: 6,
                    }}
                  >
                    <ArrowRight
                      size={13}
                      style={{ color: isSelected ? 'var(--color-primary)' : 'var(--color-text-muted)', flexShrink: 0 }}
                    />
                    {b}
                  </li>
                ))}
              </ul>

              {/* Selection indicator */}
              {isSelected && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    position: 'absolute',
                    bottom: 12,
                    right: 12,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ShieldCheck size={13} style={{ color: '#fff' }} />
                </motion.div>
              )}
            </motion.label>
          );
        })}
      </div>

      {/* Disclaimer */}
      <div
        style={{
          marginTop: 20,
          padding: '12px 16px',
          borderRadius: 10,
          background: 'rgba(99,102,241,0.06)',
          border: '1px solid rgba(99,102,241,0.12)',
          fontSize: '0.78rem',
          color: 'var(--color-text-muted)',
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: 'var(--color-text-secondary)' }}>Privacy note:</strong>{' '}
        Data fetched via AA/ULI is used solely for credit scoring and loan evaluation.
        Your consent can be revoked at any time. This is currently a <em>demo stub</em> —
        no live data connections are active yet.
      </div>
    </div>
  );
}
