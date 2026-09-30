# backend/tests/test_pipeline_features.py
import unittest
import numpy as np
import sys
import os

# Add backend directory and parent directory to path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from pipeline.features import compute_engineered_features, TRAIN_MIN_INCOME_PER_DEP, TRAIN_MAX_INCOME_PER_DEP
from pipeline.behavioral_signals import normalize_behavioral_signals
from pipeline.alt_credit_score import compute_alternative_credit_score

class TestPipelineFeatures(unittest.TestCase):

    def test_case_1_full_data_present(self):
        """Case 1: Full data present (applicant income, co-applicant income, loan term, dependents)"""
        data = {
            "applicant_income": 50000.0,
            "coapplicant_income": 25000.0,
            "loan_amount": 120000.0,
            "loan_term_months": 12,
            "dependents": 2,
            "employment_type": "Salaried",
            "electricity_bill_avg": 1200.0,
            "electricity_payment_regularity": 0.95,
            "mobile_recharge_amount": 499.0,
            "mobile_recharge_frequency": 3.0,
            "utility_payment_consistency": 0.90,
            "prior_repayment_record": 0.85,
            "govt_socioeconomic_category": "General"
        }

        # 1. Feature Engineering Verification
        features = compute_engineered_features(data)
        
        # EMI = 120,000 / 12 = 10,000; DTI = 10,000 / 50,000 = 0.2
        expected_emi = 120000.0 / 12.0
        expected_dti = expected_emi / 50000.0
        self.assertAlmostEqual(features["debt_to_income"], expected_dti, places=4)
        self.assertAlmostEqual(features["debt_to_income"], 0.2, places=4)

        # Household income = 50,000 + 25,000 = 75,000
        # Income per dependent = 75,000 / (2 + 1) = 25,000
        expected_household_income = 75000.0
        expected_income_per_dep = expected_household_income / 3.0
        expected_burden = (expected_income_per_dep - TRAIN_MIN_INCOME_PER_DEP) / (TRAIN_MAX_INCOME_PER_DEP - TRAIN_MIN_INCOME_PER_DEP)
        expected_burden = min(1.0, max(0.0, expected_burden))
        self.assertAlmostEqual(features["household_burden"], expected_burden, places=4)
        self.assertAlmostEqual(features["employment_stability"], 3.0)

        # 2. Alternative Credit Score Verification
        norm_data = normalize_behavioral_signals(data)
        acs_result = compute_alternative_credit_score(data, norm_data, features)
        self.assertIn("alternative_credit_score", acs_result)
        self.assertIn("behavior_repayment_score", acs_result)
        self.assertIn("income_affordability_score", acs_result)
        self.assertEqual(acs_result["scoring_mode"], "trained_model")
        self.assertEqual(acs_result["model_b_scoring_mode"], "unsupervised_composite_index")
        self.assertEqual(acs_result["income_affordability_label"], "estimated, not verified")
        self.assertEqual(acs_result["accuracy_disclaimer"], "demo-stage, proxy data")
        self.assertFalse(acs_result["score_flags"]["first_time_borrower"])
        self.assertGreater(acs_result["alternative_credit_score"], 0)

    def test_case_2_missing_coapplicant_income(self):
        """Case 2: Missing co-applicant income (None) is excluded and never defaulted to 0 in denominator"""
        data = {
            "applicant_income": 30000.0,
            "coapplicant_income": None,  # Explicitly None
            "loan_amount": 60000.0,
            "loan_term": 24,             # Tests loan_term fallback alias
            "dependents": 1,
            "employment_type": "Self-employed",
            "electricity_bill_avg": 600.0,
            "electricity_payment_regularity": 0.85,
            "mobile_recharge_amount": 299.0,
            "mobile_recharge_frequency": 2.0,
            "utility_payment_consistency": 0.80,
            "prior_repayment_record": 0.75,
            "govt_socioeconomic_category": "APL"
        }

        features = compute_engineered_features(data)

        # EMI = 60,000 / 24 = 2,500; DTI = 2,500 / 30,000 = 0.08333
        expected_emi = 60000.0 / 24.0
        expected_dti = expected_emi / 30000.0
        self.assertAlmostEqual(features["debt_to_income"], expected_dti, places=4)

        # Household income should equal applicant_income alone (30,000), not skewed by missing co-applicant
        # Income per dependent = 30,000 / (1 + 1) = 15,000
        expected_income_per_dep = 30000.0 / 2.0
        expected_burden = (expected_income_per_dep - TRAIN_MIN_INCOME_PER_DEP) / (TRAIN_MAX_INCOME_PER_DEP - TRAIN_MIN_INCOME_PER_DEP)
        expected_burden = min(1.0, max(0.0, expected_burden))
        self.assertAlmostEqual(features["household_burden"], expected_burden, places=4)
        self.assertAlmostEqual(features["employment_stability"], 2.0)

        # Alternative Credit Score with missing coapplicant
        norm_data = normalize_behavioral_signals(data)
        acs_result = compute_alternative_credit_score(data, norm_data, features)
        self.assertGreater(acs_result["alternative_credit_score"], 0)
        self.assertEqual(acs_result["income_affordability_label"], "estimated, not verified")

    def test_case_3_first_time_borrower(self):
        """Case 3: First-time borrower (prior_repayment_record is None) is subject to first-time weighting and safety cap"""
        data = {
            "applicant_income": 25000.0,
            "coapplicant_income": None,
            "loan_amount": 50000.0,
            "loan_term_months": 12,
            "dependents": 0,
            "employment_type": "Farmer",
            "electricity_bill_avg": 500.0,
            "electricity_payment_regularity": 0.90,
            "mobile_recharge_amount": 199.0,
            "mobile_recharge_frequency": 2.0,
            "utility_payment_consistency": 0.90,
            "prior_repayment_record": None,  # First-time borrower
            "govt_socioeconomic_category": "BPL"
        }

        features = compute_engineered_features(data)
        self.assertAlmostEqual(features["employment_stability"], 1.5)

        norm_data = normalize_behavioral_signals(data)
        acs_result = compute_alternative_credit_score(data, norm_data, features)

        # Verify first-time borrower flag is True
        self.assertTrue(acs_result["score_flags"]["first_time_borrower"])

        # Model A score capped at 70 for first-time borrowers
        self.assertLessEqual(acs_result["behavior_repayment_score"], 70.0)

        # Composite alternative credit score capped at 65 for first-time borrowers
        self.assertLessEqual(acs_result["alternative_credit_score"], 65.0)

    def test_case_4_rule_based_fallback(self):
        """Case 4: Explicit fallback to Rule-Based Scorecard when trained model is bypassed"""
        from pipeline.alt_credit_score import _compute_model_a_rule_based_fallback
        data = {
            "applicant_income": 20000.0,
            "prior_repayment_record": 0.80,
            "electricity_payment_regularity": 0.85,
            "utility_payment_consistency": 0.90
        }
        score = _compute_model_a_rule_based_fallback(data, data)
        # Expected = (0.90 * 0.40 + 0.85 * 0.30 + 0.80 * 0.30) * 100 = (0.36 + 0.255 + 0.24) * 100 = 85.5
        self.assertAlmostEqual(score, 85.5, places=1)

    def test_case_5_weighted_average_renormalization(self):
        """Case 5: General weighted-average renormalization across missing feature permutations"""
        from pipeline.alt_credit_score import _compute_model_a_rule_based_fallback, _compute_model_b_unsupervised_index

        # Model A: Missing electricity regularity, present utility consistency (0.80) & prior (0.70)
        # Utility weight: 0.40, Prior weight: 0.30 -> Total = 0.70
        # Renormalized: (0.40 / 0.70) * 80 + (0.30 / 0.70) * 70 = 45.714 + 30.0 = 75.714
        norm_a = {
            "utility_payment_consistency": 0.80,
            "electricity_payment_regularity": None
        }
        row_a = {"prior_repayment_record": 0.70}
        score_a = _compute_model_a_rule_based_fallback(row_a, norm_a)
        self.assertAlmostEqual(score_a, 75.714, places=2)

        # Model B: Missing electricity and mobile frequency, present mobile spending, household cap, and stability
        norm_b = {
            "electricity_bill_avg_norm": None,
            "mobile_recharge_amount_norm": 1.5, # comp = 0.75, weight = 0.15
            "mobile_recharge_frequency_norm": None
        }
        eng_b = {
            "household_burden": 0.25, # cap = 0.75, weight = 0.30
            "employment_stability": 3.0 # stab = 1.0, weight = 0.20
        }
        # Total active weight = 0.15 + 0.30 + 0.20 = 0.65
        # Expected score = ((0.15 * 75 + 0.30 * 75 + 0.20 * 100) / 0.65) = (11.25 + 22.5 + 20) / 0.65 = 53.75 / 0.65 ≈ 82.692
        score_b = _compute_model_b_unsupervised_index(norm_b, eng_b)
        self.assertAlmostEqual(score_b, 82.692, places=2)

    def test_case_6_isolated_safety_override(self):
        """Case 6: Isolated evaluate_safety_override unconditional branch verification"""
        from pipeline.decision_engine import evaluate_safety_override, route_decision

        # Both electricity and utility are None -> must override, cap score at 65.0, and return 'Human Review'
        is_overridden, capped_score, decision = evaluate_safety_override(None, None, 95.0)
        self.assertTrue(is_overridden)
        self.assertEqual(capped_score, 65.0)
        self.assertEqual(decision, "Human Review")

        # Route decision must route directly to Human Review regardless of high score
        routed_decision = route_decision(
            alternative_credit_score=95.0,
            combined_score=0.95,
            uncertain=False,
            fairness_flag=False,
            score_flags={"both_signals_missing": True},
            electricity_regularity=None,
            utility_consistency=None,
            data_completeness_pct=100.0
        )
        self.assertEqual(routed_decision, "Human Review")

        # When signals are present, override does NOT trigger
        is_overridden_2, score_2, decision_2 = evaluate_safety_override(0.9, 0.9, 90.0)
        self.assertFalse(is_overridden_2)
        self.assertEqual(score_2, 90.0)
        self.assertIsNone(decision_2)

    def test_case_7_data_completeness_and_routing(self):
        """Case 7: Data completeness calculation and low completeness human review routing"""
        from pipeline.behavioral_signals import compute_data_completeness
        from pipeline.decision_engine import route_decision

        sparse_data = {
            "applicant_income": 30000.0,
            "loan_amount": 50000.0,
            "loan_term": 12
        }
        completeness = compute_data_completeness(sparse_data)
        # 3 fields out of 15 -> 20.0%
        self.assertEqual(completeness, 20.0)

        # Low completeness (< 50%) must trigger Human Review even if score is high
        decision = route_decision(
            alternative_credit_score=88.0,
            combined_score=0.88,
            uncertain=False,
            fairness_flag=False,
            score_flags={"both_signals_missing": False},
            electricity_regularity=0.9,
            utility_consistency=0.9,
            data_completeness_pct=completeness
        )
        self.assertEqual(decision, "Human Review")

    def test_case_8_verification_tagging_self_reported(self):
        """Case 8: Default verification tagging returns self_reported for all fields"""
        from pipeline.verification import tag_verification_sources
        data = {
            "applicant_income": 30000.0,
            "electricity_bill_avg": 800.0,
            "electricity_payment_regularity": 0.90,
            "utility_payment_consistency": 0.85,
            "mobile_recharge_amount": 300.0,
            "mobile_recharge_frequency": 2.0,
            "prior_repayment_record": 0.75
        }
        result = tag_verification_sources(data)
        self.assertTrue(result["majority_self_reported"])
        self.assertEqual(result["income_verification_source"], "self_reported")
        for src in result["sources"].values():
            self.assertEqual(src, "self_reported")

    def test_case_9_verification_tagging_aa_uli(self):
        """Case 9: AA/ULI consent tags fields as verified"""
        from pipeline.verification import tag_verification_sources
        data = {
            "applicant_income": 30000.0,
            "verification_mode": "aa_uli",
            "electricity_bill_avg": 800.0,
            "electricity_payment_regularity": 0.90,
            "utility_payment_consistency": 0.85,
            "mobile_recharge_amount": 300.0,
            "mobile_recharge_frequency": 2.0,
            "prior_repayment_record": 0.75
        }
        result = tag_verification_sources(data)
        self.assertFalse(result["majority_self_reported"])
        self.assertEqual(result["income_verification_source"], "aa_verified")
        self.assertEqual(result["sources"]["electricity_bill_avg"], "uli_verified")
        self.assertEqual(result["sources"]["utility_payment_consistency"], "uli_verified")

    def test_case_10_self_reported_downweight_vs_verified(self):
        """Case 10: Self-reported fields are down-weighted (0.75x) while verified retain full weight"""
        from pipeline.alt_credit_score import _compute_model_a_rule_based_fallback

        norm = {
            "utility_payment_consistency": 0.90,
            "electricity_payment_regularity": 0.85
        }
        row = {"prior_repayment_record": 0.80}

        # Self-reported (no verification): all fields down-weighted equally (0.75x each)
        # Since all are equally down-weighted, renormalization produces same result as unweighted
        score_self = _compute_model_a_rule_based_fallback(row, norm, verification_sources=None)

        # Verified (all fields aa_verified): full weight
        verif_aa = {"sources": {
            "utility_payment_consistency": "uli_verified",
            "electricity_payment_regularity": "uli_verified",
            "prior_repayment_record": "aa_verified"
        }}
        score_verified = _compute_model_a_rule_based_fallback(row, norm, verification_sources=verif_aa)

        # Both should produce the same score because when ALL fields have the same multiplier,
        # renormalization cancels it out. The key test is a MIX:
        verif_mixed = {"sources": {
            "utility_payment_consistency": "uli_verified",  # 1.0x
            "electricity_payment_regularity": "self_reported",  # 0.75x
            "prior_repayment_record": "aa_verified"  # 1.0x
        }}
        score_mixed = _compute_model_a_rule_based_fallback(row, norm, verification_sources=verif_mixed)

        # In mixed case, the verified fields (utility + prior) should have proportionally
        # more influence than the self-reported field (electricity), shifting the score
        self.assertNotEqual(round(score_self, 4), round(score_mixed, 4))

    def test_case_11_majority_self_reported_forces_human_review(self):
        """Case 11: majority_self_reported forces Human Review regardless of high score"""
        from pipeline.decision_engine import route_decision

        decision = route_decision(
            alternative_credit_score=92.0,
            combined_score=0.92,
            uncertain=False,
            fairness_flag=False,
            score_flags={"both_signals_missing": False},
            electricity_regularity=0.95,
            utility_consistency=0.90,
            data_completeness_pct=100.0,
            majority_self_reported=True
        )
        self.assertEqual(decision, "Human Review")

        # When not majority self-reported, should approve
        decision_verified = route_decision(
            alternative_credit_score=92.0,
            combined_score=0.92,
            uncertain=False,
            fairness_flag=False,
            score_flags={"both_signals_missing": False},
            electricity_regularity=0.95,
            utility_consistency=0.90,
            data_completeness_pct=100.0,
            majority_self_reported=False
        )
        self.assertEqual(decision_verified, "Approve")

    def test_case_12_stratified_smote_demographic_integrity(self):
        """Case 12: Stratified SMOTE balances target class while preserving intact demographic labels"""
        import pandas as pd
        from pipeline.bias_mitigation import apply_stratified_smote

        # Create imbalanced synthetic stratum data
        data = {
            "gender": ["Female"] * 10 + ["Male"] * 10,
            "area_type": ["Rural"] * 10 + ["Urban"] * 10,
            "income": [10000, 12000, 11000, 13000, 14000, 15000, 16000, 17000, 18000, 19000] * 2,
            "loan_amount": [50000, 60000, 55000, 65000, 70000, 75000, 80000, 85000, 90000, 95000] * 2,
        }
        # Female has 2 positive, 8 negative; Male has 8 positive, 2 negative
        y = [1, 1, 0, 0, 0, 0, 0, 0, 0, 0] + [1, 1, 1, 1, 1, 1, 1, 1, 0, 0]
        
        feature_names = ["gender", "area_type", "income", "loan_amount"]
        df_X = pd.DataFrame(data)

        X_res, y_res = apply_stratified_smote(
            df_X, y,
            feature_names=feature_names,
            sensitive_cols=["gender", "area_type"]
        )

        # Confirm target class was oversampled
        self.assertGreater(len(y_res), len(y))
        
        # Confirm that gender values remain strictly 'Female' and 'Male' without artificial interpolation
        self.assertTrue(set(X_res["gender"].unique()).issubset({"Female", "Male"}))
        self.assertTrue(set(X_res["area_type"].unique()).issubset({"Rural", "Urban"}))

    def test_case_13_kamiran_calders_reweighing(self):
        """Case 13: Kamiran & Calders sample reweighing calculates non-negative demographic parity weights"""
        import pandas as pd
        from pipeline.bias_mitigation import compute_kamiran_calders_weights

        data = {
            "gender": ["Female"] * 50 + ["Male"] * 50,
            "area_type": ["Rural"] * 50 + ["Urban"] * 50,
            "score": [60] * 100
        }
        y = [1] * 20 + [0] * 30 + [1] * 35 + [0] * 15  # Unbalanced approval between Female and Male
        df_X = pd.DataFrame(data)

        weights = compute_kamiran_calders_weights(
            df_X, y,
            feature_names=["gender", "area_type", "score"],
            sensitive_cols=["gender", "area_type"]
        )

        self.assertEqual(len(weights), 100)
        self.assertTrue(all(w > 0 for w in weights))
        self.assertAlmostEqual(sum(weights), 100.0, places=2)

    def test_case_14_rolling_fairness_audit_multi_axis_and_sample_floor(self):
        """Case 14: Rolling multi-axis audit evaluates all 4 axes and enforces N >= 30 sample size floor"""
        import pandas as pd
        from pipeline.fairness import compute_rolling_fairness_audit, MIN_SUBGROUP_SAMPLE_SIZE

        # Build test dataset with 4 demographic axes
        # Salaried: 50 (assessed), Daily wage: 10 (< 30 -> suppressed)
        # Urban: 40 (assessed), Rural: 40 (assessed)
        # Male: 50 (assessed), Female: 40 (assessed), Other: 5 (< 30 -> suppressed)
        # Graduate: 50 (assessed), Illiterate: 15 (< 30 -> suppressed)
        records = []
        # Male, Urban, Graduate, Salaried (50 records, 35 approved)
        for i in range(50):
            records.append({
                "gender": "Male", "area_type": "Urban", "education": "Graduate",
                "employment_type": "Salaried", "alternative_credit_score": 75.0,
                "ai_decision": "Approve" if i < 35 else "Reject",
                "behavior_repayment_score": 75.0, "prior_repayment_record": 0.8
            })
        # Female, Rural, Secondary, Self-employed (40 records, 24 approved)
        for i in range(40):
            records.append({
                "gender": "Female", "area_type": "Rural", "education": "Secondary",
                "employment_type": "Self-employed", "alternative_credit_score": 65.0,
                "ai_decision": "Approve" if i < 24 else "Reject",
                "behavior_repayment_score": 65.0, "prior_repayment_record": 0.7
            })
        # Small subgroup below floor (N=10 < 30)
        for i in range(10):
            records.append({
                "gender": "Other", "area_type": "Rural", "education": "Illiterate",
                "employment_type": "Daily wage", "alternative_credit_score": 60.0,
                "ai_decision": "Reject", "behavior_repayment_score": 50.0,
                "prior_repayment_record": None
            })
            
        test_df = pd.DataFrame(records)
        audit = compute_rolling_fairness_audit(df_or_db=test_df, trailing_days=30)

        # 1. Check all 4 demographic axes are evaluated
        self.assertIn("gender", audit["axes"])
        self.assertIn("area_type", audit["axes"])
        self.assertIn("education", audit["axes"])
        self.assertIn("employment_type", audit["axes"])

        # 2. Check sample size floor suppression for N < 30
        gender_axes = audit["axes"]["gender"]["subgroups"]
        self.assertEqual(gender_axes["Male"]["status"], "assessed")
        self.assertEqual(gender_axes["Female"]["status"], "assessed")
        self.assertEqual(gender_axes["Other"]["status"], "insufficient_data")
        self.assertIsNone(gender_axes["Other"]["approval_rate"])
        self.assertIn("Insufficient data to assess", gender_axes["Other"]["display_note"])

        # 3. Check pairwise DPD computation between assessed groups: Male (70%) vs Female (60%) = 10pp
        self.assertAlmostEqual(audit["axes"]["gender"]["demographic_parity_difference"], 10.0, places=1)

    def test_case_15_pipeline_validated_counterfactuals(self):
        """Case 15: Counterfactual suggestions are validated against live pipeline simulation and filtered by feasibility"""
        from pipeline.counterfactual import get_improvement_suggestions, _simulate_pipeline
        from pipeline.features import compute_engineered_features
        from pipeline.behavioral_signals import normalize_behavioral_signals
        from pipeline.alt_credit_score import compute_alternative_credit_score
        from pipeline.verification import tag_verification_sources

        # Stressed applicant with high loan amount and low electricity regularity
        applicant = {
            "applicant_income": 18000.0,
            "coapplicant_income": 0.0,
            "loan_amount": 100000.0,
            "loan_term": 12,
            "dependents": 2,
            "employment_type": "Daily wage",
            "area_type": "Rural",
            "electricity_bill_avg": 400.0,
            "electricity_payment_regularity": 0.60,
            "mobile_recharge_amount": 200.0,
            "mobile_recharge_frequency": 2.0,
            "utility_payment_consistency": 0.60,
            "prior_repayment_record": None,
            "verification_mode": "self_reported"
        }

        norm = normalize_behavioral_signals(applicant)
        verif = tag_verification_sources(applicant)
        eng = compute_engineered_features(applicant)
        acs = compute_alternative_credit_score(applicant, norm, eng, verif)

        suggestions = get_improvement_suggestions(
            applicant, eng, acs,
            ai_decision="Human Review"
        )

        self.assertGreater(len(suggestions), 0)
        self.assertLessEqual(len(suggestions), 3)

        # Confirm suggestions are meaningful strings citing simulated improvements
        has_actionable_advice = any("Reducing the loan" in s or "co-applicant" in s or "utility" in s or "AA/ULI" in s for s in suggestions)
        self.assertTrue(has_actionable_advice)

        # Test simulation helper directly
        sim_res = _simulate_pipeline(applicant)
        self.assertIsNotNone(sim_res)
        self.assertIn("alternative_credit_score", sim_res)
        self.assertIn("decision", sim_res)
        self.assertIn("risk_band", sim_res)

if __name__ == "__main__":
    unittest.main()


