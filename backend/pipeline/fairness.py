# backend/pipeline/fairness.py
import pandas as pd
from sqlalchemy import text
from db.session import engine

def audit_fairness(current_application, current_acs):
    """
    Performs a post-decision group-level fairness audit based on historical data.
    """
    try:
        # 1. Query PostgreSQL for last 30 days
        with engine.connect() as conn:
            query = text("""
                SELECT gender, area_type, alternative_credit_score, ai_decision 
                FROM loan_applications 
                WHERE created_at > NOW() - INTERVAL '30 days'
            """)
            df = pd.read_sql(query, conn)
            
        if len(df) < 50:
            return {"fairness_flag": False, "fairness_detail": None}
            
        # 2. Group by gender and area_type
        # Compute approval rate (Approve = 1, others = 0)
        df['is_approved'] = df['ai_decision'] == 'Approve'
        
        # Benchmark group: Urban + Male
        benchmark_mask = (df['gender'] == 'Male') & (df['area_type'] == 'Urban')
        
        # Define score band for current application (±10 points)
        band_min = current_acs - 10
        band_max = current_acs + 10
        
        band_df = df[(df['alternative_credit_score'] >= band_min) & (df['alternative_credit_score'] <= band_max)]
        
        if len(band_df) < 20: 
            return {"fairness_flag": False, "fairness_detail": None}
            
        group_stats = band_df.groupby(['gender', 'area_type'])['is_approved'].mean()
        
        benchmark_rate = group_stats.get(('Male', 'Urban'), 0.5)
        
        # Check current application's group
        app_gender = current_application.get("gender")
        app_area = current_application.get("area_type")
        app_group_rate = group_stats.get((app_gender, app_area), benchmark_rate)
        
        # Flag if group approval rate is 10pp below benchmark
        if benchmark_rate - app_group_rate > 0.10:
            detail = f"{app_gender} applicants in {app_area} areas have a lower approval rate ({app_group_rate*100:.1f}%) compared to benchmark group ({benchmark_rate*100:.1f}%) in this score band."
            return {"fairness_flag": True, "fairness_detail": detail}
            
        return {"fairness_flag": False, "fairness_detail": None}
        
    except Exception as e:
        # Fallback for fresh deployments or if DB connection fails
        return {"fairness_flag": False, "fairness_detail": f"Fairness audit skipped: {str(e)}"}
