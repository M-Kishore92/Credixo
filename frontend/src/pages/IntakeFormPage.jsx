import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Send } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import GlassCard from '../components/ui/GlassCard';
import StepIndicator from '../components/ui/StepIndicator';
import SectionDemographics from '../components/forms/SectionDemographics';
import SectionIncome from '../components/forms/SectionIncome';
import SectionLoanDetails from '../components/forms/SectionLoanDetails';
import SectionCreditHistory from '../components/forms/SectionCreditHistory';
import SectionBehavioralSignals from '../components/forms/SectionBehavioralSignals';
import SectionDocuments from '../components/forms/SectionDocuments';
import { predict } from '../api';
import { useToast } from '../components/Toast';

const STEPS = [
  'Demographics',
  'Household & Income',
  'Loan Details',
  'Credit History',
  'Behavioral Signals',
];

const STEP_FIELDS = [
  ['full_name', 'age', 'gender', 'marital_status', 'education'],
  ['employment_type', 'applicant_income', 'coapplicant_income', 'dependents', 'area_type'],
  ['loan_amount', 'loan_term', 'loan_purpose'],
  ['credit_score_category', 'prior_repayment_record'],
  ['mobile_recharge_frequency'], // Only basic validation required; other fields are optional
];

const SESSION_KEY = 'intake_form_data';

function generateAppId() {
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `APP-2025-${num}`;
}

export default function IntakeFormPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [appId] = useState(() => generateAppId());

  const saved = sessionStorage.getItem(SESSION_KEY);
  const defaultValues = saved ? JSON.parse(saved) : {};

  const { register, handleSubmit, trigger, watch, setValue, getValues, formState: { errors } } = useForm({
    mode: 'onBlur',
    defaultValues,
  });

  // Save to sessionStorage on changes
  useEffect(() => {
    const subscription = watch((data) => {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const goNext = async () => {
    const fieldsToValidate = STEP_FIELDS[currentStep];
    if (fieldsToValidate.length > 0) {
      const valid = await trigger(fieldsToValidate);
      if (!valid) return;
    }
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // Convert numeric fields from strings to numbers
      const processedData = {
        ...data,
        age: parseInt(data.age) || 0,
        applicant_income: parseFloat(data.applicant_income) || 0,
        coapplicant_income: parseFloat(data.coapplicant_income) || 0,
        dependents: parseInt(data.dependents) || 0,
        loan_amount: parseFloat(data.loan_amount) || 0,
        loan_term: parseInt(data.loan_term) || 0,
        electricity_bill_avg: data.electricity_bill_avg ? parseFloat(data.electricity_bill_avg) : null,
        electricity_payment_regularity: data.electricity_payment_regularity ? parseFloat(data.electricity_payment_regularity) : null,
        mobile_recharge_amount: data.mobile_recharge_amount ? parseFloat(data.mobile_recharge_amount) : null,
        mobile_recharge_frequency: data.mobile_recharge_frequency ? parseFloat(data.mobile_recharge_frequency) : null,
        utility_payment_consistency: data.utility_payment_consistency ? parseFloat(data.utility_payment_consistency) : null,
        prior_repayment_record: data.prior_repayment_record ? parseFloat(data.prior_repayment_record) : null,
        application_id: appId,
      };
      
      const result = await predict(processedData);
      sessionStorage.removeItem(SESSION_KEY);
      // Normalize field names: backend returns ai_decision, frontend uses decision
      const normalizedResult = {
        ...result,
        decision: result.decision || result.ai_decision,
      };
      // Store result for the result page
      sessionStorage.setItem('last_result', JSON.stringify(normalizedResult));
      toast.success('Application submitted successfully!');
      navigate(`/result/${normalizedResult.application_id}`);
    } catch (err) {
      console.error('Submission error:', err);
      toast.error('Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    const props = { register, errors, watch, setValue };
    switch (currentStep) {
      case 0: return <SectionDemographics {...props} />;
      case 1: return <SectionIncome {...props} />;
      case 2: return <SectionLoanDetails {...props} />;
      case 3: return <SectionCreditHistory {...props} />;
      case 4: return <SectionBehavioralSignals {...props} />;
      default: return null;
    }
  };

  return (
    <div className="bg-gradient-page" style={{ minHeight: '100vh' }}>
      <Navbar />

      <div style={{ display: 'flex', maxWidth: 1400, margin: '0 auto', padding: '32px', gap: 24, position: 'relative', zIndex: 1 }}>
        {/* Sidebar Stepper */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          style={{ width: 240, flexShrink: 0 }}
        >
          <GlassCard hover={false} style={{ position: 'sticky', top: 96 }}>
            <StepIndicator steps={STEPS} currentStep={currentStep} />
          </GlassCard>
        </motion.div>

        {/* Main Form Area */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginBottom: 24 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', marginBottom: 6 }}>
                  New Loan Application
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 500,
                    color: 'var(--color-primary)', background: 'var(--color-primary-soft)',
                    padding: '4px 12px', borderRadius: 8,
                  }}>
                    {appId}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    Step {currentStep + 1} of {STEPS.length}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Form Content */}
          <GlassCard hover={false} style={{ padding: '36px' }}>
            <form onSubmit={handleSubmit(onSubmit)}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {renderStep()}
                </motion.div>
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 36,
                paddingTop: 24,
                borderTop: '1px solid var(--color-border)',
              }}>
                <button
                  type="button"
                  onClick={goBack}
                  className="btn btn-ghost"
                  style={{ visibility: currentStep === 0 ? 'hidden' : 'visible' }}
                >
                  <ArrowLeft size={18} /> Back
                </button>

                {currentStep < STEPS.length - 1 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="btn btn-primary"
                  >
                    Next <ArrowRight size={18} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner" /> Processing...
                      </>
                    ) : (
                      <>
                        <Send size={18} /> Submit Application
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </GlassCard>
        </div>

        {/* Documents Sidebar (Always Visible) */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{ width: 320, flexShrink: 0 }}
        >
          <GlassCard hover={false} style={{ position: 'sticky', top: 96, maxHeight: 'calc(100vh - 128px)', overflowY: 'auto' }}>
            <div style={{ padding: '24px' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', marginBottom: 16, color: 'var(--color-text-primary)' }}>
                📄 Documents
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 16, lineHeight: 1.4 }}>
                Upload documents anytime. This is optional — you can submit without them.
              </p>
              
              {/* Documents Section Inside Sidebar */}
              <SectionDocuments register={register} errors={errors} watch={watch} setValue={setValue} />
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}
