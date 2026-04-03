import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { signup } from '../api';
import { useToast } from '../components/Toast';

export default function SignupPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const password = watch('password');

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await signup(data);
      toast.success('Account created successfully! Please sign in.');
      navigate('/');
    } catch (err) {
      toast.error('Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-page" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.9)',
          borderRadius: 24,
          padding: '48px 44px',
          maxWidth: 480,
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.06)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
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

        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', marginBottom: 8 }}>
          Create Officer Account
        </h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 32 }}>
          Join the AI-powered lending platform
        </p>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ display: 'grid', gap: 18 }}>
            {/* Full Name */}
            <div>
              <label className="form-label" htmlFor="signup_name">Full Name *</label>
              <input
                id="signup_name"
                className={`form-input ${errors.name ? 'error' : ''}`}
                placeholder="Enter your full name"
                {...register('name', { required: 'Full name is required' })}
              />
              {errors.name && <p className="form-error">{errors.name.message}</p>}
            </div>

            {/* Officer ID */}
            <div>
              <label className="form-label" htmlFor="signup_officer_id">Officer ID *</label>
              <input
                id="signup_officer_id"
                className={`form-input ${errors.officer_id ? 'error' : ''}`}
                placeholder="Min 4 characters"
                {...register('officer_id', {
                  required: 'Officer ID is required',
                  minLength: { value: 4, message: 'Min 4 characters' },
                })}
              />
              {errors.officer_id && <p className="form-error">{errors.officer_id.message}</p>}
            </div>

            {/* Branch Name */}
            <div>
              <label className="form-label" htmlFor="signup_branch">Branch Name *</label>
              <input
                id="signup_branch"
                className={`form-input ${errors.branch ? 'error' : ''}`}
                placeholder="e.g. Chennai South"
                {...register('branch', { required: 'Branch name is required' })}
              />
              {errors.branch && <p className="form-error">{errors.branch.message}</p>}
            </div>

            {/* Region */}
            <div>
              <label className="form-label" htmlFor="signup_region">Region *</label>
              <select
                id="signup_region"
                className={`form-input ${errors.region ? 'error' : ''}`}
                {...register('region', { required: 'Region is required' })}
              >
                <option value="">Select region</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Andhra Pradesh">Andhra Pradesh</option>
                <option value="Telangana">Telangana</option>
                <option value="Other">Other</option>
              </select>
              {errors.region && <p className="form-error">{errors.region.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="form-label" htmlFor="signup_password">Password *</label>
              <div className="form-input-icon-wrapper">
                <input
                  id="signup_password"
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input ${errors.password ? 'error' : ''}`}
                  placeholder="Min 8 characters"
                  style={{ paddingLeft: 16 }}
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 8, message: 'Min 8 characters' },
                  })}
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

            {/* Confirm Password */}
            <div>
              <label className="form-label" htmlFor="signup_confirm">Confirm Password *</label>
              <input
                id="signup_confirm"
                type="password"
                className={`form-input ${errors.confirm_password ? 'error' : ''}`}
                placeholder="Re-enter password"
                {...register('confirm_password', {
                  required: 'Please confirm your password',
                  validate: (val) => val === password || 'Passwords do not match',
                })}
              />
              {errors.confirm_password && <p className="form-error">{errors.confirm_password.message}</p>}
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: 28 }}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
          Already have an account?{' '}
          <Link to="/" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
            Sign in →
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
