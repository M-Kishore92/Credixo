# backend/pipeline/behavioral_signals.py

def normalize_behavioral_signals(data):
    """
    Normalizes raw behavioral inputs against regional and national averages.
    """
    area_type = data.get("area_type", "Rural")
    
    # 1. Electricity Bill Average Normalization
    regional_avg_map = {"Urban": 1200, "Semi-urban": 800, "Rural": 500}
    regional_avg = regional_avg_map.get(area_type, 500)
    
    raw_elec = data.get("electricity_bill_avg")
    if raw_elec is not None:
        norm_elec = min(3.0, raw_elec / regional_avg)
    else:
        norm_elec = None
        
    # 2. Electricity Payment Regularity
    elec_reg = data.get("electricity_payment_regularity")
    elec_reg_missing = elec_reg is None
    
    # 3. Mobile Recharge Average Normalization
    # Rs. 300 is the national prepaid average
    raw_mobile_avg = data.get("mobile_recharge_avg")
    if raw_mobile_avg is not None:
        norm_mobile_avg = min(3.0, raw_mobile_avg / 300)
    else:
        norm_mobile_avg = None
        
    # 4. Mobile Recharge Frequency Normalization
    # Against 2.5 recharges/month
    raw_mobile_freq = data.get("mobile_recharge_frequency")
    if raw_mobile_freq is not None:
        norm_mobile_freq = min(3.0, raw_mobile_freq / 2.5)
    else:
        norm_mobile_freq = None
        
    # 5. Utility Payment Consistency
    util_cons = data.get("utility_payment_consistency")
    util_cons_missing = util_cons is None
    
    # 6. Govt Socioeconomic Category Encoding
    govt_map = {"BPL": 1.0, "APL": 0.5, "None": 0.0}
    raw_govt = data.get("govt_socioeconomic_category")
    govt_cat_encoded = govt_map.get(raw_govt, 0.0)
    
    return {
        "electricity_bill_avg_norm": norm_elec,
        "electricity_payment_regularity": elec_reg,
        "elec_reg_missing": elec_reg_missing,
        "mobile_recharge_avg_norm": norm_mobile_avg,
        "mobile_recharge_frequency_norm": norm_mobile_freq,
        "utility_payment_consistency": util_cons,
        "util_cons_missing": util_cons_missing,
        "govt_category_encoded": govt_cat_encoded
    }
