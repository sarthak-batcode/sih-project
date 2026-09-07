import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, Layers, PieChart as PieIcon, ShieldAlert } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { apiService } from '../services/api';

const COLORS = ['#06B6D4', '#3B82F6', '#6366F1', '#EC4899', '#F59E0B', '#10B981'];

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        const res = await apiService.getAnalyticsTrends();
        setData(res);
      } catch (err) {
        console.error('Failed to load analytics trends:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrends();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="cyber-card p-4 border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-ash-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-accent" />
            Cybercrime Trends & Temporal Analytics
          </h2>
          <p className="text-xs text-ash-200 mt-0.5">
            Statistical behavioral patterns across scam typologies, transfer modalities, and amount brackets.
          </p>
        </div>

        <span className="text-xs font-mono text-accent bg-accent-soft border border-accent/25 px-3 py-1 rounded-full">
          Telemetry Span: 90 Days
        </span>
      </div>

      {/* Grid: Scam Categories vs Modalities */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Scam Category Breakdown (6 cols) */}
        <div className="lg:col-span-6 cyber-card p-6 border border-line">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-ash-100 ">
              Scam Typology vs. Cash-Out Conversion
            </h3>
            <span className="text-[10px] font-mono text-ash-200">Cases vs Likelihood</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data?.category_breakdown || [
                  { category: 'INVESTMENT_MULE', count: 4800, cash_out_rate: 82.4 },
                  { category: 'PHISHING_PORTAL', count: 3750, cash_out_rate: 68.1 },
                  { category: 'JOB_OFFER_FRAUD', count: 3000, cash_out_rate: 74.5 },
                  { category: 'KYC_EXPIRY_SPOOF', count: 1950, cash_out_rate: 79.2 },
                  { category: 'SEXTORTION_BLACKMAIL', count: 1500, cash_out_rate: 54.0 },
                ]}
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis 
                  dataKey="category" 
                  stroke="#64748B" 
                  fontSize={10} 
                  angle={-15} 
                  textAnchor="end"
                  tickFormatter={(val) => val.split('_')[0]} 
                />
                <YAxis stroke="#64748B" fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="cash_out_rate" name="Cash-Out Risk %" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Transaction Modalities Donut Chart (6 cols) */}
        <div className="lg:col-span-6 cyber-card p-6 border border-line">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-ash-100 ">
              Initial Transfer Modality Distribution
            </h3>
            <span className="text-[10px] font-mono text-accent">UPI / AEPS Heavy</span>
          </div>

          <div className="h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.transaction_type_breakdown || [
                    { transaction_type: 'UPI_FRAUD', count: 6750 },
                    { transaction_type: 'AEPS_SPOOF', count: 3000 },
                    { transaction_type: 'SIM_CLONE_FRAUD', count: 2250 },
                    { transaction_type: 'CARD_SKIMMING', count: 1800 },
                    { transaction_type: 'NET_BANKING', count: 1200 },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="count"
                  nameKey="transaction_type"
                >
                  {(data?.transaction_type_breakdown || [1,2,3,4,5]).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  formatter={(val) => <span className="text-ash-200">{val}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Regional Surveillance Risk Matrix Table */}
      <div className="cyber-card p-6 border border-line space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-ash-100 ">
              Regional Risk & ATM Density Matrix
            </h3>
            <p className="text-xs text-ash-200 mt-0.5">
              Aggregated across 5 major geographic economic nodes
            </p>
          </div>

          <span className="text-xs font-mono text-ash-300">Live GROUP BY</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-ink-200 text-ash-200 uppercase font-mono text-[10px] border-b border-line">
              <tr>
                <th className="py-2.5 px-4">Regional Center</th>
                <th className="py-2.5 px-4">Composite Threat Index</th>
                <th className="py-2.5 px-4">Reported Cyber Complaints</th>
                <th className="py-2.5 px-4">Cash-Out Interceptions</th>
                <th className="py-2.5 px-4">Avg ATM/POS Density</th>
                <th className="py-2.5 px-4">Surveillance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {(data?.regional_risk_matrix || []).map((row: any) => (
                <tr key={row.region} className="hover:bg-ink-200 transition-colors">
                  <td className="py-3 px-4 font-bold text-ash-100">{row.region}</td>
                  <td className="py-3 px-4 font-mono font-bold text-accent">
                    {(row.avg_risk * 100).toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-ash-200">{row.complaints.toLocaleString()}</td>
                  <td className="py-3 px-4 text-rose-400 font-semibold">{row.cash_outs.toLocaleString()}</td>
                  <td className="py-3 px-4 text-ash-200 font-mono">{row.atm_density_avg} ATMs / grid</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
                      ● Active Patrol
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
