import { auraFetch as fetch } from '../api-client';
import React, { useState, useEffect } from 'react';
import {
  Phone,
  Database,
  Zap,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

export default function AutomationDashboard() {
  const [leads, setLeads] = useState<any[]>([]);
  const [stats, setStats] = useState({ activeCalls: 0, ordersTaken: 0, pendingLeads: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [customerName,setName] = useState('');
  const [phone,setPhone] = useState('');
  const [product,setProduct] = useState('');
  const [error,setError] = useState('');

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/leads');
      if (response.ok) {
        const data = await response.json();
        setLeads(data.leads || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleSyncNewLead = async () => {
    setIsSyncing(true); setError('');
    try {
      const response = await fetch('/api/leads/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName, phone,
          product,
          notes: '',
        }),
      });
      if (response.ok) {
        await fetchLeads(); setName(''); setPhone(''); setProduct('');
      } else setError((await response.json()).error || 'Unable to save lead.');
    } catch (e) {
      console.error('Error syncing lead:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 bg-[#0a0a0d] min-h-screen text-white pb-safe">
      <div className="grid sm:grid-cols-3 gap-3">
        <input aria-label="Customer name" placeholder="Customer name" value={customerName} onChange={e=>setName(e.target.value)} className="bg-neutral-900 border border-neutral-700 rounded-lg p-3"/>
        <input aria-label="Phone" placeholder="+88017…" value={phone} onChange={e=>setPhone(e.target.value)} className="bg-neutral-900 border border-neutral-700 rounded-lg p-3"/>
        <input aria-label="Product" placeholder="Product / campaign" value={product} onChange={e=>setProduct(e.target.value)} className="bg-neutral-900 border border-neutral-700 rounded-lg p-3"/>
      </div>
      {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Automation & Call Pipeline</h1>
          <p className="text-neutral-400 text-xs sm:text-sm">Real-time AI outbound management</p>
        </div>
        <button
          onClick={handleSyncNewLead}
          disabled={isSyncing}
          className="bg-indigo-600 px-4 py-2.5 rounded-xl flex items-center justify-center space-x-2 text-sm font-semibold hover:bg-indigo-500 transition-colors shrink-0 active:scale-95 min-h-[44px] disabled:opacity-50"
        >
          {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
          <span>{isSyncing ? 'Syncing...' : 'Add lead'}</span>
        </button>
      </header>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#121217] p-4 rounded-xl border border-[#22222a]">
          <div className="flex items-center space-x-2 text-indigo-400 mb-2">
            <Phone size={20} />
            <span className="font-semibold text-xs uppercase tracking-wider">Active Calls</span>
          </div>
          <p className="text-3xl font-bold font-mono">{stats.activeCalls}</p>
        </div>
        <div className="bg-[#121217] p-4 rounded-xl border border-[#22222a]">
          <div className="flex items-center space-x-2 text-green-400 mb-2">
            <CheckCircle size={20} />
            <span className="font-semibold text-xs uppercase tracking-wider">Orders Taken</span>
          </div>
          <p className="text-3xl font-bold font-mono">{stats.ordersTaken}</p>
        </div>
        <div className="bg-[#121217] p-4 rounded-xl border border-[#22222a]">
          <div className="flex items-center space-x-2 text-amber-400 mb-2">
            <AlertCircle size={20} />
            <span className="font-semibold text-xs uppercase tracking-wider">Pending Leads</span>
          </div>
          <p className="text-3xl font-bold font-mono">{stats.pendingLeads}</p>
        </div>
      </div>

      <div className="bg-[#121217] rounded-xl border border-[#22222a] overflow-x-auto min-h-[300px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px] text-neutral-500">
            <Loader2 className="animate-spin mr-2" />
            Loading live leads...
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-neutral-500 space-y-4 p-4 text-center">
            <Database size={48} className="opacity-20" />
            <p>No active leads found. Click "Sync New Leads" to import.</p>
          </div>
        ) : (
          <table className="w-full text-left min-w-[600px] text-xs">
            <thead className="border-b border-[#22222a] text-neutral-400 uppercase tracking-wider text-[10px] bg-[#16161c]">
              <tr>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Product / Ingestion</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e24]">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-[#181820] transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-white">
                    <div>{lead.customerName}</div>
                    <div className="text-[10px] text-neutral-400 font-normal">{lead.notes}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-neutral-300">{lead.phone}</td>
                  <td className="py-3.5 px-4 text-neutral-300">{lead.product}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      lead.status === 'completed'
                        ? 'bg-green-950 text-green-300 border border-green-800'
                        : lead.status === 'in-progress'
                        ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-neutral-400 text-[10px]">{lead.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
