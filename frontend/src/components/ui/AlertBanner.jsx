import { AlertTriangle, AlertCircle, CheckCircle, XCircle, X } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CONFIG = {
  fairness: {
    bg: 'rgba(245, 158, 11, 0.08)',
    border: 'rgba(245, 158, 11, 0.3)',
    color: '#92400E',
    icon: AlertTriangle,
    iconColor: '#F59E0B',
  },
  drift: {
    bg: 'rgba(239, 68, 68, 0.08)',
    border: 'rgba(239, 68, 68, 0.3)',
    color: '#991B1B',
    icon: AlertCircle,
    iconColor: '#EF4444',
  },
  review: {
    bg: 'rgba(245, 158, 11, 0.08)',
    border: 'rgba(245, 158, 11, 0.3)',
    color: '#92400E',
    icon: AlertTriangle,
    iconColor: '#F59E0B',
  },
  success: {
    bg: 'rgba(16, 185, 129, 0.08)',
    border: 'rgba(16, 185, 129, 0.3)',
    color: '#065F46',
    icon: CheckCircle,
    iconColor: '#10B981',
  },
};

export default function AlertBanner({ type = 'review', message, dismissible = true }) {
  const [visible, setVisible] = useState(true);
  const cfg = CONFIG[type] || CONFIG.review;
  const IconComp = cfg.icon;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          style={{
            padding: '14px 20px',
            borderRadius: 14,
            border: `1px solid ${cfg.border}`,
            background: cfg.bg,
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <IconComp size={20} style={{ color: cfg.iconColor, flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 500, color: cfg.color }}>
            {message}
          </span>
          {dismissible && (
            <button
              onClick={() => setVisible(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: cfg.color, opacity: 0.6 }}
              aria-label="Dismiss alert"
            >
              <X size={16} />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
