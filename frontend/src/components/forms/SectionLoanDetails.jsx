import { motion } from 'framer-motion';

export default function SectionLoanDetails({ register, errors }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', marginBottom: 8 }}>Loan Details</h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 28 }}>
        Information about the requested loan
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Loan Amount */}
        <div>
          <label className="form-label" htmlFor="loan_amount">Loan Amount (₹) *</label>
          <input
            id="loan_amount"
            type="number"
            className={`form-input ${errors.loan_amount ? 'error' : ''}`}
            placeholder="e.g. 50000"
            {...register('loan_amount', {
              required: 'Loan amount is required',
              min: { value: 5000, message: 'Minimum ₹5,000' },
            })}
          />
          {errors.loan_amount && <p className="form-error">{errors.loan_amount.message}</p>}
        </div>

        {/* Loan Term */}
        <div>
          <label className="form-label" htmlFor="loan_term">Loan Term (Months) *</label>
          <input
            id="loan_term"
            type="number"
            className={`form-input ${errors.loan_term ? 'error' : ''}`}
            placeholder="6-360"
            {...register('loan_term', {
              required: 'Loan term is required',
              min: { value: 6, message: 'Minimum 6 months' },
              max: { value: 360, message: 'Maximum 360 months' },
            })}
          />
          {errors.loan_term && <p className="form-error">{errors.loan_term.message}</p>}
        </div>

        {/* Loan Purpose */}
        <div style={{ gridColumn: 'span 2' }}>
          <label className="form-label" htmlFor="loan_purpose">Loan Purpose *</label>
          <select
            id="loan_purpose"
            className={`form-input ${errors.loan_purpose ? 'error' : ''}`}
            {...register('loan_purpose', { required: 'Loan purpose is required' })}
          >
            <option value="">Select purpose</option>
            <option value="Agriculture">Agriculture</option>
            <option value="Business">Business</option>
            <option value="Medical">Medical</option>
            <option value="Education">Education</option>
            <option value="Housing">Housing</option>
            <option value="Vehicle">Vehicle</option>
            <option value="Other">Other</option>
          </select>
          {errors.loan_purpose && <p className="form-error">{errors.loan_purpose.message}</p>}
        </div>
      </div>
    </motion.div>
  );
}
