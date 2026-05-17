import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, XCircle, ArrowRight, BarChart3, FilePlus, Bookmark } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import GlassCard from '../components/ui/GlassCard';
import ScoreGauge from '../components/ui/ScoreGauge';
import { RiskBadge } from '../components/ui/Badge';
import AlertBanner from '../components/ui/AlertBanner';
import { getApplication } from '../api';
import { useToast } from '../components/Toast';

export default function ResultPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        setLoading(true);
        // Try to get from sessionStorage first (for immediate feedback after submission)
        const stored = sessionStorage.getItem('last_result');
        if (stored) {
          setResult(JSON.parse(stored));
          setLoading(false);
          return;
        }
        
        // Then fetch from backend
        const data = await getApplication(id);
        setResult({
          application_id: data.application_id,
          decision: data.decision,
          alternative_credit_score: data.alternative_credit_score,
          risk_band: data.risk_band,
          behavior_repayment_score: data.behavior_repayment_score,
          income_affordability_score: data.income_affordability_score,
          approval_probability: data.approval_probability,
          top_reason_1: data.top_reason_1,
          top_reason_2: data.top_reason_2,
          suggestions: data.suggestions || [],
          fairness_flag: data.fairness_flag,
          shap_top_features: data.shap_top_features || {},
          debt_to_income: data.debt_to_income,
          household_burden: data.household_burden,
          employment_stability: data.employment_stability,
          combined_score: data.combined_score,
          ...data,
        });
      } catch (err) {
        console.error('Failed to fetch application:', err);
        toast.error('Failed to load application details');
        // Don't set a fallback, let user see the error
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchResult();
    }
  }, [id, toast]);

  if (loading) {
    return (
      <div className="bg-gradient-page" style={{ minHeight: '100vh' }}>
        <Navbar />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <div className="spinner spinner-dark" style={{ width: 40, height: 40 }} />
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-gradient-page" style={{ minHeight: '100vh' }}>
        <Navbar />
        <main style={{ maxWidth: 800, margin: '0 auto', padding: '32px 32px 64px', position: 'relative', zIndex: 1 }}>
          <GlassCard>
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)' }}>Application not found</p>
              <button
                onClick={() => navigate('/dashboard')}
                className="btn btn-primary"
                style={{ marginTop: '20px' }}
              >
                Back to Dashboard
              </button>
            </div>
          </GlassCard>
        </main>
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

        {/* Documents Uploaded Summary */}
        {result.data_sources_used && Object.keys(result.data_sources_used).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            style={{ marginBottom: 24 }}
          >
            <GlassCard hover={false} style={{ padding: '28px', background: 'rgba(16, 185, 129, 0.04)', borderLeft: '4px solid #10B981' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700, marginBottom: 16, color: '#065F46' }}>
                ✓ Documents Uploaded
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {Object.entries(result.data_sources_used).map(([field, source]) => (
                  source !== 'not_provided' && (
                    <span key={field} style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      padding: '6px 12px',
                      borderRadius: 12,
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#065F46',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                    }}>
                      {field.replace(/_/g, ' ')} {source === 'document' ? '📄' : '✋'}
                    </span>
                  )
                ))}
              </div>
            </GlassCard>
          </motion.div>
        )}

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
          <button 
            onClick={() => {
              sessionStorage.removeItem('intake_form_data');
              sessionStorage.removeItem('last_result');
              toast.success('Application saved to dashboard!');
              navigate('/dashboard');
            }}
            className="btn btn-ghost"
          >
            <Bookmark size={18} /> Save to Dashboard
          </button>
        </motion.div>
      </main>
    </div>
  );
}
