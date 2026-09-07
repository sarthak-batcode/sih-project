"""
SIH26184: Database Seeder Script
================================
Populates database with demo user credentials (Admin, Investigator, Analyst),
100 surveillance areas, and synthetic complaint events.
"""

import os
import sys
import json
import pandas as pd
from datetime import datetime

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

from backend.app.database import engine, Base, SessionLocal
from backend.app.models.user import User
from backend.app.models.area import Area
from backend.app.models.complaint import Complaint
from backend.app.models.audit_log import AuditLog
from backend.app.core.security import get_password_hash

DATA_DIR = os.path.join(BASE_DIR, "data")

def seed_database():
    print("=" * 70)
    print("[SIH26184] Seeding Database (PostgreSQL / SQLite)")
    print("=" * 70)

    # 1. Create tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 2. Seed Users
        print("\n[1/4] Seeding Demo User Accounts with Bcrypt Hashing...")
        demo_users = [
            {
                "email": "admin@cyberintel.gov.in",
                "password": "Admin@SIH2026!",
                "full_name": "Inspector General R. Sharma (Admin)",
                "role": "admin"
            },
            {
                "email": "investigator@cyberintel.gov.in",
                "password": "Investigate@2026!",
                "full_name": "Senior Cyber Investigator K. Mehta",
                "role": "investigator"
            },
            {
                "email": "analyst@cyberintel.gov.in",
                "password": "Analyst@2026!",
                "full_name": "Intelligence Analyst P. Nair",
                "role": "analyst"
            }
        ]

        for u in demo_users:
            existing = db.query(User).filter(User.email == u["email"]).first()
            if not existing:
                new_user = User(
                    email=u["email"],
                    hashed_password=get_password_hash(u["password"]),
                    full_name=u["full_name"],
                    role=u["role"],
                    is_active=True
                )
                db.add(new_user)
                print(f"  [+] Created user: {u['email']} [{u['role'].upper()}]")
            else:
                print(f"  [.] User already exists: {u['email']}")

        db.commit()

        # 3. Seed Areas
        print("\n[2/4] Seeding 100 Surveillance Grid Areas...")
        areas_json_path = os.path.join(DATA_DIR, "synthetic_areas.json")
        if os.path.exists(areas_json_path):
            with open(areas_json_path, "r", encoding="utf-8") as f:
                areas_data = json.load(f)

            for a in areas_data:
                existing = db.query(Area).filter(Area.area_id == a["area_id"]).first()
                if not existing:
                    new_area = Area(
                        area_id=a["area_id"],
                        area_name=a["area_name"],
                        district=a["district"],
                        state=a["state"],
                        region=a["region"],
                        zone_type=a["zone_type"],
                        latitude=a["latitude"],
                        longitude=a["longitude"],
                        radius_km=a.get("radius_km", 3.0),
                        atm_pos_density=a.get("atm_pos_density", 25),
                        baseline_risk_score=a.get("baseline_risk_score", 0.5),
                        risk_category=a.get("risk_category", "MEDIUM"),
                        active_surveillance=a.get("active_surveillance", True)
                    )
                    db.add(new_area)
            db.commit()
            print(f"  [+] Seeded {len(areas_data)} surveillance zones.")

        # 4. Seed Sample Complaints
        print("\n[3/4] Seeding Sample Cybercrime Complaint Events...")
        complaints_csv = os.path.join(DATA_DIR, "cleaned_complaints.csv")
        if not os.path.exists(complaints_csv):
            complaints_csv = os.path.join(DATA_DIR, "synthetic_complaints.csv")

        if os.path.exists(complaints_csv):
            df = pd.read_csv(complaints_csv)
            # Seed up to 2000 records into DB for fast querying
            sample_df = df.head(2000)
            
            existing_count = db.query(Complaint).count()
            if existing_count < 100:
                complaint_objs = []
                for _, row in sample_df.iterrows():
                    ts = datetime.strptime(row["timestamp"], "%Y-%m-%d %H:%M:%S")
                    c = Complaint(
                        complaint_id=row["complaint_id"],
                        timestamp=ts,
                        area_id=row["area_id"],
                        latitude=row["latitude"],
                        longitude=row["longitude"],
                        transaction_type=row["transaction_type"],
                        complaint_category=row["complaint_category"],
                        transaction_amount=row["transaction_amount"],
                        transaction_amount_bucket=row["transaction_amount_bucket"],
                        time_to_report_mins=int(row["time_to_report_mins"]),
                        hour=int(row["hour"]),
                        day_of_week=int(row["day_of_week"]),
                        is_weekend=int(row.get("is_weekend", 0)),
                        previous_incident_count=int(row.get("previous_incident_count", 0)),
                        area_atm_density=int(row.get("area_atm_density", 20)),
                        is_night_window=int(row.get("is_night_window", 0)),
                        area_baseline_risk_score=float(row.get("area_baseline_risk_score", 0.4)),
                        label_generation_prob=float(row.get("label_generation_prob", 0.5)),
                        target_cash_withdrawal_event=int(row.get("target_cash_withdrawal_event", 0))
                    )
                    complaint_objs.append(c)

                db.bulk_save_objects(complaint_objs)
                db.commit()
                print(f"  [+] Seeded {len(complaint_objs):,} complaints to DB table.")
            else:
                print(f"  [.] Database already has {existing_count} complaints.")

        # 5. Seed Initial System Audit Log
        print("\n[4/4] Recording System Initialization in Audit Ledger...")
        init_log = AuditLog(
            actor_email="system@cyberintel.gov.in",
            actor_role="system",
            action="SYSTEM_INIT_SEED",
            resource="DATABASE_TABLES",
            details="Seeded demo users, surveillance grid areas, and synthetic baseline complaints.",
            ip_address="127.0.0.1"
        )
        db.add(init_log)
        db.commit()
        print("  [+] Initial audit record created.")

        print("\n[SUCCESS] Database Seeding Complete!")

    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
