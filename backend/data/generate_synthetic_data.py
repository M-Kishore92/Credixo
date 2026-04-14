# backend/data/generate_synthetic_data.py
import pandas as pd
import numpy as np
import os
import uuid

def generate_data(n_samples=8000):
    np.random.seed(42)
    
    data = []
    
    # Constants
    GENDERS = ["Male", "Female", "Other"]
    MARITAL_STATUS = ["Single", "Married", "Widowed", "Divorced"]
    EDUCATION = ["No formal education", "Primary", "Secondary", "Graduate", "Post-graduate"]
    EMPLOYMENT_TYPES = ["Salaried", "Self-employed", "Farmer", "Daily wage"]
    AREA_TYPES = ["Urban", "Semi-urban", "Rural"]
    LOAN_PURPOSES = ["Agriculture", "Education", "Business", "Home repair", "Marriage", "Medical"]
    GOVT_CATEGORIES = ["BPL", "APL", None]
    CREDIT_CATEGORIES = ["None", "Weak", "Moderate", "Good", "Strong"]

    for i in range(n_samples):
        # 1. Demographics
        gender = np.random.choice(GENDERS, p=[0.55, 0.42, 0.03])
        age = int(np.random.normal(38, 12))
        age = max(18, min(80, age))
        marital = np.random.choice(MARITAL_STATUS, p=[0.25, 0.65, 0.05, 0.05])
        education = np.random.choice(EDUCATION, p=[0.15, 0.25, 0.35, 0.20, 0.05])
        
        # 2. Area & Employment
        area = np.random.choice(AREA_TYPES, p=[0.3, 0.35, 0.35])
        emp_type = np.random.choice(EMPLOYMENT_TYPES, p=[0.25, 0.35, 0.2, 0.2])
        
        # 3. Income Logic
        if area == "Urban":
            base_income = np.random.gamma(shape=3, scale=12000)
        elif area == "Semi-urban":
            base_income = np.random.gamma(shape=2.5, scale=8000)
        else: # Rural
            base_income = np.random.gamma(shape=2, scale=5000)
            
        # Daily wage lower income variance
        if emp_type == "Daily wage":
            base_income = base_income * 0.6
        elif emp_type == "Salaried":
            base_income = base_income * 1.5
            
        applicant_income = max(3000, base_income)
        coapplicant_income = 0.0
        if np.random.random() > 0.55:
            coapplicant_income = applicant_income * np.random.uniform(0.3, 0.8)
            
        dependents = int(np.random.poisson(2.5))
        dependents = max(0, min(12, dependents))
        
        # 4. Loan Details
        loan_amount = applicant_income * np.random.uniform(5, 30)
        # Cap loan to reasonable values
        loan_amount = max(5000, min(2000000, loan_amount))
        loan_term = np.random.choice([12, 24, 36, 48, 60, 84, 120])
        loan_purpose = np.random.choice(LOAN_PURPOSES)
        
        # 5. Behavioral Signals
        # Govt Category (BPL high in Rural)
        if area == "Rural":
            govt_cat = np.random.choice(GOVT_CATEGORIES, p=[0.6, 0.3, 0.1])
        else:
            govt_cat = np.random.choice(GOVT_CATEGORIES, p=[0.2, 0.5, 0.3])
            
        # Electricity Bill (Correlated with Income)
        elec_base = (applicant_income * 0.05) + np.random.normal(0, 200)
        if govt_cat == "BPL":
            elec_base = np.random.uniform(200, 600)
        electricity_bill_avg = max(50, elec_base)
        
        # Regularity
        # Higher income -> better regularity usually
        reg_prob = min(0.95, 0.5 + (applicant_income / 100000))
        electricity_payment_regularity = np.random.choice([1.0, 0.8, 0.5, 0.2], p=[reg_prob*0.8, reg_prob*0.2, (1-reg_prob)*0.7, (1-reg_prob)*0.3])
        
        # Mobile
        mobile_recharge_avg = (applicant_income * 0.02) + np.random.normal(0, 50)
        mobile_recharge_avg = max(50, mobile_recharge_avg)
        # BPL has higher frequency (smaller recharges)
        if govt_cat == "BPL":
            mobile_freq = np.random.uniform(3, 8)
        else:
            mobile_freq = np.random.uniform(1, 4)
        
        utility_consistency = np.random.choice([1.0, 0.8, 0.5, 0.2], p=[0.6, 0.2, 0.15, 0.05])
        
        # 6. Credit History
        prior_repayment_record = None
        if np.random.random() > 0.4:
            prior_repayment_record = np.random.choice([0.95, 0.82, 0.62, 0.35], p=[0.6, 0.2, 0.15, 0.05])
            
        credit_cat = np.random.choice(CREDIT_CATEGORIES, p=[0.5, 0.1, 0.15, 0.2, 0.05])
        
        # 7. Target Generation Logic (loan_repaid)
        # Signals of repayment capability
        capability_score = (
            (applicant_income / 20000) * 0.2 + 
            (electricity_payment_regularity or 0.5) * 0.25 + 
            (utility_consistency or 0.5) * 0.2 + 
            (prior_repayment_record or 0.6) * 0.35
        )
        
        # Debt ratio impact
        dti = loan_amount / (applicant_income * 12)
        penalty = max(0, dti - 0.4) * 2
        
        final_prob = capability_score - penalty
        final_prob = max(0.05, min(0.95, final_prob))
        
        loan_repaid = 1 if np.random.random() < final_prob else 0
        
        # Introduce Intentional Missing Values (15%)
        signals = ['electricity_bill_avg', 'electricity_payment_regularity', 'mobile_recharge_avg', 'mobile_recharge_frequency', 'utility_payment_consistency']
        for s in signals:
            if np.random.random() < 0.15:
                if s == 'electricity_bill_avg': electricity_bill_avg = np.nan
                if s == 'electricity_payment_regularity': electricity_payment_regularity = np.nan
                if s == 'mobile_recharge_avg': mobile_recharge_avg = np.nan
                if s == 'mobile_recharge_frequency': mobile_freq = np.nan
                if s == 'utility_payment_consistency': utility_consistency = np.nan

        data.append({
            "gender": gender,
            "age": age,
            "marital_status": marital,
            "education": education,
            "applicant_income": applicant_income,
            "coapplicant_income": coapplicant_income,
            "dependents": dependents,
            "employment_type": emp_type,
            "area_type": area,
            "loan_amount": loan_amount,
            "loan_term_months": loan_term,
            "loan_purpose": loan_purpose,
            "electricity_bill_avg": electricity_bill_avg,
            "electricity_payment_regularity": electricity_payment_regularity,
            "mobile_recharge_avg": mobile_recharge_avg,
            "mobile_recharge_frequency": mobile_freq,
            "utility_payment_consistency": utility_consistency,
            "govt_socioeconomic_category": govt_cat,
            "credit_category": credit_cat,
            "prior_repayment_record": prior_repayment_record,
            "loan_repaid": loan_repaid
        })
        
    df = pd.DataFrame(data)
    
    # Save to data directory
    output_path = os.path.join(os.path.dirname(__file__), "synthetic_loan_data.csv")
    df.to_csv(output_path, index=False)
    print(f"Dataset generated successfully at {output_path}")
    print(f"Shape: {df.shape}")
    print(f"Class balance:\n{df['loan_repaid'].value_counts(normalize=True)}")

if __name__ == "__main__":
    generate_data(8000)
