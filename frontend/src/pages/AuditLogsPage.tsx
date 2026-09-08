import React, { useState, useEffect } from 'react';
import { FileText, Search, Filter, ShieldCheck, Download, Clock } from 'lucide-react';
import { apiService } from '../services/api';
import { AuditLogItem } from '../types';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterAction, setFilterAction] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await apiService.getAuditLogs(filterAction || undefined, 100);
      setLogs(data);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filterAction]);

  const filteredLogs = logs.filter(l => 
    l.actor_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.resource.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="cyber-card p-4 border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-ash-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent" />
            Compliance & System Audit Ledger
          </h2>
          <p className="text-xs text-ash-200 mt-0.5">
            Append-only record of every authentication, prediction and threshold change. There is no delete or update endpoint — but this is not a cryptographic hash chain, and it does not claim to be.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-3 py-1 rounded-full flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Append-only
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="cyber-card p-4 border border-line flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-ash-300 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search email, action, resource..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-ink-200 border border-line rounded-lg pl-9 pr-3 py-1.5 text-xs text-ash-100 focus:outline-none focus:border-cyan-500 w-64"
            />
          </div>

          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="bg-ink-200 border border-line rounded-lg px-3 py-1.5 text-xs text-ash-100 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Action Types</option>
            <option value="PREDICTION">Predictions</option>
            <option value="USER">User Provisions</option>
            <option value="SYSTEM">System Events</option>
          </select>
        </div>

        <span className="text-xs font-mono text-ash-300">
          Showing {filteredLogs.length} records
        </span>
      </div>

      {/* Logs Table */}
      <div className="cyber-card border border-line overflow-hidden">
        <div className="overflow-x-auto max-h-[550px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-ink-200 text-ash-200 uppercase font-mono text-[10px] sticky top-0 border-b border-line">
              <tr>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Officer Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Action Code</th>
                <th className="py-3 px-4">Endpoint / Resource</th>
                <th className="py-3 px-4">Telemetry Details</th>
                <th className="py-3 px-4">Origin IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-ink-200 transition-colors">
                  <td className="py-3 px-4 font-mono text-ash-200 whitespace-nowrap">{log.timestamp}</td>
                  <td className="py-3 px-4 font-semibold text-ash-100">{log.actor_email}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-ink-300 text-ash-200">
                      {log.actor_role}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-accent font-bold">{log.action}</td>
                  <td className="py-3 px-4 font-mono text-ash-200">{log.resource}</td>
                  <td className="py-3 px-4 text-ash-200 max-w-xs truncate" title={log.details}>
                    {log.details}
                  </td>
                  <td className="py-3 px-4 font-mono text-ash-300">{log.ip_address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
