const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const MOCK_OFFICER = {
  name: 'Priya Sharma',
  branch: 'Chennai South',
  id: 'OFF-001',
  region: 'Tamil Nadu',
};

const NAMES = [
  'Rajesh Kumar', 'Meena Devi', 'Suresh Patel', 'Lakshmi Narayanan',
  'Anita Kumari', 'Vikram Singh', 'Deepa Selvam', 'Mohammed Farooq',
  'Kavitha Rajan', 'Arjun Reddy', 'Priya Murugan', 'Gopal Krishnan',
  'Sangeetha Bai', 'Ramesh Yadav', 'Fatima Begum',
];

const EMPLOYMENT_TYPES = ['Salaried', 'Self-employed', 'Farmer', 'Daily wage'];
const DECISIONS = ['Approve', 'Human Review', 'Reject'];
const RISK_BANDS = ['Low Risk', 'Moderate Risk', 'High Risk'];

function randomBetween(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function generateApplication(index) {
  const score = randomBetween(25, 98);
  let decision, riskBand;
  if (score >= 80) { decision = 'Approve'; riskBand = 'Low Risk'; }
  else if (score >= 40) { decision = 'Human Review'; riskBand = 'Moderate Risk'; }
  else { decision = 'Reject'; riskBand = 'High Risk'; }

  const daysAgo = randomBetween(0, 30);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);

  return {
    application_id: `APP-2025-${String(index + 1).padStart(4, '0')}`,
    applicant_name: NAMES[index % NAMES.length],
    age: randomBetween(22, 60),
    gender: ['Male', 'Female', 'Other'][randomBetween(0, 2)],
    employment_type: EMPLOYMENT_TYPES[randomBetween(0, 3)],
    area_type: ['Urban', 'Semi-urban', 'Rural'][randomBetween(0, 2)],
    loan_amount: randomBetween(10000, 500000),
    loan_term: randomBetween(12, 120),
    alternative_credit_score: score,
    risk_band: riskBand,
    decision: decision,
    date: date.toISOString().split('T')[0],
    officer_id: 'OFF-001',
    officer_name: 'Priya Sharma',
    behavior_repayment_score: randomBetween(Math.max(20, score - 15), Math.min(100, score + 15)),
    income_affordability_score: randomBetween(Math.max(20, score - 20), Math.min(100, score + 10)),
    combined_score: (score / 100).toFixed(2),
    approval_probability: (score / 100 * 0.95 + 0.02).toFixed(2),
    fairness_flag: Math.random() > 0.85,
    top_reason_1: 'Consistent electricity bill payments over 12 months',
    top_reason_2: 'Regular mobile recharge pattern indicates stable income',
    suggestions: score < 80
      ? ['Increase mobile recharge consistency', 'Submit utility bill records for 6+ months']
      : [],
    shap_top_features: {
      utility_payment_consistency: +(Math.random() * 0.3).toFixed(2),
      mobile_recharge_avg: +(Math.random() * 0.2).toFixed(2),
      debt_to_income: -(Math.random() * 0.15).toFixed(2),
      employment_stability: +(Math.random() * 0.18).toFixed(2),
      alternative_credit_score: +(Math.random() * 0.25 + 0.1).toFixed(2),
      monthly_income: +(Math.random() * 0.12).toFixed(2),
      loan_amount_ratio: -(Math.random() * 0.1).toFixed(2),
    },
    documents_submitted: randomBetween(2, 6),
  };
}

const APPLICATIONS = Array.from({ length: 15 }, (_, i) => generateApplication(i));

export async function mockLogin(credentials) {
  await delay(800);
  if (credentials.officer_id && credentials.password) {
    return {
      token: 'mock-jwt-token-' + Date.now(),
      officer: MOCK_OFFICER,
    };
  }
  throw new Error('Invalid credentials');
}

export async function mockSignup(data) {
  await delay(1000);
  return { success: true, message: 'Account created successfully' };
}

