import { motion } from 'framer-motion';

export default function SectionIncome({ register, errors }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', marginBottom: 8 }}>Household & Income</h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 28 }}>
        Employment and income details of the applicant
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Employment Type */}
        <div style={{ gridColumn: 'span 2' }}>
          <label className="form-label" htmlFor="employment_type">Employment Type *</label>
          <select
            id="employment_type"
            className={`form-input ${errors.employment_type ? 'error' : ''}`}
            {...register('employment_type', { required: 'Employment type is required' })}
          >
            <option value="">Select employment type</option>
            <option value="Salaried">Salaried</option>
            <option value="Self-employed">Self-employed</option>
            <option value="Farmer">Farmer</option>
            <option value="Daily wage">Daily wage</option>
          </select>
          {errors.employment_type && <p className="form-error">{errors.employment_type.message}</p>}
        </div>

        {/* Monthly Income */}
        <div>
          <label className="form-label" htmlFor="monthly_income">Applicant Monthly Income (₹) *</label>
          <input
            id="monthly_income"
            type="number"
            className={`form-input ${errors.monthly_income ? 'error' : ''}`}
            placeholder="e.g. 15000"
            {...register('monthly_income', {
              required: 'Monthly income is required',
              min: { value: 0, message: 'Cannot be negative' },
            })}
          />
          {errors.monthly_income && <p className="form-error">{errors.monthly_income.message}</p>}
        </div>

        {/* Co-applicant Income */}
        <div>
          <label className="form-label" htmlFor="co_applicant_income">Co-applicant Income (₹)</label>
          <input
            id="co_applicant_income"
            type="number"
            className="form-input"
            placeholder="0"
            defaultValue={0}
            {...register('co_applicant_income')}
          />
        </div>

        {/* Dependents */}
        <div>
          <label className="form-label" htmlFor="dependents">Number of Dependents</label>
          <input
            id="dependents"
            type="number"
            className={`form-input ${errors.dependents ? 'error' : ''}`}
            placeholder="0"
            {...register('dependents', {
              min: { value: 0, message: 'Cannot be negative' },
              max: { value: 15, message: 'Maximum 15 dependents' },
            })}
          />
          {errors.dependents && <p className="form-error">{errors.dependents.message}</p>}
        </div>

        {/* Area Type */}
        <div>
          <label className="form-label" htmlFor="area_type">Area Type *</label>
          <select
            id="area_type"
            className={`form-input ${errors.area_type ? 'error' : ''}`}
            {...register('area_type', { required: 'Area type is required' })}
          >
            <option value="">Select area type</option>
            <option value="Urban">Urban</option>
            <option value="Semi-urban">Semi-urban</option>
            <option value="Rural">Rural</option>
          </select>
          {errors.area_type && <p className="form-error">{errors.area_type.message}</p>}
        </div>
      </div>
    </motion.div>
  );
}
