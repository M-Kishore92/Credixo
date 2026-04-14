import { motion } from 'framer-motion';
import DocumentUploader from './DocumentUploader';

export default function SectionIncome({ register, errors, setValue, watch }) {
  const applicantIncome = watch('applicant_income');
  const coapplicantIncome = watch('coapplicant_income');

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', marginBottom: 8 }}>Household & Income</h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 28 }}>
        Employment and income details of the applicant
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Monthly Income */}
        <div>
          <label className="form-label" htmlFor="applicant_income">Applicant Monthly Income (₹) *</label>
          <input
            id="applicant_income"
            type="number"
            className={`form-input ${errors.applicant_income ? 'error' : ''}`}
            placeholder="e.g. 15000"
            {...register('applicant_income', {
              required: 'Monthly income is required',
              min: { value: 0, message: 'Cannot be negative' },
            })}
          />
          {errors.applicant_income && <p className="form-error">{errors.applicant_income.message}</p>}
          <DocumentUploader
            fieldName="applicant_income"
            label="Upload No Income Certificate or Salary Slip"
            extractionPrompt={`This is either a No Income Certificate issued by an Indian government authority (Tahsildar/Revenue Officer)
or a salary slip from an Indian employer.
Extract the declared monthly income of the individual.
- For No Income Certificate: the declared income is often 0 or a very small amount. Return that amount.
- For salary slip: look for Net Pay, Take Home, or Net Salary for the month.
Return the monthly amount as a number in Rupees (no symbols, no commas).
Example: {"value": 8500, "confidence": "high", "display": "₹8,500/month"}
If income is explicitly stated as zero: {"value": 0, "confidence": "high", "display": "₹0 — No Income Certificate"}
If amount not found: {"value": null, "confidence": "low", "reason": "amount not visible"}`}
            setValue={setValue}
            currentValue={applicantIncome}
          />
        </div>

        {/* Co-applicant Income */}
        <div>
          <label className="form-label" htmlFor="coapplicant_income">Co-applicant Monthly Income (₹)</label>
          <input
            id="coapplicant_income"
            type="number"
            className="form-input"
            placeholder="0"
            defaultValue={0}
            {...register('coapplicant_income', {
              min: { value: 0, message: 'Cannot be negative' },
            })}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 6 }}>
            Enter 0 if there is no co-applicant. Include spouse, parent, or any household member contributing to loan repayment.
          </p>
          <DocumentUploader
            fieldName="coapplicant_income"
            label="Upload Co-applicant Salary Slip or Income Proof"
            extractionPrompt={`This is a salary slip or income proof document for a co-applicant on an Indian loan application.
Extract the monthly take-home or net income.
Look for: Net Pay, Take Home Salary, Net Amount, Monthly Income.
Return as a number in Rupees only.
Example: {"value": 12000, "confidence": "high", "display": "₹12,000/month"}
If not found: {"value": null, "confidence": "low", "reason": "income amount not visible"}`}
            setValue={setValue}
            currentValue={coapplicantIncome}
          />
        </div>

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

        {/* Dependents */}
        <div>
          <label className="form-label" htmlFor="dependents">Number of Financial Dependents</label>
          <input
            id="dependents"
            type="number"
            step="1"
            className={`form-input ${errors.dependents ? 'error' : ''}`}
            placeholder="0"
            {...register('dependents', {
              min: { value: 0, message: 'Cannot be negative' },
              max: { value: 15, message: 'Max 15' },
            })}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 6 }}>
            Count all household members financially dependent on the applicant — children, elderly parents, non-earning spouse.
          </p>
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
