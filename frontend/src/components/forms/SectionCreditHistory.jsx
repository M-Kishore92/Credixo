import { motion } from 'framer-motion';

export default function SectionCreditHistory({ register, errors }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', marginBottom: 8 }}>Credit History</h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 28 }}>
        Existing credit and loan repayment information
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Credit Score Category */}
        <div>
          <label className="form-label" htmlFor="credit_score_category">Credit Score Category</label>
          <select
            id="credit_score_category"
            className="form-input"
            {...register('credit_score_category')}
          >
            <option value="None">None (No CIBIL score)</option>
            <option value="Weak">Weak</option>
            <option value="Moderate">Moderate</option>
            <option value="Good">Good</option>
            <option value="Strong">Strong</option>
          </select>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 6 }}>
            Most rural applicants will have "None" — this is expected and handled by the AI model.
          </p>
        </div>

        {/* Prior Repayment Record */}
        <div>
          <label className="form-label" htmlFor="prior_repayment">Prior Repayment Record</label>
          <select
            id="prior_repayment"
            className="form-input"
            {...register('prior_repayment')}
          >
            <option value="No prior loans">No prior loans</option>
            <option value="Excellent">Excellent (&gt;90%)</option>
            <option value="Good">Good (75–90%)</option>
            <option value="Fair">Fair (50–75%)</option>
            <option value="Poor">Poor (&lt;50%)</option>
          </select>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 6 }}>
            This maps to a 0–1 score: Excellent→0.95, Good→0.82, Fair→0.62, Poor→0.35
          </p>
        </div>
      </div>
    </motion.div>
  );
}
