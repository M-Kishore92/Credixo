import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText, CheckCircle, Clock, XCircle, AlertTriangle,
  Download, Search, ChevronLeft, ChevronRight, Eye, TrendingUp,
  BarChart3, Users as UsersIcon, Shield,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line,
} from 'recharts';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';
import GlassCard from '../components/ui/GlassCard';
import StatCard from '../components/ui/StatCard';
import { DecisionBadge } from '../components/ui/Badge';
import AlertBanner from '../components/ui/AlertBanner';
import { getDashboardStats, getApplications } from '../api';

const SCORE_BAR_COLORS = ['#EF4444', '#F59E0B', '#84CC16', '#10B981'];

export default function DashboardPage() {
  const navigate = useNavigate();
  const officer = JSON.parse(localStorage.getItem('officer') || '{}');
  const [stats, setStats] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState('30');
  const perPage = 10;

  useEffect(() => {
    Promise.all([getDashboardStats(), getApplications()])
      .then(([s, a]) => { setStats(s); setApplications(a); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Filter and sort
  const filtered = applications.filter((a) =>
    !searchQuery ||
    a.applicant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.application_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortField === 'date') return dir * (new Date(a.date) - new Date(b.date));
    if (sortField === 'score') return dir * (a.alternative_credit_score - b.alternative_credit_score);
    if (sortField === 'name') return dir * a.applicant_name.localeCompare(b.applicant_name);
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / perPage);
  const paginated = sorted.slice((page - 1) * perPage, page * perPage);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  if (loading) {
    return (
      <div className="bg-gradient-page" style={{ minHeight: '100vh' }}>
        <Navbar />
        <div style={{ display: 'flex' }}>
          <Sidebar />
          <main style={{ flex: 1, padding: 32 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
              {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 20 }} />)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div className="skeleton" style={{ height: 320, borderRadius: 20 }} />
              <div className="skeleton" style={{ height: 320, borderRadius: 20 }} />
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-page" style={{ minHeight: '100vh' }}>
      <Navbar />
      <div style={{ display: 'flex' }}>
        <Sidebar />

        <main style={{ flex: 1, padding: '32px', overflow: 'auto', position: 'relative', zIndex: 1 }}>
          {/* Page Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', marginBottom: 6 }}>
                Officer Dashboard
              </h1>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                Last {period} days · Branch: {officer.branch || 'All'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <select
                className="form-input"
                style={{ width: 'auto', padding: '8px 16px', borderRadius: 12, fontSize: '0.85rem' }}
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
              <button className="btn btn-ghost btn-sm">
                <Download size={16} /> Export CSV
              </button>
            </div>
          </div>

          {/* Dashboard Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'linear-gradient(135deg, rgba(91, 110, 232, 0.06) 0%, rgba(167, 139, 250, 0.06) 100%)',
              borderRadius: 24,
              padding: '40px',
              marginBottom: 32,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{
              position: 'absolute', top: '-30%', right: '-5%', width: 400, height: 400,
              borderRadius: '50%', background: 'radial-gradient(circle, rgba(91,110,232,0.1), transparent 70%)',
              pointerEvents: 'none',
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
              <div>
                <p style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '3.5rem',
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  lineHeight: 1, marginBottom: 8,
                }}>
                  {stats?.total?.toLocaleString() || '2,847'}
                </p>
                <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 12 }}>
                  Applications processed
                </p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  {['#FairCredit', '#AlternativeScore', '#RuralIndia'].map((tag) => (
                    <span key={tag} style={{
                      padding: '4px 12px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600,
                      background: 'var(--color-primary-soft)', color: 'var(--color-primary)',
                    }}>{tag}</span>
                  ))}
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  Powerful AI for inclusive lending
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                  <div style={{ display: 'flex' }}>
                    {['#5B6EE8', '#A78BFA', '#10B981'].map((c, i) => (
                      <div key={i} style={{
                        width: 24, height: 24, borderRadius: '50%', background: c,
                        border: '2px solid white', marginLeft: i > 0 ? -6 : 0,
                        fontSize: '0.55rem', color: 'white', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {['SA', 'WF', 'AI'][i]}
                      </div>
                    ))}
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Team Smart Automaters · Wadhwani Foundation 2025
                  </span>
                </div>
              </div>

              {/* Floating cards */}
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                {[
                  { label: 'Approval Rate', value: `${stats?.approval_rate || 67.9}%`, rotate: -4 },
                  { label: 'Avg Score', value: stats?.avg_score || 67, rotate: 2 },
                  { label: 'Fairness Flags', value: stats?.fairness_flags || 23, rotate: -2 },
                ].map((card, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0, rotate: card.rotate }}
                    transition={{ delay: 0.3 + i * 0.1, type: 'spring' }}
                  >
                    <GlassCard hover={false} style={{ padding: '20px', minWidth: 140, textAlign: 'center' }}>
                      <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                        {card.label}
                      </p>
                      <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', color: 'var(--color-text-primary)' }}>
                        {card.value}
                      </p>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
            <StatCard label="Total Applications" value={stats?.total || 0} trend="+12%" trendDirection="up" icon={FileText} color="var(--color-primary)" delay={0} />
            <StatCard label="Approved" value={`${stats?.approved_pct || 0}%`} trend="+5%" trendDirection="up" icon={CheckCircle} color="var(--color-success)" delay={1} />
            <StatCard label="Human Review" value={`${stats?.human_review_pct || 0}%`} trend="-3%" trendDirection="down" icon={Clock} color="var(--color-warning)" delay={2} />
            <StatCard label="Rejected" value={`${stats?.rejected_pct || 0}%`} trend="-2%" trendDirection="down" icon={XCircle} color="var(--color-danger)" delay={3} />
          </div>

          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
            {/* Donut Chart */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <GlassCard hover={false} style={{ padding: '28px' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', marginBottom: 20 }}>
                  Decision Breakdown
                </h3>
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats?.decision_breakdown || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {(stats?.decision_breakdown || []).map((e, i) => (
                          <Cell key={i} fill={e.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid #E2E8F0', borderRadius: 12, fontSize: '0.85rem' }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        iconType="circle"
                        wrapperStyle={{ fontSize: '0.8rem' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </motion.div>

            {/* Bar Chart */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <GlassCard hover={false} style={{ padding: '28px' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', marginBottom: 20 }}>
                  Score Distribution
                </h3>
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.score_distribution || []}>
                      <XAxis dataKey="range" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid #E2E8F0', borderRadius: 12, fontSize: '0.85rem' }}
                      />
                      <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={45}>
                        {(stats?.score_distribution || []).map((e, i) => (
                          <Cell key={i} fill={SCORE_BAR_COLORS[i]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </motion.div>
          </div>

          {/* Fairness Heatmap */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <GlassCard hover={false} style={{ padding: '28px', marginBottom: 32 }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', marginBottom: 20 }}>
                Approval Rates by Demographic Group
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Gender</th>
                      <th>Urban</th>
                      <th>Semi-urban</th>
                      <th>Rural</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats?.fairness_heatmap && Object.entries(stats.fairness_heatmap).map(([gender, areas]) => (
                      <tr key={gender}>
                        <td style={{ fontWeight: 600 }}>{gender}</td>
                        {['Urban', 'Semi-urban', 'Rural'].map((area) => {
                          const val = areas[area] || 0;
                          const overall = stats.overall_approval_rate || 67.9;
                          const deviation = Math.abs(val - overall);
                          const isFlag = deviation > 10;
                          const bg = val >= 70 ? 'rgba(16, 185, 129, 0.12)' : val >= 60 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)';
                          return (
                            <td key={area} style={{ background: isFlag ? 'rgba(245, 158, 11, 0.15)' : bg, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                              {val}%
                              {isFlag && <AlertTriangle size={13} style={{ marginLeft: 6, color: 'var(--color-warning)' }} />}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </motion.div>

          {/* Drift Alert */}
          {stats?.drift_detected && (
            <div style={{ marginBottom: 24 }}>
              <AlertBanner
                type="drift"
                message="Model drift detected — feature distributions have shifted since last month. Retraining recommended."
              />
            </div>
          )}

          {/* Applications Table */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
            <GlassCard hover={false} style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem' }}>
                  Recent Applications
                </h3>
                <div className="form-input-icon-wrapper" style={{ width: 280 }}>
                  <Search size={16} className="icon-left" />
                  <input
                    className="form-input"
                    placeholder="Search by name or ID..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>App ID</th>
                      <th style={{ cursor: 'pointer' }} onClick={() => handleSort('name')}>
                        Applicant {sortField === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                      </th>
                      <th>Employment</th>
                      <th style={{ cursor: 'pointer' }} onClick={() => handleSort('score')}>
                        Score {sortField === 'score' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                      </th>
                      <th>Risk Band</th>
                      <th>Decision</th>
                      <th style={{ cursor: 'pointer' }} onClick={() => handleSort('date')}>
                        Date {sortField === 'date' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                      </th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((app) => (
                      <tr key={app.application_id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/application/${app.application_id}`)}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 500 }}>{app.application_id}</td>
                        <td style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{app.applicant_name}</td>
                        <td>{app.employment_type}</td>
                        <td>
                          <span style={{
                            fontFamily: 'var(--font-mono)', fontWeight: 700,
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
                          <button className="btn btn-ghost btn-sm" style={{ padding: '6px 12px' }} onClick={(e) => { e.stopPropagation(); navigate(`/application/${app.application_id}`); }}>
                            <Eye size={14} /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 20 }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </GlassCard>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
