import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import GlassCard from './GlassCard';

function useCountUp(end, duration = 1200) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    let start = null;
    const animate = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * end));
      if (progress < 1) ref.current = requestAnimationFrame(animate);
    };
    ref.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(ref.current);
  }, [end, duration]);

  return value;
}

export default function StatCard({ label, value, trend, trendDirection = 'up', icon: Icon, color = 'var(--color-primary)', delay = 0 }) {
  const displayValue = useCountUp(typeof value === 'number' ? value : parseInt(value) || 0);
  const isPercent = typeof value === 'string' && value.includes('%');
  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay * 0.08 }}
    >
      <GlassCard className="" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              {label}
            </p>
            <p style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '2rem',
              color: 'var(--color-text-primary)',
              lineHeight: 1,
            }}>
              {isPercent ? `${useCountUp(numericValue)}%` : displayValue.toLocaleString()}
            </p>
          </div>
          {Icon && (
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: `${color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Icon size={22} style={{ color }} />
            </div>
          )}
        </div>
        {trend && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
            {trendDirection === 'up' ? (
              <TrendingUp size={14} style={{ color: 'var(--color-success)' }} />
            ) : (
              <TrendingDown size={14} style={{ color: 'var(--color-danger)' }} />
            )}
            <span style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              color: trendDirection === 'up' ? 'var(--color-success)' : 'var(--color-danger)',
            }}>
              {trend}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>vs last period</span>
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}
