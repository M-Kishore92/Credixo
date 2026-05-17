# Credixo AI Prototype: End-to-End System Flow & Architecture

This document provides a detailed breakdown of how the Credixo AI platform operates. It traces the lifecycle of a loan application from the user's perspective on the frontend to the complex machine learning calculations happening in the backend.

---

## 1. User Flow walkthrough (Frontend Perspective)

We will follow the journey of a hypothetical user, **Rajesh**, a self-employed candidate with no formal credit score applying for a micro-loan.

### Step 1: Authentication & Dashboard
- **Page (`/` & `/home`)**: Rajesh logs into the portal. The dashboard gives an overview of his past activities. Since he needs a new loan, he clicks "Apply Now".

### Step 2: The Multi-Step Intake Form (`/apply`)
This is where Rajesh provides his information. The form is broken into 6 stages to reduce cognitive load:
1. **Demographics**: Name (Rajesh), Age (34), Gender (Male), Marital Status, Education.
2. **Household & Income**: Employment Type (Self-employed), Applicant Income (₹25,000/month), Dependents (2).
3. **Loan Details**: Loan Amount (₹50,000), Term (12 months), Purpose ("Business Expansion").
4. **Credit History**: Credit Score Category ("None" - zero formal credit history), Prior Repayment Record (None).
5. **Behavioral Signals**:
   - Electricity Bill Average: ₹800
   - Electricity Payment Regularity: 0.85 (pays on time 85% of the time)
   - Mobile Recharge Amount: ₹300
   - Utility Consistency: 0.90
6. **Documents**: (Optional file uploads).

*Once Rajesh clicks **Submit**, the frontend packages these inputs into a JSON payload and sends a `POST` request to the backend API (`/api/predict`).*

---

## 2. Backend & Machine Learning Execution (Under the Hood)

When the FastAPI backend receives Rajesh's application, it immediately routes it through the **Machine Learning Pipeline**. Here is exactly how the backend behaves:

### Stage A: Data Preprocessing & Feature Engineering
1. **Normalization**: The backend normalizes Rajesh's behavioral inputs (e.g., converting actual electricity bill amounts into a 0-1 scale based on regional averages).
2. **Engineered Features**: The system computes proxy financial indicators:
   - **Debt-to-Income (DTI)**: `50,000 / 25,000 = 2.0` (Acceptable range).
   - **Household Burden**: `2 dependents / ₹25,000 income = 0.00008` (Scaled to a burden score).
   - **Employment Stability**: "Self-employed" maps to a stability score of 2.0.

### Stage B: Alternative Credit Scoring (ACS)
Since Rajesh lacks a traditional credit score, the system generates an Alternative Credit Score out of 100 using two distinct models:
1. **Model A (Behavior & Repayment)**: Uses Rajesh's high utility payment consistency (0.90) and electricity payment regularity (0.85) to generate a behavior score (e.g., 75/100).
2. **Model B (Income & Affordability)**: Takes the engineered features (DTI, Burden) and income to generate an affordability score (e.g., 68/100).
   - *Calculation*: `Final ACS = (Model A * 0.60) + (Model B * 0.40) = ~72/100`.

### Stage C: Dual Decision Models
The preprocessed data and the new ACS are fed into two parallel risk-prediction models:
- **Logistic Regression (LR)**: Looks for linear patterns. Output probability of default translates to an approval confidence: e.g. `88%`.
- **XGBoost (XGB)**: Looks for complex, non-linear patterns. Output probability translates to: e.g. `82%`.
- *Calculation*: The system averages both scores (Combined Score: 85%). It also checks if the models agree. Since 88% and 82% are close, `uncertainty = False`.

### Stage D: Audit & Explanability
- **Fairness Audit**: Checks if Rajesh's demographic data negatively influenced the score unfairly.
- **SHAP Explainer**: Identifies *why* the model made its decision (e.g., "Top Reason: High Utility Consistency").
- **Counterfactual Suggestions**: Generates tips on how Rajesh could improve his score next time.

### Stage E: Rule-Based Decision Engine
The final step is the routing logic.
- Rajesh's ACS is **72**.
- The `decision_engine` logic dictates: `If ACS >= 60 -> Route to "Approve"`.
- Since there are no missing signal flags and uncertainty is False, the final `ai_decision` is **"Approve"** with a **"Moderate Risk"** band.

---

## 3. Output Flow (Return to Frontend)

The backend sends a structured JSON response back to the React frontend containing the decision, scores, SHAP explanations, and suggestions.

### Step 3: Result Page (`/result/:id`)
- Rajesh is seamlessly transitioned to the Result screen.
- He sees a floating card displaying **"Approved"** along with his Alternative Credit Score (72) and an Approval Probability (85%).
- A button prompts him to "View Score Details".

### Step 4: Score Explainer Page (`/explain/:id`)
If Rajesh (or a Loan Officer) wants to know *how* the AI arrived at this decision, they visit the Explainer page:
1. **Radar / Bar Charts**: Visually breaks down the 72 Score into "Behavioral Score" and "Income Score".
2. **Key Drivers**: Displays the SHAP values in a user-friendly way (e.g., a green pill saying "+ High utility payment consistency", and a red pill saying "- Self-employed income volatility").
3. **Actionable Feedback**: Shows the backend-generated counterfactual suggestions (e.g., *"Provide a 6-month bank statement to improve employment stability score"*).

---

## Summary of System Behavior

> [!NOTE]
> **Input Boundaries**: The system handles "thin-file" users perfectly. If behavioral signals are entirely missing, the backend applies a penalty and automatically caps the alternative score at 65, triggering the Decision Engine to route the application to a **"Human Review"** queue rather than outright rejecting it.

| Phase | Input / Action | Processing | Final Output |
| :--- | :--- | :--- | :--- |
| **Frontend Setup** | Application data forms (Age, Income, Utility bills). | React manages session state and payload validation. | JSON Payload sent to `/api/predict`. |
| **Feature Extraction** | JSON Payload. | Normalization, missing value imputation, proxy variable creation. | Clean vector array & Engineered features. |
| **ML Inference** | Clean Feature Vector. | Model A (Behavior), Model B (Income), Logistic Regression, XGBoost. | Alt Credit Score, Probability Scores, SHAP values. |
| **Decision Logic** | ML Outputs & Flags. | Rule thresholds (e.g., >80 is Auto-Approve, missing info is Manual). | Final routing decision (Approve/Reject/Manual). |
| **Frontend UI** | Backend Response JSON. | Framer-motion animations, Recharts data visualization. | Result Page & Interpretable Explainer Dashboard. |
