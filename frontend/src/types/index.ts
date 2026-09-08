export interface Area {
  area_id: string;
  area_name: string;
  district: string;
  state: string;
  region: string;
  zone_type: string;
  latitude: number;
  longitude: number;
  radius_km: number;
  atm_pos_density: number;
  baseline_risk_score: number;
  risk_category: 'LOW' | 'MEDIUM' | 'HIGH';
  active_surveillance: boolean;
}

export interface AlertItem {
  id: string;
  area_id: string;
  area_name: string;
  timestamp: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  risk_score: number;
  recommended_action: string;
}

export interface DashboardSummary {
  total_complaints: number;
  total_cash_withdrawal_events: number;
  high_risk_areas_count: number;
  medium_risk_areas_count: number;
  low_risk_areas_count: number;
  active_alerts_count: number;
  model_f1_score: number;
  model_accuracy: number;
  total_fraud_volume_inr: number;
  top_high_risk_areas: {
    area_id: string;
    area_name: string;
    state: string;
    risk_category: string;
    baseline_risk_score: number;
    atm_pos_density: number;
    complaint_count: number;
    latitude: number;
    longitude: number;
  }[];
  recent_alerts: AlertItem[];
  hourly_distribution: {
    hour: number;
    total_complaints: number;
    cash_out_rate: number;
  }[];
}

export interface ContributingFactor {
  factor: string;
  /** Signed percentage-point change, e.g. "+12.4%". Computed by the model. */
  impact: string;
  /** The same figure as a number, for sorting and bar widths. */
  impact_value: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  direction: 'increases' | 'reduces' | 'neutral';
  description: string;
}

export interface SystemSettings {
  threshold_critical: number;
  threshold_high: number;
  threshold_medium: number;
  alerts_enabled: boolean;
  alert_min_severity: 'MEDIUM' | 'HIGH' | 'CRITICAL';
  updated_at?: string | null;
  updated_by?: string | null;
}

export interface PredictionResult {
  area_id: string;
  area_name: string;
  risk_score: number;
  risk_percentage: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence_interval: [number, number];
  recommended_action: string;
  recommended_patrol_window: string;
  contributing_factors: ContributingFactor[];
  attribution_method?: string;
  thresholds_applied?: { critical: number; high: number; medium: number };
  model_version: string;
  algorithm: string;
  disclaimer: string;
}

export interface BatchPredictionItem {
  area_id: string;
  area_name: string;
  state: string;
  latitude: number;
  longitude: number;
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  atm_pos_density: number;
  recommended_patrol_window: string;
  active_surveillance: boolean;
}

export interface BatchPredictionResponse {
  total_evaluated_areas: number;
  critical_risk_count: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  generated_at: string;
  results: BatchPredictionItem[];
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actor_email: string;
  actor_role: string;
  action: string;
  resource: string;
  details: string;
  ip_address: string;
}
