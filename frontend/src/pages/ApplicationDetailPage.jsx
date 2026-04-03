import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, Check, X, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import GlassCard from '../components/ui/GlassCard';
import ScoreGauge from '../components/ui/ScoreGauge';
import { DecisionBadge, RiskBadge } from '../components/ui/Badge';
import AlertBanner from '../components/ui/AlertBanner';
import { getApplication, submitOverride } from '../api';
import { useToast } from '../components/Toast';

export default function ApplicationDetailPage() {
  const { id } = useParams();
  const toast = useToast();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [overrideDecision, setOverrideDecision] = useState('');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showShap, setShowShap] = useState(false);

  useEffect(() => {
    getApplication(id).then((data) => {
      setApp(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const handleOverride = async () => {
    if (!overrideDecision || !overrideNotes.trim()) {
      toast.warning('Please select a decision and add notes.');
      return;
    }
    setSubmitting(true);
    try {
      await submitOverride(id, { decision: overrideDecision, notes: overrideNotes });
      toast.success('Override submitted successfully.');
      setApp((prev) => ({
        ...prev,
        override: { decision: overrideDecision, notes: overrideNotes, timestamp: new Date().toISOString() },
      }));
    } catch {
      toast.error('Failed to submit override.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !app) {
    return (
      <div className="bg-gradient-page" style={{ minHeight: '100vh' }}>
        <Navbar />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <div className="spinner spinner-dark" style={{ width: 40, height: 40 }} />
        </div>
      </div>
    );
  }

  const behavioralSignals = [
    { label: 'Electricity Bill', value: `₹${app.electricity_bill || 'N/A'}`, pct: Math.min(100, (app.electricity_bill || 0) / 20) },
    { label: 'Electricity Regularity', value: app.electricity_regularity || 'N/A', pct: 80 },
    { label: 'Mobile Recharge', value: `₹${app.mobile_recharge_amount || 'N/A'}`, pct: Math.min(100, (app.mobile_recharge_amount || 0) / 8) },
    { label: 'Mobile Frequency', value: `${app.mobile_recharge_frequency || 'N/A'}/mo`, pct: Math.min(100, (app.mobile_recharge_frequency || 0) * 15) },
    { label: 'Utility Consistency', value: app.utility_consistency || 'N/A', pct: 85 },
  ];

  return (
    <div className="bg-gradient-page" style={{ minHeight: '100vh' }}>
      <Navbar />

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
          <Link to="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem', marginBottom: 12 }}>
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', color: 'var(--color-text-primary)' }}>
              {app.application_id}
            </h1>
            <DecisionBadge decision={app.decision} />
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Submitted: {app.date} · Officer: {app.officer_name}
          </p>
        </motion.div>

        {/* Two Column Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 24 }}>
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Applicant Info */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <GlassCard hover={false} style={{ padding: '28px' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', marginBottom: 20 }}>
                  Applicant Information
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {[
                    ['Name', app.applicant_name],
                    ['Age', app.age],
                    ['Gender', app.gender],
                    ['Marital Status', app.marital_status],
                    ['Education', app.education],
                    ['Employment', app.employment_type],
                    ['Monthly Income', `₹${(app.monthly_income || 0).toLocaleString()}`],
                    ['Co-applicant Income', `₹${(app.co_applicant_income || 0).toLocaleString()}`],
                    ['Dependents', app.dependents],
                    ['Area Type', app.area_type],
                    ['Loan Amount', `₹${(app.loan_amount || 0).toLocaleString()}`],
                    ['Loan Term', `${app.loan_term} months`],
                    ['Loan Purpose', app.loan_purpose],
                    ['Credit Score Category', app.credit_score_category],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                        {label}
                      </p>
                      <p style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                        {value || 'N/A'}
                      </p>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>

            {/* Behavioral Signals */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <GlassCard hover={false} style={{ padding: '28px' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', marginBottom: 20 }}>
                  Behavioral Signals
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {behavioralSignals.map((signal) => (
                    <div key={signal.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>{signal.label}</span>
                        <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-text-primary)' }}>{signal.value}</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 999, overflow: 'hidden' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${signal.pct}%` }}
                          transition={{ duration: 0.8, delay: 0.3 }}
                          style={{
                            height: '100%', borderRadius: 999,
                            background: signal.pct > 70 ? 'var(--color-success)' : signal.pct > 40 ? 'var(--color-warning)' : 'var(--color-danger)',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>

            {/* Documents */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <GlassCard hover={false} style={{ padding: '28px' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', marginBottom: 20 }}>
                  Documents Submitted
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {(app.documents || []).map((doc) => (
                    <div key={doc.name} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                      borderRadius: 12, background: doc.available ? 'rgba(16, 185, 129, 0.06)' : 'rgba(148, 163, 184, 0.06)',
                      border: `1px solid ${doc.available ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)'}`,
                    }}>
                      {doc.available ? (
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={14} style={{ color: 'var(--color-success)' }} />
                        </div>
                      ) : (
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(148, 163, 184, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <X size={14} style={{ color: 'var(--color-text-muted)' }} />
                        </div>
                      )}
                      <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 500, color: doc.available ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                        {doc.name}
                      </span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: doc.available ? '#065F46' : 'var(--color-text-muted)' }}>
                        {doc.available ? 'Submitted' : 'Not provided'}
                      </span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Score Summary */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <GlassCard hover={false} style={{ padding: '28px', textAlign: 'center' }}>
                <ScoreGauge score={app.alternative_credit_score} size="md" animated={true} />
                <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 16 }}>
                  <div>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                      {app.behavior_repayment_score}
                    </p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Behavior</p>
                  </div>
                  <div>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-accent)' }}>
                      {app.income_affordability_score}
                    </p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Income</p>
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <RiskBadge riskBand={app.risk_band} />
                </div>
              </GlassCard>
            </motion.div>

            {/* Decision */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <GlassCard hover={false} style={{ padding: '28px' }}>
                <h3 style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>AI Decision</h3>
                <div style={{ marginBottom: 16 }}>
                  <DecisionBadge decision={app.decision} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>Top Reasons:</p>
                  <ol style={{ paddingLeft: 18, fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                    <li>{app.top_reason_1}</li>
                    <li>{app.top_reason_2}</li>
                  </ol>
                </div>
                {app.suggestions && app.suggestions.length > 0 && (
                  <div>
                    <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>Suggestions:</p>
                    <ul style={{ paddingLeft: 18, fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                      {app.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
              </GlassCard>
            </motion.div>

            {/* Officer Override */}
            {app.decision === 'Human Review' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                <GlassCard hover={false} style={{ padding: '28px', border: '2px solid var(--color-warning)' }}>
                  {app.override ? (
                    <>
                      <h3 style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Check size={18} style={{ color: 'var(--color-success)' }} /> Officer Decision Submitted
                      </h3>
                      <div style={{ padding: 16, borderRadius: 12, background: 'var(--color-primary-soft)', marginBottom: 12 }}>
                        <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Decision: {app.override.decision}</p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Notes: {app.override.notes}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Clock size={18} style={{ color: 'var(--color-warning)' }} /> Officer Decision Required
                      </h3>
                      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                        {['Approve', 'Reject'].map((opt) => (
                          <label key={opt} style={{
                            flex: 1, padding: '12px 16px', borderRadius: 12, cursor: 'pointer',
                            textAlign: 'center', fontWeight: 600, fontSize: '0.9rem',
                            border: `2px solid ${overrideDecision === opt ? (opt === 'Approve' ? 'var(--color-success)' : 'var(--color-danger)') : 'var(--color-border)'}`,
                            background: overrideDecision === opt ? (opt === 'Approve' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)') : 'white',
                            color: overrideDecision === opt ? (opt === 'Approve' ? '#065F46' : '#991B1B') : 'var(--color-text-secondary)',
                            transition: 'all 0.2s ease',
                          }}>
                            <input
                              type="radio"
                              name="override"
                              value={opt}
                              checked={overrideDecision === opt}
                              onChange={(e) => setOverrideDecision(e.target.value)}
                              style={{ display: 'none' }}
                            />
                            {opt}
                          </label>
                        ))}
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <label className="form-label" htmlFor="override-notes">Notes (required)</label>
                        <textarea
                          id="override-notes"
                          className="form-input"
                          rows={3}
                          placeholder="Provide reasoning for your decision..."
                          value={overrideNotes}
                          onChange={(e) => setOverrideNotes(e.target.value)}
                          style={{ resize: 'vertical' }}
                        />
                      </div>
                      <button
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                        onClick={handleOverride}
                        disabled={submitting}
                      >
                        {submitting ? <span className="spinner" /> : 'Submit Override'}
                      </button>
                    </>
                  )}
                </GlassCard>
              </motion.div>
            )}

            {/* Fairness */}
            {app.fairness_flag && (
              <AlertBanner type="fairness" message="Fairness alert: demographic disparity detected for this applicant." />
            )}

            {/* Audit Log */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <GlassCard hover={false} style={{ padding: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 700 }}>Audit Log</h3>
                  <button
                    onClick={() => setShowShap(!showShap)}
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '4px 12px' }}
                  >
                    SHAP Values {showShap ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(app.audit_log || []).map((log, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, fontSize: '0.85rem' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {new Date(log.timestamp).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span style={{ color: 'var(--color-text-secondary)' }}>{log.action}</span>
                      <span style={{ color: 'var(--color-text-muted)' }}>({log.officer})</span>
                    </div>
                  ))}
                </div>

                {showShap && app.shap_top_features && (
                  <div style={{ marginTop: 16, padding: 16, borderRadius: 12, background: 'rgba(238, 240, 253, 0.5)' }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 10 }}>SHAP Feature Importance:</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {Object.entries(app.shap_top_features).map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                          <span style={{ color: 'var(--color-text-secondary)' }}>{k}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: v >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                            {v >= 0 ? '+' : ''}{v}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
