import { motion } from 'framer-motion';
import DocumentUploader from './DocumentUploader';

export default function SectionCreditHistory({ register, errors, setValue, watch }) {
  const priorRepaymentValue = watch('prior_repayment_record');

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
          <label className="form-label" htmlFor="prior_repayment_record">Prior Loan Repayment Record</label>
          <select
            id="prior_repayment_record"
            className="form-input"
            {...register('prior_repayment_record')}
          >
            <option value="">No prior loans — first time borrower</option>
            <option value="0.95">Excellent — repaid fully and on time</option>
            <option value="0.82">Good — minor delays, fully repaid</option>
            <option value="0.62">Fair — partial delays or partial repayment</option>
            <option value="0.35">Poor — frequent defaults or non-repayment</option>
          </select>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 6 }}>
            Select 'No prior loans' if this is the applicant's first formal or informal loan. This field is optional but improves score accuracy.
          </p>

          <DocumentUploader
            fieldName="prior_repayment_record"
            label="Upload Bank Passbook or Loan Repayment Statement"
            extractionPrompt={`This is an Indian bank passbook or loan repayment statement.
Assess the loan repayment behavior of this account holder.
Look for: EMI entries, loan repayment transactions, any missed payment notations, or settlement entries.
- Regular EMI payments on time, no gaps: {"value": 0.95, "confidence": "high", "display": "Excellent — repaid fully on time"}
- Regular payments with 1-2 minor delays: {"value": 0.82, "confidence": "high", "display": "Good — minor delays, fully repaid"}
- Some EMI gaps, partial repayments visible: {"value": 0.62, "confidence": "medium", "display": "Fair — partial delays"}
- Frequent missed EMIs or settlement entries: {"value": 0.35, "confidence": "high", "display": "Poor — frequent defaults"}
- No loan transactions visible (first-time borrower): {"value": null, "confidence": "high", "display": "No prior loans"}`}
            setValue={setValue}
            currentValue={priorRepaymentValue}
          />
        </div>
      </div>
    </motion.div>
  );
}
