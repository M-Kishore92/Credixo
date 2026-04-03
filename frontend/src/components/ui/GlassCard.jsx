import { motion } from 'framer-motion';

export default function GlassCard({ children, className = '', tilt = false, hover = true, onClick, style }) {
  return (
    <motion.div
      className={`${hover ? 'glass-card' : 'glass-card-static'} ${className}`}
      style={{
        ...(tilt ? { transform: 'rotate(-5deg)' } : {}),
        ...style,
      }}
      whileHover={hover ? { y: -3, boxShadow: '0 20px 40px rgba(0,0,0,0.08)' } : {}}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}
