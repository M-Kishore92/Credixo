import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle, Clock, XCircle, ArrowRight, BarChart3, FilePlus,
  Bookmark, Scale, PhoneCall, FileText, ChevronDown, ChevronUp,
  ShieldCheck, AlertTriangle
} from 'lucide-react';
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
  const [kfsExpanded, setKfsExpanded] = useState(false);

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

        {/* ── APPROVED ONLY: KFS + Cooling-Off Look-up Period ─────────────────── */}
        {isApproved && result.kfs && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.5 }}
            style={{ marginBottom: 24 }}
          >
            {/* Cooling-Off Banner */}
            {result.cooling_off_expiry && (
              <div style={{
                borderRadius: 12, padding: '14px 20px', marginBottom: 12,
                background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.08))',
                border: '1.5px solid rgba(245,158,11,0.4)',
                display: 'flex', alignItems: 'flex-start', gap: 12,
              }}>
                <Clock size={18} color="#B45309" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#92400E' }}>
                    ⏱ Cooling-Off Look-up Period Active
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#92400E', lineHeight: 1.5 }}>
                    You may exit this loan without penalty by repaying the principal plus proportionate APR 
                    before <strong>{new Date(result.cooling_off_expiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
                    Contact <a href="mailto:grievance.officer@credixo.in" style={{ color: '#B45309' }}>grievance.officer@credixo.in</a> to exercise this right.
                  </p>
                </div>
              </div>
            )}

            {/* KFS Card */}
            <GlassCard hover={false} style={{ padding: '24px 28px' }}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', userSelect: 'none' }}
                onClick={() => setKfsExpanded(x => !x)}
                role="button"
                aria-expanded={kfsExpanded}
                id="kfs-toggle-btn"
              >
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <FileText size={18} color="white" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>
                    Key Fact Statement (KFS)
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                    RBI-mandated disclosure — APR, total cost, fees &amp; EMI schedule
                  </p>
                </div>
                {kfsExpanded ? <ChevronUp size={18} color="var(--color-text-muted)" /> : <ChevronDown size={18} color="var(--color-text-muted)" />}
              </div>

              {kfsExpanded && result.kfs && (
                <div style={{ marginTop: 20, borderTop: '1px solid var(--color-border)', paddingTop: 20 }}>
                  {/* Summary Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
                    {[
                      { label: 'Monthly EMI', value: `₹${result.kfs.monthly_emi?.toLocaleString('en-IN')}` },
                      { label: 'Annual Percentage Rate', value: `${result.kfs.annual_percentage_rate_pct}%` },
                      { label: 'Total Repayment', value: `₹${result.kfs.total_repayment_amount?.toLocaleString('en-IN')}` },
                    ].map(({ label, value }) => (
                      <div key={label} style={{
                        textAlign: 'center', padding: '14px 12px', borderRadius: 12,
                        background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)',
                      }}>
                        <p style={{ margin: '0 0 4px', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
                        <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#065F46' }}>{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Fee Breakdown */}
                  <p style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--color-text-primary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Fee Breakdown</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {result.kfs.fee_schedule && Object.entries(result.kfs.fee_schedule).map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>{k.replace(/_/g, ' ')}</span>
                        <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {typeof v === 'number' ? `₹${v.toLocaleString('en-IN')}` : v}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Net Disbursal */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 10, background: 'rgba(16,185,129,0.1)' }}>
                    <span style={{ fontWeight: 700, color: '#065F46' }}>Net Amount Disbursed to You</span>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: '#065F46' }}>₹{result.kfs.net_disbursal_amount?.toLocaleString('en-IN')}</span>
                  </div>

                  {/* Disbursal notice */}
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 14, padding: '10px 14px', borderRadius: 8, background: 'rgba(99,102,241,0.06)' }}>
                    <ShieldCheck size={15} color="#6366F1" style={{ flexShrink: 0, marginTop: 2 }} />
                    <p style={{ fontSize: '0.78rem', color: '#4338CA', margin: 0, lineHeight: 1.5 }}>
                      In compliance with RBI Digital Lending Directions 2026, disbursement will be made
                      directly and exclusively to your own verified bank account — no third-party or pool-account transfers.
                    </p>
                  </div>
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}

        {/* ── REJECTED: Appeal Button ──────────────────────────────────────────── */}
        {isRejected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.5 }}
            style={{ marginBottom: 24 }}
          >
            <GlassCard hover={false} style={{
              padding: '24px 28px',
              background: 'linear-gradient(135deg, rgba(239,68,68,0.04), rgba(168,85,247,0.04))',
              border: '1.5px solid rgba(239,68,68,0.18)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ padding: 10, borderRadius: 12, background: 'rgba(239,68,68,0.1)' }}>
                  <Scale size={20} color="#DC2626" />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--font-heading)', fontSize: '1rem', color: '#991B1B' }}>
                    Disagree with this decision?
                  </h3>
                  <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#B91C1C', lineHeight: 1.6 }}>
                    You have the right to formally contest this outcome within <strong>90 days</strong>. A Principal Grievance
                    Redressal Officer will review your case alongside the original AI score explanation and respond within 30 days.
                  </p>
                  <Link
                    to={`/appeal/${result.application_id}`}
                    id="appeal-decision-btn"
                    className="btn btn-outline"
                    style={{ borderColor: '#DC2626', color: '#DC2626', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                  >
                    <Scale size={16} /> Submit a Formal Appeal
                  </Link>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}
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

        {/* ── Grievance Officer Footer ───────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          style={{ marginTop: 32 }}
        >
          <div style={{
            borderRadius: 14, padding: '18px 24px',
            background: 'rgba(99,102,241,0.05)',
            border: '1px solid rgba(99,102,241,0.18)',
            display: 'flex', alignItems: 'flex-start', gap: 14,
          }}>
            <PhoneCall size={18} color="#6366F1" style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '0.85rem', color: '#4338CA' }}>
                Grievance Redressal Officer
              </p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#6366F1', lineHeight: 1.6 }}>
                {result.grievance_officer?.name || 'Anita Sharma (Principal GRO)'} ·{' '}
                <a href={`mailto:${result.grievance_officer?.email || 'grievance.officer@credixo.in'}`} style={{ color: '#6366F1' }}>
                  {result.grievance_officer?.email || 'grievance.officer@credixo.in'}
                </a>{' '}
                · 30-day resolution SLA (RBI Digital Lending Directions 2026)
              </p>
            </div>
          </div>
        </motion.div>

      </main>
    </div>
  );
}
