import { motion } from 'framer-motion';
import { Info, Zap } from 'lucide-react';
import DocumentUploader from './DocumentUploader';

export default function SectionBehavioralSignals({ register, errors, setValue, watch }) {
  const electricityBillAvg = watch('electricity_bill_avg');
  const electricityRegularity = watch('electricity_payment_regularity');
  const utilityConsistency = watch('utility_payment_consistency');
  const govtCategory = watch('govt_socioeconomic_category');

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', marginBottom: 8 }}>Behavioral Signals</h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 20 }}>
        Alternative data that replaces traditional credit scoring
      </p>

      {/* Info box */}
      <div style={{
        padding: '16px 20px',
        borderRadius: 14,
        background: 'rgba(167, 139, 250, 0.08)',
        border: '1px solid rgba(167, 139, 250, 0.2)',
        marginBottom: 28,
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
      }}>
        <Info size={20} style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
          These behavioral signals replace the need for a CIBIL score. Fill in whatever data is available — 
          missing fields will not auto-reject the application.
        </p>
      </div>

      {/* Purple-tinted card background */}
      <div style={{
        background: 'rgba(167, 139, 250, 0.04)',
        border: '1px solid rgba(167, 139, 250, 0.12)',
        borderRadius: 16,
        padding: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <Zap size={18} style={{ color: 'var(--color-accent)' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Core Alternative Data
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Electricity Bill */}
          <div>
            <label className="form-label" htmlFor="electricity_bill_avg">Avg Monthly Electricity Bill (₹)</label>
            <input
              id="electricity_bill_avg"
              type="number"
              className="form-input"
              placeholder="e.g. 500"
              {...register('electricity_bill_avg')}
            />
            <DocumentUploader
              fieldName="electricity_bill_avg"
              label="Upload Electricity Bill"
              extractionPrompt={`This is an electricity bill from India. Extract the total amount due or amount payable for this billing period.
Return the amount as a number in Indian Rupees (no symbols, no commas).
Example: if the bill shows "Total Amount: ₹1,240.50", return {"value": 1240, "confidence": "high", "display": "₹1,240"}
Look for fields labeled: Amount Due, Total Payable, Bill Amount, Net Amount, Current Charges.`}
              setValue={setValue}
              currentValue={electricityBillAvg}
            />
          </div>

          {/* Electricity Regularity */}
          <div>
            <label className="form-label" htmlFor="electricity_payment_regularity">Electricity Payment Regularity</label>
            <select
              id="electricity_payment_regularity"
              className="form-input"
              {...register('electricity_payment_regularity')}
            >
              <option value="">Select...</option>
              <option value="1.0">Always on time</option>
              <option value="0.8">Usually on time</option>
              <option value="0.5">Sometimes late</option>
              <option value="0.2">Often late</option>
            </select>
            <DocumentUploader
              fieldName="electricity_payment_regularity"
              label="Upload Last 3–6 Electricity Bills (for payment pattern)"
              extractionPrompt={`This is one or more electricity bills from India. Determine the payment regularity of this customer.
Look for: payment dates, due dates, late payment charges, disconnection notices, or payment history section.
- If bills are consistently paid before due date with no late fees: return {"value": "1.0", "confidence": "high", "display": "Always on time"}
- If bills are mostly paid on time with occasional delays: return {"value": "0.8", "confidence": "high", "display": "Usually on time"}  
- If there are frequent late payments or late fees: return {"value": "0.5", "confidence": "medium", "display": "Sometimes late"}
- If there are disconnection notices or very frequent late payments: return {"value": "0.2", "confidence": "high", "display": "Often late"}
- If you cannot determine payment pattern: return {"value": null, "confidence": "low", "reason": "payment history not visible"}`}
              setValue={setValue}
              currentValue={electricityRegularity}
            />
          </div>

          {/* Mobile Recharge Amount */}
          <div>
            <label className="form-label" htmlFor="mobile_recharge_amount">Avg Monthly Mobile Recharge (₹)</label>
            <input
              id="mobile_recharge_amount"
              type="number"
              className="form-input"
              placeholder="e.g. 200"
              {...register('mobile_recharge_amount')}
            />
          </div>

          {/* Mobile Recharge Frequency */}
          <div>
            <label className="form-label" htmlFor="mobile_recharge_frequency">Mobile Recharge Frequency/Month</label>
            <input
              id="mobile_recharge_frequency"
              type="number"
              className={`form-input ${errors.mobile_recharge_frequency ? 'error' : ''}`}
              placeholder="1-30"
              {...register('mobile_recharge_frequency', {
                min: { value: 1, message: 'Min 1' },
                max: { value: 30, message: 'Max 30' },
              })}
            />
            {errors.mobile_recharge_frequency && <p className="form-error">{errors.mobile_recharge_frequency.message}</p>}
          </div>

          {/* Utility Consistency */}
          <div>
            <label className="form-label" htmlFor="utility_payment_consistency">Utility Bill Payment Consistency</label>
            <select
              id="utility_payment_consistency"
              className="form-input"
              {...register('utility_payment_consistency')}
            >
              <option value="">Select...</option>
              <option value="1.0">Always</option>
              <option value="0.8">Usually</option>
              <option value="0.5">Sometimes</option>
              <option value="0.2">Often late</option>
            </select>
            <DocumentUploader
              fieldName="utility_payment_consistency"
              label="Upload Utility Bill (water, gas, or any utility)"
              extractionPrompt={`This is a utility bill (water, gas, telephone, or other utility) from India.
Determine whether this customer pays consistently and on time.
Look for: payment history, due dates, late payment surcharges, disconnection notices.
- Consistent on-time payments, no surcharges: {"value": "1.0", "display": "Always on time"}
- Mostly on time, rare delays: {"value": "0.8", "display": "Usually on time"}
- Frequent delays or surcharges visible: {"value": "0.5", "display": "Sometimes late"}
- Disconnection or very frequent non-payment: {"value": "0.2", "display": "Often late"}
- Cannot determine: {"value": null, "confidence": "low", "reason": "payment history not visible"}`}
              setValue={setValue}
              currentValue={utilityConsistency}
            />
          </div>

          {/* Govt Category */}
          <div>
            <label className="form-label" htmlFor="govt_socioeconomic_category">Govt. Socioeconomic Category</label>
            <select
              id="govt_socioeconomic_category"
              className="form-input"
              {...register('govt_socioeconomic_category')}
            >
              <option value="">Select...</option>
              <option value="BPL">BPL (Below Poverty Line)</option>
              <option value="APL">APL (Above Poverty Line)</option>
              <option value="None">None</option>
            </select>
            <DocumentUploader
              fieldName="govt_socioeconomic_category"
              label="Upload Ration Card"
              extractionPrompt={`This is an Indian government ration card. Extract the category of the card holder.
Look for the card type or category label anywhere on the document.
- If it says BPL, Below Poverty Line, or Antyodaya Anna Yojana (AAY): {"value": "BPL", "confidence": "high", "display": "BPL — Below Poverty Line"}
- If it says APL, Above Poverty Line, or Priority Household (PHH): {"value": "APL", "confidence": "high", "display": "APL — Above Poverty Line"}
- If category is not visible or unclear: {"value": null, "confidence": "low", "reason": "category not found"}`}
              setValue={setValue}
              currentValue={govtCategory}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
