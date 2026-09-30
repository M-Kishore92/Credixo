import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Scale, CheckCircle2, Clock, AlertTriangle,
  ChevronRight, FileText, ArrowLeft, Send, Info
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import GlassCard from '../components/ui/GlassCard';
import { useToast } from '../components/Toast';
import { API_BASE } from '../api';

const STATUS_STYLES = {
  'None':         { color: '#6B7280', bg: 'rgba(107,114,128,0.1)',  icon: Info,         label: 'No Appeal Filed' },
  'Requested':    { color: '#D97706', bg: 'rgba(217,119,6,0.1)',    icon: Clock,        label: 'Under Consideration' },
  'Under Review': { color: '#2563EB', bg: 'rgba(37,99,235,0.1)',    icon: Scale,        label: 'Being Reviewed' },
  'Resolved':     { color: '#10B981', bg: 'rgba(16,185,129,0.1)',   icon: CheckCircle2, label: 'Resolved' },
};

export default function AppealPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [appealData, setAppealData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    reason: '',
    additional_income_declared: '',
    borrower_notes: '',
    contact_email: '',
    additional_documents: [],
  });

  useEffect(() => {
    fetchAppeal();
  }, [id]);

  async function fetchAppeal() {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/appeal/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setAppealData(data);
    } catch {
      // New appeal — form starts fresh
      setAppealData(null);
    } finally {
      setLoading(false);
    }
  }

  async function submitAppeal(e) {
    e.preventDefault();
    if (!form.reason.trim()) {
      toast.error('Please provide a reason for the appeal.');
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        application_id: id,
        reason: form.reason,
        borrower_notes: form.borrower_notes || null,
        contact_email: form.contact_email || null,
        additional_income_declared: form.additional_income_declared
          ? parseFloat(form.additional_income_declared)
          : null,
        additional_documents: form.additional_documents,
      };
      const res = await fetch(`${API_BASE}/appeal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to submit');
      }
      toast.success('Appeal submitted successfully! You will hear back within 30 days.');
      fetchAppeal();
    } catch (err) {
      toast.error(err.message || 'Failed to submit appeal.');
    } finally {
      setSubmitting(false);
    }
  }

  const hasExistingAppeal = appealData?.appeal_status && appealData.appeal_status !== 'None';

  const statusStyle = hasExistingAppeal
    ? STATUS_STYLES[appealData.appeal_status] || STATUS_STYLES['None']
    : STATUS_STYLES['None'];
  const StatusIcon = statusStyle.icon;

  return (
    <div className="bg-gradient-page" style={{ minHeight: '100vh' }}>
      <Navbar />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 80px', position: 'relative', zIndex: 1 }}>

        {/* Back */}
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
          <Link
            to={`/result/${id}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.9rem',
              color: 'var(--color-text-muted)', textDecoration: 'none', marginBottom: 24 }}
          >
            <ArrowLeft size={16} /> Back to Result
          </Link>
        </motion.div>

        {/* Page Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Scale size={24} color="white" />
            </div>
            <div>
              <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', color: 'var(--color-text-primary)', margin: 0 }}>
                Contest This Decision
              </h1>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '4px 0 0' }}>
                Application {id?.slice(0, 8)}… · Formal Appeal
              </p>
            </div>
          </div>
        </motion.div>

        {/* Status Card (if appeal already filed) */}
        {hasExistingAppeal && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }} style={{ marginBottom: 24 }}>
            <GlassCard hover={false} style={{ padding: '24px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <div style={{ padding: 10, borderRadius: 12, background: statusStyle.bg }}>
                  <StatusIcon size={20} color={statusStyle.color} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: statusStyle.color }}>
                    {statusStyle.label}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Current appeal status
                  </div>
                </div>
                <span style={{
                  marginLeft: 'auto', padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem',
                  fontWeight: 700, background: statusStyle.bg, color: statusStyle.color,
                }}>
                  {appealData.appeal_status}
                </span>
              </div>

              {appealData.appeal_reason && (
                <div style={{ background: 'rgba(0,0,0,0.04)', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0 0 4px', fontWeight: 600 }}>Your reason</p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', margin: 0 }}>{appealData.appeal_reason}</p>
                </div>
              )}

              {appealData.appeal_response && Object.keys(appealData.appeal_response).length > 0 && (
                <div style={{ background: 'rgba(16,185,129,0.06)', borderRadius: 10, padding: '14px 16px', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <p style={{ fontSize: '0.8rem', color: '#065F46', margin: '0 0 4px', fontWeight: 600 }}>Officer response</p>
                  <p style={{ fontSize: '0.9rem', color: '#065F46', margin: 0 }}>{appealData.appeal_response.resolution_notes}</p>
                  <p style={{ fontSize: '0.75rem', color: '#065F46', opacity: 0.7, margin: '6px 0 0' }}>
                    Decision: <strong>{appealData.appeal_response.resolution_decision}</strong> ·{' '}
                    {new Date(appealData.appeal_response.resolved_at).toLocaleDateString('en-IN')}
                  </p>
                </div>
              )}

              {/* Grievance Officer Info */}
              {appealData.grievance_officer && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Assigned Grievance Redressal Officer
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                    {appealData.grievance_officer.name}
                  </p>
                  <p style={{ fontSize: '0.8rem', color: '#6366F1', margin: '2px 0 0' }}>
                    {appealData.grievance_officer.email} · {appealData.grievance_officer.sla_days}-day SLA
                  </p>
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}

        {/* Appeal Form (if no existing appeal or in review state allowing re-submission) */}
        {!hasExistingAppeal && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}>
            <GlassCard hover={false} style={{ padding: '32px' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', color: 'var(--color-text-primary)', marginBottom: 8 }}>
                Submit a Formal Appeal
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 28, lineHeight: 1.6 }}>
                You may contest this decision within <strong>90 days</strong> of the assessment date. A Grievance Redressal Officer 
                will review your appeal alongside the original AI explanations and respond within <strong>30 days</strong>.
              </p>

              <form onSubmit={submitAppeal} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Reason */}
                <div>
                  <label htmlFor="appeal-reason" style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 8, color: 'var(--color-text-primary)' }}>
                    Reason for Appeal <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <textarea
                    id="appeal-reason"
                    rows={4}
                    placeholder="Explain why you believe this decision should be reconsidered. For example: the income figure was incorrect, I have additional repayment records, etc."
                    value={form.reason}
                    onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: 10, resize: 'vertical',
                      border: '1.5px solid var(--color-border)', background: 'rgba(255,255,255,0.5)',
                      fontSize: '0.9rem', color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)',
                      boxSizing: 'border-box', lineHeight: 1.6,
                    }}
                    required
                  />
                </div>

                {/* Additional Income */}
                <div>
                  <label htmlFor="appeal-income" style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 8, color: 'var(--color-text-primary)' }}>
                    Revised Monthly Income (₹) <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>— optional</span>
                  </label>
                  <input
                    id="appeal-income"
                    type="number"
                    min="0"
                    placeholder="e.g. 25000"
                    value={form.additional_income_declared}
                    onChange={e => setForm(f => ({ ...f, additional_income_declared: e.target.value }))}
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: 10,
                      border: '1.5px solid var(--color-border)', background: 'rgba(255,255,255,0.5)',
                      fontSize: '0.9rem', color: 'var(--color-text-primary)', boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Supporting documents */}
                <div>
                  <label htmlFor="appeal-docs" style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 8, color: 'var(--color-text-primary)' }}>
                    Supporting Documents <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>— comma-separated names</span>
                  </label>
                  <input
                    id="appeal-docs"
                    type="text"
                    placeholder="e.g. Bank statement Aug 2026, Salary slip Q1 2026"
                    onChange={e => setForm(f => ({ ...f, additional_documents: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: 10,
                      border: '1.5px solid var(--color-border)', background: 'rgba(255,255,255,0.5)',
                      fontSize: '0.9rem', color: 'var(--color-text-primary)', boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Notes */}
                <div>
                  <label htmlFor="appeal-notes" style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 8, color: 'var(--color-text-primary)' }}>
                    Additional Notes <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>— optional</span>
                  </label>
                  <textarea
                    id="appeal-notes"
                    rows={3}
                    placeholder="Anything else you'd like the reviewing officer to know…"
                    value={form.borrower_notes}
                    onChange={e => setForm(f => ({ ...f, borrower_notes: e.target.value }))}
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: 10, resize: 'vertical',
                      border: '1.5px solid var(--color-border)', background: 'rgba(255,255,255,0.5)',
                      fontSize: '0.9rem', color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)',
                      boxSizing: 'border-box', lineHeight: 1.6,
                    }}
                  />
                </div>

                {/* Contact Email */}
                <div>
                  <label htmlFor="appeal-email" style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 8, color: 'var(--color-text-primary)' }}>
                    Preferred Contact Email <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>— optional</span>
                  </label>
                  <input
                    id="appeal-email"
                    type="email"
                    placeholder="your@email.com"
                    value={form.contact_email}
                    onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: 10,
                      border: '1.5px solid var(--color-border)', background: 'rgba(255,255,255,0.5)',
                      fontSize: '0.9rem', color: 'var(--color-text-primary)', boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Disclaimer */}
                <div style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 16px',
                  borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
                }}>
                  <Info size={16} color="#6366F1" style={{ marginTop: 2, flexShrink: 0 }} />
                  <p style={{ fontSize: '0.8rem', color: '#4338CA', margin: 0, lineHeight: 1.5 }}>
                    Your appeal, along with the original AI-generated score explanation (SHAP values), will be reviewed by a 
                    Principal Grievance Redressal Officer. The officer may approve, uphold the rejection, or request additional documents.
                    The GRO decision is final under the current appeal round.
                  </p>
                </div>

                <button
                  type="submit"
                  id="submit-appeal-btn"
                  className="btn btn-primary"
                  style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8 }}
                  disabled={submitting}
                >
                  {submitting
                    ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Submitting…</>
                    : <><Send size={16} /> Submit Appeal</>
                  }
                </button>
              </form>
            </GlassCard>
          </motion.div>
        )}

        {/* Info Footer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.4 }} style={{ marginTop: 28 }}>
          <GlassCard hover={false} style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <FileText size={18} color="var(--color-text-muted)" />
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
              Read our full <a href="/PRIVACY.md" style={{ color: '#6366F1' }}>Privacy & Data Protection Policy</a> to learn 
              about data retention (5 years under PMLA), your right to erasure, and grievance escalation to the RBI Ombudsman.
            </p>
          </GlassCard>
        </motion.div>

      </main>
    </div>
  );
}
