import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Navbar from '../components/layout/Navbar';
import GlassCard from '../components/ui/GlassCard';
import ScoreGauge from '../components/ui/ScoreGauge';
import Badge from '../components/ui/Badge';

export default function ScoreExplainerPage() {
  const { id } = useParams();
  const [result, setResult] = useState(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('last_result');
    if (stored) {
      setResult(JSON.parse(stored));
    } else {
      setResult({
        application_id: id,
        alternative_credit_score: 82,
        behavior_repayment_score: 87,
        income_affordability_score: 74,
        shap_top_features: {
          'Utility Payment Consistency': 0.22,
          'Mobile Recharge Average': 0.18,
          'Employment Stability': 0.14,
          'Monthly Income': 0.11,
          'Debt-to-Income Ratio': -0.09,
          'Loan Amount Ratio': -0.07,
          'Alternative Credit Score': 0.25,
        },
        data_sources: {
          electricity: true,
          mobile: true,
          utility: true,
          repayment: false,
          govt_survey: true,
        },
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

  const behaviorScore = result.behavior_repayment_score;
  const incomeScore = result.income_affordability_score;
  const finalScore = result.alternative_credit_score;
  const compositeCalc = (behaviorScore * 0.6 + incomeScore * 0.4).toFixed(0);

  // SHAP chart data
  const shapData = Object.entries(result.shap_top_features || {})
    .map(([name, value]) => ({ name, value: +value }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  const dataSourceLabels = {
    electricity: 'Electricity data',
    mobile: 'Mobile data',
    utility: 'Utility history',
    repayment: 'Repayment record',
    govt_survey: 'Govt. survey',
  };

  return (
    <div className="bg-gradient-page" style={{ minHeight: '100vh' }}>
      <Navbar />

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 32px 64px', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 28 }}
        >
          <Link to={`/result/${id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.85rem', marginBottom: 12 }}>
            <ArrowLeft size={16} /> Back to Result
          </Link>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', marginBottom: 6 }}>
            Score Breakdown
          </h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{result.application_id}</span>
          </p>
        </motion.div>

        {/* Sub-score Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <GlassCard hover={false} style={{ padding: '32px', textAlign: 'center' }}>
              <ScoreGauge score={behaviorScore} size="sm" animated={true} label="" />
              <h3 style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 700, marginTop: 12, marginBottom: 6, color: 'var(--color-text-primary)' }}>
                Behavior & Repayment Score
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: 12 }}>
                Based on payment history, utility consistency, repayment record
              </p>
              <Badge type="info" label="60% weight in final score" />
            </GlassCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <GlassCard hover={false} style={{ padding: '32px', textAlign: 'center' }}>
              <ScoreGauge score={incomeScore} size="sm" animated={true} label="" />
              <h3 style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 700, marginTop: 12, marginBottom: 6, color: 'var(--color-text-primary)' }}>
                Income & Affordability Score
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: 12 }}>
                Based on electricity usage, mobile recharge, govt. category
              </p>
              <Badge type="info" label="40% weight in final score" />
            </GlassCard>
          </motion.div>
        </div>

        {/* Formula */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <GlassCard hover={false} style={{ padding: '24px', textAlign: 'center', marginBottom: 28 }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              Composite Score Formula
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 600 }}>
                (<span style={{ color: 'var(--color-primary)' }}>{behaviorScore}</span> × 0.60)
              </span>
              <span style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)' }}>+</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 600 }}>
                (<span style={{ color: 'var(--color-accent)' }}>{incomeScore}</span> × 0.40)
              </span>
              <span style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)' }}>=</span>
              <span style={{
                fontFamily: 'var(--font-heading)', fontSize: '1.8rem',
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                {compositeCalc}
              </span>
            </div>
          </GlassCard>
        </motion.div>

        {/* SHAP Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <GlassCard hover={false} style={{ padding: '32px', marginBottom: 28 }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', marginBottom: 24 }}>
              What influenced this score most
            </h3>
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={shapData} layout="vertical" margin={{ left: 20, right: 30 }}>
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12, fill: '#475569' }}
                    axisLine={false}
                    tickLine={false}
                    width={180}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(255,255,255,0.95)',
                      border: '1px solid #E2E8F0',
                      borderRadius: 12,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      fontSize: '0.85rem',
                    }}
                    formatter={(value) => [`SHAP value: ${value}`, '']}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                    {shapData.map((entry, index) => (
                      <Cell key={index} fill={entry.value >= 0 ? '#10B981' : '#EF4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </motion.div>

        {/* Data Source Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <GlassCard hover={false} style={{ padding: '28px', marginBottom: 28 }}>
            <h3 style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>
              Alternative Data Trace (Evidence Log)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {Object.entries(result.data_sources_used || {}).map(([key, status]) => {
                const labelMap = {
                  electricity_bill_avg: 'Electricity bill amount',
                  electricity_payment_regularity: 'Electricity payment regularity',
                  utility_payment_consistency: 'Utility payment consistency',
                  mobile_recharge_amount: 'Mobile recharge amount',
                  mobile_recharge_frequency: 'Mobile recharge frequency',
                  govt_socioeconomic_category: 'Government category',
                  prior_repayment_record: 'Prior repayment record',
                  coapplicant_income: 'Co-applicant income',
                };

                const isDoc = status === 'document';
                const isManual = status === 'manual';
                const isSkip = status === 'not_provided';

                const bg = isDoc ? 'rgba(16, 185, 129, 0.08)' : isManual ? 'rgba(91, 110, 232, 0.08)' : 'rgba(148, 163, 184, 0.1)';
                const border = isDoc ? 'rgba(16, 185, 129, 0.2)' : isManual ? 'rgba(91, 110, 232, 0.2)' : 'rgba(148, 163, 184, 0.2)';
                const color = isDoc ? '#065F46' : isManual ? 'var(--color-primary)' : 'var(--color-text-muted)';

                return (
                  <div key={key} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 16px', borderRadius: 12,
                    background: bg, border: `1px solid ${border}`,
                  }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                      {labelMap[key] || key}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isDoc ? (
                        <Check size={14} style={{ color: 'var(--color-success)' }} />
                      ) : isSkip? (
                        <X size={14} style={{ color: 'var(--color-text-muted)' }} />
                      ) : null }
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color, textTransform: 'uppercase' }}>
                        {isDoc ? 'Document ✓' : isManual ? 'Manual entry' : 'Not provided'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </motion.div>

        {/* Back button */}
        <div style={{ textAlign: 'center' }}>
          <Link to={`/result/${id}`} className="btn btn-outline">
            <ArrowLeft size={18} /> Back to Result
          </Link>
        </div>
      </main>
    </div>
  );
}
