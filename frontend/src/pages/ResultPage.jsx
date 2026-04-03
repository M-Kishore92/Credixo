import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, XCircle, ArrowRight, BarChart3, FilePlus, Bookmark } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import GlassCard from '../components/ui/GlassCard';
import ScoreGauge from '../components/ui/ScoreGauge';
import { RiskBadge } from '../components/ui/Badge';
import AlertBanner from '../components/ui/AlertBanner';

export default function ResultPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('last_result');
    if (stored) {
      setResult(JSON.parse(stored));
    } else {
      // Generate fallback mock
      setResult({
        application_id: id,
        decision: 'Approve',
        alternative_credit_score: 82,
        risk_band: 'Low Risk',
        behavior_repayment_score: 87,
        income_affordability_score: 74,
        approval_probability: 0.79,
        top_reason_1: 'Consistent electricity bill payments over 12 months',
        top_reason_2: 'Regular mobile recharge pattern indicates stable income',
        suggestions: ['Maintain regular utility payments', 'Continue consistent mobile recharge patterns'],
        fairness_flag: false,
      });
    }
  }, [id]);

  if (!result) {
    return (
      <div className="bg-gradient-page" style={{ minHeight: '100vh' }}>
        <Navbar />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <div className="spinner spinner-dark" style={{ width: 40, height: 40 }} />
        </div>
      </div>
    );
  }

  const score = result.alternative_credit_score;
  const decision = result.decision;
  const isApproved = decision === 'Approve';
  const isReview = decision === 'Human Review';
  const isRejected = decision === 'Reject';

  const decisionConfig = {
    Approve: { bg: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)', color: '#065F46', icon: CheckCircle, text: 'Application Approved' },
    'Human Review': { bg: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)', color: '#92400E', icon: Clock, text: 'Referred for Human Review' },
    Reject: { bg: 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)', color: '#991B1B', icon: XCircle, text: 'Application Not Approved' },
  };

  const cfg = decisionConfig[decision] || decisionConfig.Approve;
  const DecIcon = cfg.icon;

  return (
    <div className="bg-gradient-page" style={{ minHeight: '100vh' }}>
      <Navbar />

      <main style={{ maxWidth: 800, margin: '0 auto', padding: '32px 32px 64px', position: 'relative', zIndex: 1 }}>
        {/* Decision Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          style={{
            background: cfg.bg,
            borderRadius: 20,
            padding: '32px 36px',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            marginBottom: 28,
          }}
        >
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(255,255,255,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <DecIcon size={28} style={{ color: cfg.color }} />
          </div>
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', color: cfg.color, marginBottom: 4 }}>
              {cfg.text}
            </h2>
            <p style={{ fontSize: '0.85rem', color: cfg.color, opacity: 0.7 }}>
              Application {result.application_id} · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </motion.div>

        {/* Score Gauge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <GlassCard hover={false} style={{ padding: '40px', textAlign: 'center', marginBottom: 24 }}>
            <ScoreGauge score={score} size="lg" animated={true} />
            <div style={{ marginTop: 16 }}>
              <RiskBadge riskBand={result.risk_band} />
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: 12 }}>
              {Math.round(result.approval_probability * 100)}% likelihood of successful repayment
            </p>
          </GlassCard>
        </motion.div>

        {/* Two column info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <GlassCard hover={false} style={{ padding: '28px', height: '100%' }}>
              <h3 style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 700, marginBottom: 16, color: 'var(--color-text-primary)' }}>
                Why this decision
              </h3>
              <ol style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <li style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  {result.top_reason_1}
                </li>
                <li style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  {result.top_reason_2}
                </li>
              </ol>
            </GlassCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <GlassCard hover={false} style={{ padding: '28px', height: '100%' }}>
              <h3 style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 700, marginBottom: 16, color: 'var(--color-text-primary)' }}>
                What you can do
              </h3>
              {result.suggestions && result.suggestions.length > 0 ? (
                <ol style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {result.suggestions.map((s, i) => (
                    <li key={i} style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                      {s}
                    </li>
                  ))}
                </ol>
              ) : (
                <p style={{ fontSize: '0.9rem', color: 'var(--color-success)' }}>
                  Applicant profile meets all criteria. No further action needed.
                </p>
              )}
            </GlassCard>
          </motion.div>
        </div>

        {/* Fairness Flag */}
        {result.fairness_flag && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            style={{ marginBottom: 24 }}
          >
            <AlertBanner
              type="fairness"
              message="Fairness alert: demographic disparity detected. This case has been flagged for officer review."
              dismissible={false}
            />
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          style={{ display: 'flex', gap: 14, justifyContent: 'center' }}
        >
          <Link to={`/explain/${result.application_id}`} className="btn btn-outline">
            <BarChart3 size={18} /> View Score Breakdown
          </Link>
          <Link to="/apply" className="btn btn-primary">
            <FilePlus size={18} /> Submit Another Application
          </Link>
          <button className="btn btn-ghost">
            <Bookmark size={18} /> Save to Dashboard
          </button>
        </motion.div>
      </main>
    </div>
  );
}
