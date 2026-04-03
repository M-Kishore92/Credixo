import { useEffect, useState, useRef } from 'react';

const SIZES = { sm: 100, md: 180, lg: 250 };

function getColor(score) {
  if (score < 40) return '#EF4444';
  if (score < 60) return '#F59E0B';
  if (score < 80) return '#84CC16';
  return '#10B981';
}

function getTrackColor(score) {
  if (score < 40) return 'rgba(239,68,68,0.12)';
  if (score < 60) return 'rgba(245,158,11,0.12)';
  if (score < 80) return 'rgba(132,204,22,0.12)';
  return 'rgba(16,185,129,0.12)';
}

export default function ScoreGauge({ score = 0, size = 'md', animated = true, label = 'Alternative Credit Score' }) {
  const [displayScore, setDisplayScore] = useState(animated ? 0 : score);
  const svgSize = SIZES[size] || SIZES.md;
  const strokeWidth = size === 'sm' ? 8 : size === 'lg' ? 14 : 10;
  const radius = (svgSize - strokeWidth) / 2 - 4;
  const circumference = Math.PI * radius;
  const animRef = useRef(null);

  useEffect(() => {
    if (!animated) {
      setDisplayScore(score);
      return;
    }
    let start = null;
    const duration = 1200;
    const animate = (ts) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * score));
      if (progress < 1) animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [score, animated]);

  const color = getColor(score);
  const trackColor = getTrackColor(score);
  const dashOffset = circumference - (displayScore / 100) * circumference;
  const fontSize = size === 'sm' ? '1.5rem' : size === 'lg' ? '3.5rem' : '2.5rem';
  const labelSize = size === 'sm' ? '0.6rem' : size === 'lg' ? '0.9rem' : '0.75rem';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size === 'sm' ? 4 : 8 }}>
      <svg width={svgSize} height={svgSize / 2 + strokeWidth + 8} viewBox={`0 0 ${svgSize} ${svgSize / 2 + strokeWidth + 8}`}>
        {/* Track */}
        <path
          d={`M ${strokeWidth / 2 + 4} ${svgSize / 2 + 4}
              A ${radius} ${radius} 0 0 1 ${svgSize - strokeWidth / 2 - 4} ${svgSize / 2 + 4}`}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Fill */}
        <path
          d={`M ${strokeWidth / 2 + 4} ${svgSize / 2 + 4}
              A ${radius} ${radius} 0 0 1 ${svgSize - strokeWidth / 2 - 4} ${svgSize / 2 + 4}`}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: animated ? 'none' : 'stroke-dashoffset 0.5s ease' }}
        />
        {/* Score number */}
        <text
          x={svgSize / 2}
          y={svgSize / 2 - 2}
          textAnchor="middle"
          fill={color}
          style={{ fontFamily: "'DM Serif Display', serif", fontSize, fontWeight: 400 }}
        >
          {displayScore}
        </text>
      </svg>
      {label && (
        <span style={{
          fontSize: labelSize,
          color: 'var(--color-text-muted)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          {label}
        </span>
      )}
    </div>
  );
}
