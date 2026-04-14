import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { User, Lock, Eye, EyeOff, Shield, TrendingUp, Users } from 'lucide-react';
import { login } from '../api';
import { useToast } from '../components/Toast';
import GlassCard from '../components/ui/GlassCard';

export default function LoginPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      officer_id: 'agent@example.com',
      password: 'password-12345'
    }
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await login({ officer_id: data.officer_id, password: data.password });
      localStorage.setItem('token', res.token);
      localStorage.setItem('officer', JSON.stringify(res.officer));
      toast.success('Welcome back, ' + res.officer.name + '!');
      navigate('/home');
    } catch (err) {
      toast.error('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--color-bg)' }}>
      {/* Left Panel — Visual */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7 }}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '48px',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #EEF0FD 0%, #F0F2FF 50%, #F5F3FF 100%)',
        }}
      >
        {/* Gradient blobs */}
        <div style={{
          position: 'absolute', top: '-20%', left: '-10%', width: '60%', height: '60%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(91, 110, 232, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-15%', right: '-5%', width: '50%', height: '50%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(167, 139, 250, 0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 500, textAlign: 'center' }}>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '2.8rem',
              color: 'var(--color-text-primary)',
              marginBottom: 12,
              lineHeight: 1.15,
            }}
          >
            Fair Credit for<br />Every Indian
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem', marginBottom: 40, lineHeight: 1.6 }}
          >
            AI-powered loan decisions for those the system has left behind
          </motion.p>

          {/* Floating Score Card */}
          <motion.div
            initial={{ opacity: 0, y: 30, rotate: 0 }}
            animate={{ opacity: 1, y: 0, rotate: -8 }}
            transition={{ delay: 0.5, duration: 0.8, type: 'spring' }}
            style={{ display: 'inline-block' }}
          >
            <div style={{
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.9)',
              borderRadius: 24,
              padding: '32px 40px',
              boxShadow: '0 20px 60px rgba(91, 110, 232, 0.15), 0 0 0 1px rgba(255,255,255,0.5) inset',
              textAlign: 'center',
              minWidth: 280,
            }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                Alternative Credit Score
              </p>
              <p style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '4rem',
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                lineHeight: 1,
                marginBottom: 12,
              }}>
                82
              </p>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 16px', borderRadius: 999,
                background: '#D1FAE5', color: '#065F46',
                fontSize: '0.8rem', fontWeight: 600, marginBottom: 16,
              }}>
                <Shield size={13} /> Low Risk · Approved
              </span>

              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 16 }}>
                {[
                  { label: 'Behavior', value: 87, icon: TrendingUp },
                  { label: 'Income', value: 74, icon: TrendingUp },
                  { label: 'Fairness', value: '✓', icon: Shield },
                ].map((s, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 2 }}>
                      {s.value}
                    </p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* User stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 32 }}
          >
            <div style={{ display: 'flex' }}>
              {['#5B6EE8', '#A78BFA', '#10B981'].map((c, i) => (
                <div key={i} style={{
                  width: 28, height: 28, borderRadius: '50%', background: c,
                  border: '2px solid white', marginLeft: i > 0 ? -8 : 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.6rem', color: 'white', fontWeight: 700,
                }}>
                  {['PS', 'RK', 'MD'][i]}
                </div>
              ))}
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
              2,400+ applications processed
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* Right Panel — Form */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7 }}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '48px',
          background: 'white',
        }}
      >
        <div style={{ width: '100%', maxWidth: 420 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '0.85rem', fontWeight: 700,
            }}>
              AI
            </div>
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Smart Automaters
            </span>
          </div>

          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', marginBottom: 8 }}>
            Welcome back, Officer
          </h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 36 }}>
            Sign in to your account
          </p>

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Officer ID */}
            <div style={{ marginBottom: 20 }}>
              <label className="form-label" htmlFor="officer_id">Officer ID</label>
              <div className="form-input-icon-wrapper">
                <User size={18} className="icon-left" />
                <input
                  id="officer_id"
                  className={`form-input ${errors.officer_id ? 'error' : ''}`}
                  placeholder="Enter your officer ID"
                  {...register('officer_id', { required: 'Officer ID is required' })}
                />
              </div>
              {errors.officer_id && <p className="form-error">{errors.officer_id.message}</p>}
            </div>

            {/* Password */}
            <div style={{ marginBottom: 12 }}>
              <label className="form-label" htmlFor="password">Password</label>
              <div className="form-input-icon-wrapper">
                <Lock size={18} className="icon-left" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input ${errors.password ? 'error' : ''}`}
                  placeholder="Enter your password"
                  {...register('password', { required: 'Password is required' })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="icon-right"
                  style={{ background: 'none', border: 'none' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="form-error">{errors.password.message}</p>}
            </div>

            <div style={{ textAlign: 'right', marginBottom: 28 }}>
              <a href="#" style={{ fontSize: '0.85rem', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 500 }}>
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : 'Sign In'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 28, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
            New officer?{' '}
            <Link to="/signup" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
              Request access →
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
