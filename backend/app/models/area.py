from sqlalchemy import Column, String, Float, Integer, Boolean
from backend.app.database import Base

class Area(Base):
    __tablename__ = "areas"

    area_id = Column(String, primary_key=True, index=True)
    area_name = Column(String, nullable=False)
    district = Column(String, nullable=False)
    state = Column(String, nullable=False)
    region = Column(String, nullable=False)
    zone_type = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    radius_km = Column(Float, default=3.0)
    atm_pos_density = Column(Integer, default=25)
    baseline_risk_score = Column(Float, default=0.5)
    risk_category = Column(String, default="MEDIUM")
    active_surveillance = Column(Boolean, default=True)
