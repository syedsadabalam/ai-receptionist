"use client";

import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Users, PhoneCall, Calendar, ArrowUpRight, ArrowDownRight, Zap, Clock, Star, Target } from 'lucide-react';
import { apiFetch } from '@/utils/api';

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [callStats, setCallStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const [sRes, tRes, cRes] = await Promise.all([
        apiFetch('/api/v1/analytics/summary'),
        apiFetch('/api/v1/analytics/trends'),
        apiFetch('/api/v1/analytics/call-stats')
      ]);
      
      const sData = await sRes.json();
      const tData = await tRes.json();
      const cData = await cRes.json();
      
      setSummary(sData);
      setTrends(tData);
      setCallStats(cData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !summary || !callStats) return <div className="p-8 animate-pulse">Loading intelligence...</div>;

  const totalCalls = summary.total_calls || 0;
  const totalAppts = summary.total_appointments || 0;
  const aiResolved = totalCalls > 0 ? Math.floor(totalCalls * 0.85) : 0; // Simulated resolved rate
  const resolvedPct = totalCalls > 0 ? Math.round((aiResolved / totalCalls) * 100) : 0;
  const bookedPct = totalCalls > 0 ? Math.round((totalAppts / totalCalls) * 100) : 0;
  const successRate = totalCalls > 0 ? (resolvedPct + bookedPct > 100 ? 98.5 : resolvedPct + (bookedPct * 0.5)).toFixed(1) : "0.0";

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Organization Intelligence</h1>
        <p className="text-slate-500">Real-time performance metrics and AI efficiency tracking</p>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Calendar size={20} />
            </div>
            <span className="flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <ArrowUpRight size={10} /> +12%
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">Total Bookings</p>
          <p className="text-2xl font-bold text-slate-900">{summary.total_appointments}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Users size={20} />
            </div>
            <span className="flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <ArrowUpRight size={10} /> +5.2%
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">Total Customers</p>
          <p className="text-2xl font-bold text-slate-900">{summary.total_customers}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Zap size={20} />
            </div>
            <span className="flex items-center text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
              STABLE
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">AI Efficiency</p>
          <p className="text-2xl font-bold text-slate-900">{summary.ai_efficiency}%</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <PhoneCall size={20} />
            </div>
            <span className="flex items-center text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
              <ArrowDownRight size={10} /> -2%
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">Voice Traffic</p>
          <p className="text-2xl font-bold text-slate-900">{summary.total_calls}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart - Volume Trends */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Booking Velocity</h2>
              <p className="text-sm text-slate-500">Number of appointments scheduled per day</p>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">7D</button>
              <button className="px-3 py-1 text-slate-400 hover:bg-slate-50 rounded-lg text-xs font-bold transition-colors">30D</button>
            </div>
          </div>
          
          <div className="h-64 flex items-end justify-between gap-4 px-2">
            {trends.map((item, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                <div className="w-full relative">
                  {/* Tooltip */}
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {item.count} Bookings
                  </div>
                  <div 
                    className="w-full bg-blue-500 rounded-t-lg group-hover:bg-blue-600 transition-all cursor-pointer"
                    style={{ height: `${Math.max(item.count * 30, 20)}px` }}
                  ></div>
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{item.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar - AI Performance */}
        <div className="space-y-8">
          <div className="bg-slate-900 rounded-2xl p-8 text-white shadow-xl shadow-blue-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-white/10 rounded-xl text-blue-400">
                <Target size={20} />
              </div>
              <h2 className="text-lg font-bold">AI Performance</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-slate-400 font-bold uppercase">Success Rate</span>
                  <span className="text-sm font-bold text-emerald-400">{successRate}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400" style={{ width: `${successRate}%` }}></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Total Voice</p>
                  <p className="text-xl font-bold">{callStats.total_voice_minutes}m</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Avg Call</p>
                  <p className="text-xl font-bold">{callStats.avg_call_duration}s</p>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <Clock size={16} className="text-blue-400" />
                  <span>Peak Hours: <span className="text-white font-bold">{callStats.peak_hour}</span></span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Conversion Funnel</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold">1</div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-bold text-slate-600 uppercase">Incoming Calls ({totalCalls})</span>
                    <span className="text-slate-400">100%</span>
                  </div>
                  <div className="h-1 bg-blue-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: '100%' }}></div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center text-xs font-bold">2</div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-bold text-slate-600 uppercase">AI Resolved ({aiResolved})</span>
                    <span className="text-slate-400">{resolvedPct}%</span>
                  </div>
                  <div className="h-1 bg-purple-100 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500" style={{ width: `${resolvedPct}%` }}></div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-bold">3</div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-bold text-slate-600 uppercase">Booked Appts ({totalAppts})</span>
                    <span className="text-slate-400">{bookedPct}%</span>
                  </div>
                  <div className="h-1 bg-emerald-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${bookedPct}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
