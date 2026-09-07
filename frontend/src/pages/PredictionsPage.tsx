import React, { useState, useEffect } from 'react';
import { 
  Crosshair, Cpu, AlertTriangle, ShieldCheck, Sparkles, 
  Clock, MapPin, DollarSign, Layers, ChevronRight, BarChart2
} from 'lucide-react';
import { apiService } from '../services/api';
import { Area, PredictionResult, BatchPredictionItem } from '../types';
import { RiskBadge } from '../components/common/RiskBadge';

export const PredictionsPage: React.FC = () => {
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>('AREA-CA-101');
  const [hour, setHour] = useState<number>(23);
  const [dayOfWeek, setDayOfWeek] = useState<number>(5); // Friday/Saturday
  const [incidentCount, setIncidentCount] = useState<number>(14);
  const [reportDelay, setReportDelay] = useState<number>(180);
  const [amount, setAmount] = useState<number>(45000);
  const [txType, setTxType] = useState<string>('AEPS_SPOOF');
  const [category, setCategory] = useState<string>('INVESTMENT_MULE_SCAM');
  
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');
  const [batchResults, setBatchResults] = useState<BatchPredictionItem[]>([]);
  const [batchLoading, setBatchLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const data = await apiService.getAreas();
        setAreas(data);
        if (data.length > 0) setSelectedAreaId(data[0].area_id);
      } catch (err) {
        console.error('Failed to load areas:', err);
      }
    };
    fetchAreas();
  }, []);

  const handlePredict = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const selectedArea = areas.find(a => a.area_id === selectedAreaId);
      const res = await apiService.predictRisk({
        area_id: selectedAreaId,
        hour,
        day_of_week: dayOfWeek,
        previous_incident_count: incidentCount,
        area_atm_density: selectedArea?.atm_pos_density || 35,
        time_to_report_mins: reportDelay,
        transaction_amount: amount,
        transaction_type: txType,
        complaint_category: category,
        transaction_amount_bucket: amount > 200000 ? 'CRITICAL_ABOVE_200K' : (amount > 50000 ? 'HIGH_50K_TO_200K' : 'MID_10K_TO_50K')
      });
      setPrediction(res);
    } catch (err) {
      console.error('Prediction failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchPredict = async () => {
    setBatchLoading(true);
    try {
      const res = await apiService.getBatchPredictions(hour, dayOfWeek);
      setBatchResults(res.results);
    } catch (err) {
      console.error('Batch prediction failed:', err);
    } finally {
      setBatchLoading(false);
    }
  };

  useEffect(() => {
    // Automatically trigger initial prediction
    handlePredict();
  }, [areas]);

  useEffect(() => {
    if (activeTab === 'batch') {
      handleBatchPredict();
    }
  }, [activeTab, hour, dayOfWeek]);

  return (
    <div className="space-y-6">
      {/* Header with Tab Switcher */}
      <div className="cyber-card p-4 border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-ash-100 flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-accent" />
            Predictive Intelligence & Scenario Studio
          </h2>
          <p className="text-xs text-ash-200 mt-0.5">
            Score a scenario, see the suggested patrol window, and see which inputs moved the estimate.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-ink-200 border border-line p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('single')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'single'
                ? 'bg-cyan-500 text-black '
                : 'text-ash-200 hover:text-ash-100'
            }`}
          >
            Scenario Simulator
          </button>
          <button
            onClick={() => setActiveTab('batch')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'batch'
                ? 'bg-cyan-500 text-black '
                : 'text-ash-200 hover:text-ash-100'
            }`}
          >
            National Batch Grid (100 Zones)
          </button>
        </div>
      </div>

      {activeTab === 'single' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form: Parameter Controls (6 cols) */}
          <div className="lg:col-span-6 cyber-card p-6 border border-line space-y-5">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-sm font-bold text-ash-100 ">
                Incident & Environmental Parameters
              </h3>
              <span className="text-[10px] font-mono text-accent">INPUT TELEMETRY</span>
            </div>

            <form onSubmit={handlePredict} className="space-y-4">
              {/* Surveillance Area Selection */}
              <div>
                <label className="block text-xs font-semibold text-ash-200 mb-1 flex items-center justify-between">
                  <span>Target Surveillance Zone</span>
                  <span className="text-[10px] font-mono text-ash-300">100 GEOFENCED AREAS</span>
                </label>
                <select
                  value={selectedAreaId}
                  onChange={(e) => setSelectedAreaId(e.target.value)}
                  className="w-full bg-ink-200 border border-line rounded-lg px-3 py-2 text-xs text-ash-100 focus:outline-none focus:border-cyan-500 font-sans"
                >
                  {areas.map((a) => (
                    <option key={a.area_id} value={a.area_id}>
                      {a.area_id} - {a.area_name} ({a.state})
                    </option>
                  ))}
                </select>
              </div>

              {/* Time Sliders */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ash-200 mb-1 flex justify-between">
                    <span>Incident Hour</span>
                    <span className="font-mono text-accent">{hour}:00 IST {hour >= 21 || hour <= 4 ? '🌙 Night' : '☀️ Day'}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="23"
                    value={hour}
                    onChange={(e) => setHour(parseInt(e.target.value))}
                    className="w-full accent-cyan-500 h-1.5 bg-ink-300 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ash-200 mb-1 flex justify-between">
                    <span>Day of Week</span>
                    <span className="font-mono text-accent">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][dayOfWeek]}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="6"
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
                    className="w-full accent-cyan-500 h-1.5 bg-ink-300 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Modality & Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ash-200 mb-1">Transaction Modality</label>
                  <select
                    value={txType}
                    onChange={(e) => setTxType(e.target.value)}
                    className="w-full bg-ink-200 border border-line rounded-lg px-3 py-2 text-xs text-ash-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="AEPS_SPOOF">AEPS Biometric Spoof</option>
                    <option value="UPI_FRAUD">UPI Instant Fraud</option>
                    <option value="SIM_CLONE_FRAUD">SIM Clone / OTP Intercept</option>
                    <option value="CARD_SKIMMING">Card Skimming ATM</option>
                    <option value="NET_BANKING_PHISHING">Net Banking Phishing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ash-200 mb-1">Scam Typology</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-ink-200 border border-line rounded-lg px-3 py-2 text-xs text-ash-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="INVESTMENT_MULE_SCAM">Investment Mule Scam</option>
                    <option value="PHISHING_PORTAL">Fake Banking Phishing Portal</option>
                    <option value="JOB_OFFER_FRAUD">Part-Time Task Scam</option>
                    <option value="KYC_EXPIRY_SPOOF">KYC Verification Spoof</option>
                    <option value="SEXTORTION_BLACKMAIL">Blackmail / Extortion</option>
                  </select>
                </div>
              </div>

              {/* Numeric Inputs: Reporting Delay, Amount, Incident Count */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ash-200 mb-1">Reporting Delay</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="5"
                      max="1440"
                      value={reportDelay}
                      onChange={(e) => setReportDelay(parseInt(e.target.value) || 5)}
                      className="w-full bg-ink-200 border border-line rounded-lg px-3 py-1.5 text-xs text-ash-100 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                    <span className="absolute right-2 top-2 text-[10px] text-ash-300">mins</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ash-200 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    min="500"
                    max="500000"
                    step="1000"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 500)}
                    className="w-full bg-ink-200 border border-line rounded-lg px-3 py-1.5 text-xs text-ash-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ash-200 mb-1">Recent Incidents</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={incidentCount}
                    onChange={(e) => setIncidentCount(parseInt(e.target.value) || 0)}
                    className="w-full bg-ink-200 border border-line rounded-lg px-3 py-1.5 text-xs text-ash-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                {loading ? 'Evaluating Model...' : 'Compute Predictive Risk Assessment'}
              </button>
            </form>
          </div>

          {/* Right Panel: Output & Explainable AI (6 cols) */}
          <div className="lg:col-span-6 space-y-6">
            {prediction ? (
              <div className="cyber-card p-6 border border-line space-y-6">
                {/* Risk Score Gauge Banner */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-ink-200 border border-line">
                  <div className="text-center sm:text-left">
                    <span className="text-[10px] font-mono uppercase text-ash-200 font-bold">MODEL-ESTIMATED PROBABILITY</span>
                    <div className="flex items-baseline gap-2 justify-center sm:justify-start mt-1">
                      <span className="text-4xl font-extrabold text-white tracking-tight">
                        {prediction.risk_percentage}%
                      </span>
                      <span className="text-xs text-ash-200 font-mono">
                        (CI: {(prediction.confidence_interval[0] * 100).toFixed(0)}% - {(prediction.confidence_interval[1] * 100).toFixed(0)}%)
                      </span>
                    </div>
                  </div>

                  <RiskBadge level={prediction.risk_level} size="lg" />
                </div>

                {/* Tactical Dispatch Directives */}
                <div className="p-4 rounded-xl bg-ink-200 border border-line space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ash-200 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-accent" />
                      Recommended Surveillance Window:
                    </span>
                    <span className="font-mono text-accent font-bold">{prediction.recommended_patrol_window}</span>
                  </div>

                  <div className="text-xs text-ash-200 pt-1 leading-relaxed">
                    <span className="font-semibold text-ash-100">Tactical Directive: </span>
                    {prediction.recommended_action}
                  </div>
                </div>

                {/* Explainable AI (XAI) Attribution Factors */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-ash-100 flex items-center gap-1.5">
                      <BarChart2 className="w-4 h-4 text-accent" />
                      What moved this estimate
                    </h4>
                    {/* Named honestly. This was labelled "TreeSHAP Weights"; no SHAP library is
                        used anywhere in the project, and the served model is not a tree. */}
                    <span className="text-[10px] font-mono text-ash-300">
                      {prediction.attribution_method ?? 'counterfactual ablation'}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {prediction.contributing_factors.map((factor, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-ink-200 border border-line space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-ash-100">{factor.factor}</span>
                          <span className={`font-mono font-bold ${factor.impact.startsWith('+') ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {factor.impact}
                          </span>
                        </div>
                        <p className="text-[11px] text-ash-200 leading-snug">{factor.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footnote / Disclaimer */}
                <p className="text-[10px] font-mono text-ash-300 border-t border-line pt-3">
                  ⚠️ {prediction.disclaimer}
                </p>
              </div>
            ) : (
              <div className="h-full cyber-card p-8 border border-line flex flex-col items-center justify-center text-center text-ash-300">
                <Crosshair className="w-10 h-10 text-slate-600 animate-spin mb-3" />
                <p className="text-sm font-semibold text-ash-200">Computing real-time scenario risk...</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* National Batch Forecast Grid Table (100 Zones) */
        <div className="cyber-card p-6 border border-line space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
            <div>
              <h3 className="text-sm font-bold text-ash-100 ">
                National 100-Zone Automated Risk Ranking
              </h3>
              <p className="text-xs text-ash-200 mt-0.5">
                Simulated for current window: {hour}:00 IST ({['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][dayOfWeek]})
              </p>
            </div>

            <button
              onClick={handleBatchPredict}
              disabled={batchLoading}
              className="px-3 py-1.5 bg-ink-200 border border-line hover:border-cyan-500 text-xs font-semibold text-accent rounded-lg"
            >
              {batchLoading ? 'Calculating Grid...' : 'Re-calculate National Forecast'}
            </button>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-ink-200 text-ash-200 uppercase font-mono text-[10px] sticky top-0 border-b border-line">
                <tr>
                  <th className="py-2.5 px-3">Area ID</th>
                  <th className="py-2.5 px-3">Surveillance Sector</th>
                  <th className="py-2.5 px-3">State / Jurisdiction</th>
                  <th className="py-2.5 px-3">Risk Probability</th>
                  <th className="py-2.5 px-3">Threat Tier</th>
                  <th className="py-2.5 px-3">ATM Density</th>
                  <th className="py-2.5 px-3">Recommended Patrol Window</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {batchResults.map((item) => (
                  <tr key={item.area_id} className="hover:bg-ink-200 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-accent">{item.area_id}</td>
                    <td className="py-2.5 px-3 text-ash-100 font-medium">{item.area_name}</td>
                    <td className="py-2.5 px-3 text-ash-200">{item.state}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-ash-100">
                      {(item.risk_score * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3">
                      <RiskBadge level={item.risk_level} size="sm" />
                    </td>
                    <td className="py-2.5 px-3 text-ash-200 font-mono">{item.atm_pos_density} ATMs</td>
                    <td className="py-2.5 px-3 font-mono text-cyan-300">{item.recommended_patrol_window}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
