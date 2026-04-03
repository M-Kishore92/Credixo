import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Rocket, BarChart3, Clock, ArrowRight, Eye } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import GlassCard from '../components/ui/GlassCard';
import { DecisionBadge } from '../components/ui/Badge';
import { getApplications } from '../api';

export default function HomePage() {
  const navigate = useNavigate();
  const officer = JSON.parse(localStorage.getItem('officer') || '{}');
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getApplications().then((data) => {
      setApplications(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const pendingCount = applications.filter((a) => a.decision === 'Human Review').length;
  const recentApps = applications.slice(0, 5);

  const quickActions = [
    { title: 'New Application', desc: 'Start a loan assessment', to: '/apply', icon: Rocket, color: 'var(--color-primary)', bg: 'var(--color-primary-soft)' },
    { title: 'View Dashboard', desc: 'Analytics & insights', to: '/dashboard', icon: BarChart3, color: 'var(--color-accent)', bg: 'rgba(167, 139, 250, 0.1)' },
    { title: 'Pending Reviews', desc: `${pendingCount} awaiting decision`, to: '/dashboard', icon: Clock, color: 'var(--color-warning)', bg: 'rgba(245, 158, 11, 0.1)' },
  ];

  return (
    <div className="bg-gradient-page" style={{ minHeight: '100vh' }}>
      <Navbar />

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 32px 64px', position: 'relative', zIndex: 1 }}>
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ marginBottom: 40, position: 'relative' }}
        >
          <div style={{
            background: 'linear-gradient(135deg, rgba(91, 110, 232, 0.06) 0%, rgba(167, 139, 250, 0.06) 100%)',
            borderRadius: 24,
            padding: '48px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Blob */}
            <div style={{
              position: 'absolute', top: '-40%', right: '-10%', width: 400, height: 400,
              borderRadius: '50%', background: 'radial-gradient(circle, rgba(91,110,232,0.1), transparent 70%)',
              pointerEvents: 'none',
            }} />

            <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1 style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '2.5rem',
                  color: 'var(--color-text-primary)',
                  marginBottom: 12,
                }}>
                  Good morning, {officer.name?.split(' ')[0] || 'Officer'}
                </h1>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.05rem' }}>
                  You have <strong style={{ color: 'var(--color-primary)' }}>{pendingCount}</strong> applications pending review today
                </p>
              </div>

              {/* Floating stat cards */}
              <div style={{ display: 'flex', gap: 16 }}>
                <motion.div
                  initial={{ opacity: 0, y: 20, rotate: 0 }}
                  animate={{ opacity: 1, y: 0, rotate: -3 }}
                  transition={{ delay: 0.4, type: 'spring' }}
                >
                  <GlassCard style={{ padding: '20px 24px', minWidth: 160 }} hover={false}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                      Applications Today
                    </p>
                    <p style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', color: 'var(--color-primary)' }}>12</p>
                  </GlassCard>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20, rotate: 0 }}
                  animate={{ opacity: 1, y: 0, rotate: 4 }}
                  transition={{ delay: 0.55, type: 'spring' }}
                >
                  <GlassCard style={{ padding: '20px 24px', minWidth: 160 }} hover={false}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                      Approval Rate
                    </p>
                    <p style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', color: 'var(--color-success)' }}>68%</p>
                  </GlassCard>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 40 }}>
          {quickActions.map((action, i) => (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
            >
              <GlassCard
                onClick={() => navigate(action.to)}
                style={{ padding: '28px', cursor: 'pointer' }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 14, background: action.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 16,
                }}>
                  <action.icon size={24} style={{ color: action.color }} />
                </div>
                <h3 style={{ fontFamily: 'var(--font-body)', fontSize: '1.05rem', fontWeight: 700, marginBottom: 6, color: 'var(--color-text-primary)' }}>
                  {action.title}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 16 }}>
                  {action.desc}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: action.color, fontSize: '0.85rem', fontWeight: 600 }}>
                  Get started <ArrowRight size={16} />
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {/* Recent Applications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <GlassCard hover={false} style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem' }}>Recent Applications</h2>
              <Link to="/dashboard" style={{ fontSize: '0.85rem', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                View all <ArrowRight size={14} />
              </Link>
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton" style={{ height: 56, borderRadius: 12 }} />
                ))}
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>App ID</th>
                    <th>Applicant</th>
                    <th>Score</th>
                    <th>Risk Band</th>
                    <th>Decision</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentApps.map((app) => (
                    <tr key={app.application_id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 500 }}>
                        {app.application_id}
                      </td>
                      <td style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{app.applicant_name}</td>
                      <td>
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontWeight: 600,
                          color: app.alternative_credit_score >= 80 ? 'var(--color-success)' : app.alternative_credit_score >= 40 ? 'var(--color-warning)' : 'var(--color-danger)',
                        }}>
                          {app.alternative_credit_score}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${app.risk_band === 'Low Risk' ? 'badge-low' : app.risk_band === 'Moderate Risk' ? 'badge-moderate' : 'badge-high'}`}>
                          {app.risk_band}
                        </span>
                      </td>
                      <td><DecisionBadge decision={app.decision} /></td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{app.date}</td>
                      <td>
                        <button
                          onClick={() => navigate(`/application/${app.application_id}`)}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '6px 12px' }}
                        >
                          <Eye size={14} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </GlassCard>
        </motion.div>
      </main>
    </div>
  );
}
