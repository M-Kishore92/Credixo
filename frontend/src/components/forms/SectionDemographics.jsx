import { motion } from 'framer-motion';

export default function SectionDemographics({ register, errors }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', marginBottom: 8 }}>Applicant Demographics</h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 28 }}>
        Basic information about the loan applicant
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Full Name */}
        <div style={{ gridColumn: 'span 2' }}>
          <label className="form-label" htmlFor="full_name">Full Name *</label>
          <input
            id="full_name"
            className={`form-input ${errors.full_name ? 'error' : ''}`}
            placeholder="Enter applicant's full name"
            {...register('full_name', { required: 'Full name is required' })}
          />
          {errors.full_name && <p className="form-error">{errors.full_name.message}</p>}
        </div>

        {/* Age */}
        <div>
          <label className="form-label" htmlFor="age">Age *</label>
          <input
            id="age"
            type="number"
            className={`form-input ${errors.age ? 'error' : ''}`}
            placeholder="18-80"
            {...register('age', {
              required: 'Age is required',
              min: { value: 18, message: 'Must be at least 18' },
              max: { value: 80, message: 'Must be 80 or under' },
            })}
          />
          {errors.age && <p className="form-error">{errors.age.message}</p>}
        </div>

        {/* Gender */}
        <div>
          <label className="form-label" htmlFor="gender">Gender *</label>
          <select
            id="gender"
            className={`form-input ${errors.gender ? 'error' : ''}`}
            {...register('gender', { required: 'Gender is required' })}
          >
            <option value="">Select gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
          {errors.gender && <p className="form-error">{errors.gender.message}</p>}
        </div>

        {/* Marital Status */}
        <div>
          <label className="form-label" htmlFor="marital_status">Marital Status *</label>
          <select
            id="marital_status"
            className={`form-input ${errors.marital_status ? 'error' : ''}`}
            {...register('marital_status', { required: 'Marital status is required' })}
          >
            <option value="">Select status</option>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Widowed">Widowed</option>
            <option value="Divorced">Divorced</option>
          </select>
          {errors.marital_status && <p className="form-error">{errors.marital_status.message}</p>}
        </div>

        {/* Education Level */}
        <div>
          <label className="form-label" htmlFor="education">Education Level *</label>
          <select
            id="education"
            className={`form-input ${errors.education ? 'error' : ''}`}
            {...register('education', { required: 'Education level is required' })}
          >
            <option value="">Select education</option>
            <option value="No formal education">No formal education</option>
            <option value="Primary">Primary</option>
            <option value="Secondary">Secondary</option>
            <option value="Graduate">Graduate</option>
            <option value="Post-graduate">Post-graduate</option>
          </select>
          {errors.education && <p className="form-error">{errors.education.message}</p>}
        </div>
      </div>
    </motion.div>
  );
}
