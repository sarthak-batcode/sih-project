import axios from 'axios';
import {
  DashboardSummary, Area, PredictionResult, BatchPredictionResponse,
  AuditLogItem, SystemSettings
} from '../types';

// 127.0.0.1 rather than localhost: on machines where `localhost` resolves to
// ::1 first, a uvicorn bound to 127.0.0.1 (its default) is unreachable and every
// request fails with a connection error that surfaces as a confusing CORS
// message. Override with VITE_API_BASE_URL if the API lives elsewhere.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://sih-backend-s3em.onrender.com/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/** Turns an axios failure into a message worth showing a user. */
export const describeError = (err: any): string => {
  if (err?.response?.data?.detail) {
    const d = err.response.data.detail;
    return typeof d === 'string' ? d : JSON.stringify(d);
  }
  if (err?.code === 'ECONNABORTED') return 'The API did not respond in time.';
  if (!err?.response) return 'Cannot reach the API. Is the backend running on port 8000?';
  return 'Request failed. Please try again.';
};

export const apiService = {
  // Dashboard
  getDashboardSummary: async (): Promise<DashboardSummary> => {
    const res = await apiClient.get('/dashboard/summary');
    return res.data;
  },

  // Areas
  getAreas: async (riskCategory?: string): Promise<Area[]> => {
    const params = riskCategory ? { risk_category: riskCategory } : {};
    const res = await apiClient.get('/areas', { params });
    return res.data;
  },

  getAreaDetail: async (areaId: string) => {
    const res = await apiClient.get(`/areas/${areaId}`);
    return res.data;
  },

  // Predictions
  predictRisk: async (payload: {
    area_id: string;
    hour: number;
    day_of_week: number;
    previous_incident_count: number;
    area_atm_density?: number;
    time_to_report_mins: number;
    transaction_amount: number;
    transaction_type: string;
    complaint_category: string;
    transaction_amount_bucket: string;
  }): Promise<PredictionResult> => {
    const res = await apiClient.post('/predict', payload);
    return res.data;
  },

  getBatchPredictions: async (hour: number = 22, dayOfWeek: number = 5): Promise<BatchPredictionResponse> => {
    const res = await apiClient.get('/predict/batch', {
      params: { hour, day_of_week: dayOfWeek }
    });
    return res.data;
  },

  // Analytics
  getAnalyticsTrends: async () => {
    const res = await apiClient.get('/analytics/trends');
    return res.data;
  },

  // Model Governance
  getModelMetrics: async () => {
    const res = await apiClient.get('/model/metrics');
    return res.data;
  },

  getFeatureImportances: async () => {
    const res = await apiClient.get('/model/feature-importance');
    return res.data;
  },

  // System settings
  getSettings: async (): Promise<SystemSettings> => {
    const res = await apiClient.get('/settings');
    return res.data;
  },

  updateSettings: async (payload: Partial<SystemSettings>): Promise<SystemSettings> => {
    const res = await apiClient.patch('/settings', payload);
    return res.data;
  },

  // Audit Logs
  getAuditLogs: async (action?: string, limit: number = 50): Promise<AuditLogItem[]> => {
    const params: any = { limit };
    if (action) params.action = action;
    const res = await apiClient.get('/audit/logs', { params });
    return res.data;
  },
};

export default apiClient;
