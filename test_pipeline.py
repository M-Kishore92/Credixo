import urllib.request, urllib.error, json

def predict(payload, label):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        "http://localhost:8000/api/predict",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        r = urllib.request.urlopen(req)
        result = json.loads(r.read())
        print(f"\n{'='*55}")
        print(f"  {label}")
        print(f"{'='*55}")
        ai = result["ai_decision"]
        acs = result["alternative_credit_score"]
        beh = result["behavior_repayment_score"]
        inc = result["income_affordability_score"]
        prob = result["approval_probability"]
        band = result["risk_band"]
        unc = result["uncertain"]
        r1 = result["top_reason_1"]
        r2 = result["top_reason_2"]
        dti = result["debt_to_income"]
        hb = result["household_burden"]
        es = result["employment_stability"]
        sug = result["suggestions"]
        print(f"  AI Decision          : {ai}")
        print(f"  Alt Credit Score     : {acs:.2f} / 100")
        print(f"  Behavior Score       : {beh:.2f}")
        print(f"  Income Score         : {inc:.2f}")
        print(f"  Approval Probability : {prob:.2%}")
        print(f"  Risk Band            : {band}")
        print(f"  Uncertain            : {unc}")
        print(f"  Debt-to-Income       : {dti:.4f}")
        print(f"  Household Burden     : {hb:.6f}")
        print(f"  Employment Stability : {es}")
        print(f"  Top Reason 1         : {r1}")
        print(f"  Top Reason 2         : {r2}")
        print(f"  Suggestions:")
        for s in sug:
            print(f"    - {s}")
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        print(f"\n[ERROR {e.code}] {label}")
        print(err)

# PROFILE A: Strong applicant
predict({
    "gender": "Male", "age": 34, "marital_status": "Married", "education": "Graduate",
    "applicant_income": 80000, "coapplicant_income": 20000, "dependents": 1,
    "employment_type": "Salaried", "area_type": "Urban",
    "loan_amount": 50000, "loan_term": 12, "loan_purpose": "Home Improvement",
    "electricity_bill_avg": 1200, "electricity_payment_regularity": 0.97,
    "mobile_recharge_amount": 499, "mobile_recharge_frequency": 4,
    "utility_payment_consistency": 0.95, "govt_socioeconomic_category": "General",
    "credit_score_category": "Good", "prior_repayment_record": 0.95
}, "PROFILE A: STRONG  |  High Income + Good Credit")

# PROFILE B: Weak applicant
predict({
    "gender": "Female", "age": 52, "marital_status": "Single", "education": "Not Graduate",
    "applicant_income": 8000, "coapplicant_income": 0, "dependents": 4,
    "employment_type": "Self-employed", "area_type": "Rural",
    "loan_amount": 90000, "loan_term": 360, "loan_purpose": "Business Expansion",
    "electricity_bill_avg": 200, "electricity_payment_regularity": 0.30,
    "mobile_recharge_amount": 49, "mobile_recharge_frequency": 1,
    "utility_payment_consistency": 0.25, "govt_socioeconomic_category": "BPL",
    "credit_score_category": "None", "prior_repayment_record": 0.1
}, "PROFILE B: WEAK    |  Low Income + No Credit + High Debt")

print("\n" + "="*55)
print("  TEST COMPLETE")
print("="*55)