export async function mockPredict(formData) {
  await delay(1500);
  const score = randomBetween(35, 95);
  let decision, riskBand;
  if (score >= 80) { decision = 'Approve'; riskBand = 'Low Risk'; }
  else if (score >= 40) { decision = 'Human Review'; riskBand = 'Moderate Risk'; }
  else { decision = 'Reject'; riskBand = 'High Risk'; }

  const behaviorScore = randomBetween(Math.max(20, score - 10), Math.min(100, score + 10));
  const incomeScore = randomBetween(Math.max(20, score - 15), Math.min(100, score + 8));

  return {
    application_id: `APP-2025-${String(randomBetween(100, 999)).padStart(4, '0')}`,
    decision,
    alternative_credit_score: score,
    risk_band: riskBand,
    behavior_repayment_score: behaviorScore,
    income_affordability_score: incomeScore,
    combined_score: +(score / 100).toFixed(2),
    approval_probability: +(score / 100 * 0.95 + 0.02).toFixed(2),
    top_reason_1: 'Consistent electricity bill payments over 12 months',
    top_reason_2: 'Regular mobile recharge pattern indicates stable income',
    suggestions: score < 80
      ? [
          'Increase mobile recharge consistency over the next 3 months',
          'Submit utility bill records for 6+ months to improve behaviour score',
          'Maintain regular bank transactions to build financial history',
        ]
      : [],
    fairness_flag: Math.random() > 0.8,
    shap_top_features: {
      'Utility Payment Consistency': +(Math.random() * 0.3).toFixed(2),
      'Mobile Recharge Average': +(Math.random() * 0.2).toFixed(2),
      'Debt-to-Income Ratio': -(Math.random() * 0.15).toFixed(2),
      'Employment Stability': +(Math.random() * 0.18).toFixed(2),
      'Alternative Credit Score': +(Math.random() * 0.25 + 0.1).toFixed(2),
      'Monthly Income': +(Math.random() * 0.12).toFixed(2),
      'Loan Amount Ratio': -(Math.random() * 0.1).toFixed(2),
    },
    data_sources: {
      electricity: Math.random() > 0.2,
      mobile: Math.random() > 0.3,
      utility: Math.random() > 0.25,
      repayment: Math.random() > 0.4,
      govt_survey: Math.random() > 0.5,
    },
  };
}

export async function mockDashboardStats() {
  await delay(600);
  const total = 2847;
  const approved = 1934;
  const humanReview = 612;
  const rejected = 301;

  return {
    total,
    approved,
    approved_pct: ((approved / total) * 100).toFixed(1),
    human_review: humanReview,
    human_review_pct: ((humanReview / total) * 100).toFixed(1),
    rejected,
    rejected_pct: ((rejected / total) * 100).toFixed(1),
    avg_score: 67,
    fairness_flags: 23,
    approval_rate: ((approved / total) * 100).toFixed(1),
    drift_detected: false,
    score_distribution: [
      { range: '0-39', count: 189, band: 'High Risk' },
      { range: '40-59', count: 423, band: 'Moderate Risk' },
      { range: '60-79', count: 891, band: 'Moderate Risk' },
      { range: '80-100', count: 1344, band: 'Low Risk' },
    ],
    decision_breakdown: [
      { name: 'Approved', value: approved, color: '#10B981' },
      { name: 'Human Review', value: humanReview, color: '#F59E0B' },
      { name: 'Rejected', value: rejected, color: '#EF4444' },
    ],
    trend_data: Array.from({ length: 7 }, (_, i) => ({
      day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      applications: randomBetween(30, 80),
      approvals: randomBetween(20, 55),
    })),
    fairness_heatmap: {
      Male:   { Urban: 71, 'Semi-urban': 68, Rural: 62 },
      Female: { Urban: 73, 'Semi-urban': 65, Rural: 58 },
      Other:  { Urban: 70, 'Semi-urban': 66, Rural: 60 },
    },
    overall_approval_rate: 67.9,
  };
}

export async function mockApplications() {
  await delay(500);
  return APPLICATIONS;
}

export async function mockGetApplication(id) {
  await delay(400);
  const app = APPLICATIONS.find((a) => a.application_id === id);
  if (app) {
    return {
      ...app,
      marital_status: 'Married',
      education: 'Secondary',
      monthly_income: randomBetween(8000, 45000),
      co_applicant_income: randomBetween(0, 15000),
      dependents: randomBetween(0, 5),
      loan_purpose: 'Agriculture',
      credit_score_category: 'None',
      prior_repayment: 'No prior loans',
      electricity_bill: randomBetween(200, 2000),
      electricity_regularity: 'Usually on time',
      mobile_recharge_amount: randomBetween(100, 800),
      mobile_recharge_frequency: randomBetween(1, 8),
      utility_consistency: 'Always',
      govt_category: 'BPL',
      documents: [
        { name: 'Electricity Bill', available: true },
        { name: 'No Income Certificate', available: false },
        { name: 'Ration Card', available: true },
        { name: 'Land Document', available: true },
        { name: 'Bank Passbook', available: true },
        { name: 'Aadhaar Card', available: true },
      ],
      audit_log: [
        { timestamp: new Date().toISOString(), action: 'Application submitted', officer: 'OFF-001' },
        { timestamp: new Date().toISOString(), action: 'AI scoring completed', officer: 'SYSTEM' },
      ],
      override: null,
    };
  }
  return generateApplication(0);
}

export async function mockOverride(id, data) {
  await delay(800);
  return { success: true, message: 'Override submitted successfully' };
}
