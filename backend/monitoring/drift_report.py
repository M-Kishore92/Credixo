# backend/monitoring/drift_report.py
import pandas as pd
from evidently.report import Report
from evidently.metric_preset import DataDriftPreset, TargetDriftPreset
from sqlalchemy import create_engine
import os
from datetime import datetime

def generate_drift_report():
    # 1. Load Training Baseline
    train_data = pd.read_csv('../data/synthetic_loan_data.csv')
    
    # 2. Get Production Data (Last 30 days)
    db_url = os.getenv("DATABASE_URL", "sqlite:///../credixo.db")
    engine = create_engine(db_url)
    
    try:
        prod_data = pd.read_sql("SELECT * FROM loan_applications WHERE created_at > datetime('now', '-30 days')", engine)
        
        if len(prod_data) < 10:
            print("Not enough production data for drift report.")
            return

        # 3. Create Report
        drift_report = Report(metrics=[
            DataDriftPreset(),
            TargetDriftPreset()
        ])
        
        # We align columns for comparison
        common_cols = list(set(train_data.columns) & set(prod_data.columns))
        drift_report.run(reference_data=train_data[common_cols], current_data=prod_data[common_cols])
        
        # 4. Save
        timestamp = datetime.now().strftime("%Y_%m")
        output_dir = "reports"
        os.makedirs(output_dir, exist_ok=True)
        report_path = f"{output_dir}/drift_{timestamp}.html"
        drift_report.save_html(report_path)
        print(f"Drift report saved to {report_path}")
        
    except Exception as e:
        print(f"Drift analysis failed: {e}")

if __name__ == "__main__":
    generate_drift_report()
