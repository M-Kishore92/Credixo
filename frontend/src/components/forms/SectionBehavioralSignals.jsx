import { motion } from 'framer-motion';
import { Info, Zap } from 'lucide-react';

export default function SectionBehavioralSignals({ register, errors }) {
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
            <label className="form-label" htmlFor="electricity_bill">Avg Monthly Electricity Bill (₹)</label>
            <input
              id="electricity_bill"
              type="number"
              className="form-input"
              placeholder="e.g. 500"
              {...register('electricity_bill')}
            />
          </div>

          {/* Electricity Regularity */}
          <div>
            <label className="form-label" htmlFor="electricity_regularity">Electricity Payment Regularity</label>
            <select
              id="electricity_regularity"
              className="form-input"
              {...register('electricity_regularity')}
            >
              <option value="">Select...</option>
              <option value="1.0">Always on time</option>
              <option value="0.8">Usually on time</option>
              <option value="0.5">Sometimes late</option>
              <option value="0.2">Often late</option>
            </select>
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
            <label className="form-label" htmlFor="utility_consistency">Utility Bill Payment Consistency</label>
            <select
              id="utility_consistency"
              className="form-input"
              {...register('utility_consistency')}
            >
              <option value="">Select...</option>
              <option value="1.0">Always</option>
              <option value="0.8">Usually</option>
              <option value="0.5">Sometimes</option>
              <option value="0.2">Often late</option>
            </select>
          </div>

          {/* Govt Category */}
          <div>
            <label className="form-label" htmlFor="govt_category">Govt. Socioeconomic Category</label>
            <select
              id="govt_category"
              className="form-input"
              {...register('govt_category')}
            >
              <option value="">Select...</option>
              <option value="BPL">BPL (Below Poverty Line)</option>
              <option value="APL">APL (Above Poverty Line)</option>
              <option value="None">None</option>
            </select>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
