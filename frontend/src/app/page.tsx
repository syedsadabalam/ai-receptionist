"use client";

import React from 'react';
import Link from 'next/link';
import { apiFetch } from '@/utils/api';
import { 
  LayoutDashboard, 
  Calendar, 
  PhoneCall, 
  Users, 
  UserSquare2, 
  Settings, 
  BarChart3, 
  MessageSquare,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const SidebarItem = ({ icon: Icon, label, active = false }: { icon: any, label: string, active?: boolean }) => (
  <div className={cn(
    "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors text-slate-500 hover:bg-slate-100",
    active && "bg-blue-50 text-blue-600 border-r-4 border-blue-600 hover:bg-blue-50"
  )}>
    <Icon size={20} />
    <span className="font-medium text-sm">{label}</span>
  </div>
);

const StatCard = ({ title, value, change, icon: Icon, trend }: { title: string, value: string, change?: string, icon: any, trend?: 'up' | 'down' | 'neutral' }) => (
  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-slate-50 rounded-lg text-slate-600">
        <Icon size={20} />
      </div>
      {change && (
        <div className={cn(
          "flex items-center gap-1 text-xs font-medium text-slate-400",
          trend === 'up' && "text-emerald-600",
          trend === 'down' && "text-rose-600"
        )}>
          {trend && trend !== 'neutral' && <TrendingUp size={12} className={trend === 'down' ? 'rotate-180' : ''} />}
          {change}
        </div>
      )}
    </div>
    <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">{title}</h3>
    <p className="text-2xl font-bold text-slate-900">{value}</p>
  </div>
);

export default function Dashboard() {
  const [appointments, setAppointments] = React.useState<any[]>([]);
  const [calls, setCalls] = React.useState<any[]>([]);
  const [stats, setStats] = React.useState({ calls: 0, booked: 0, avgDuration: "00:00" });
  const [outcomes, setOutcomes] = React.useState([{name: 'No Data', value: 1}]);
  const [chartData, setChartData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Fetch real data from backend
    const fetchData = async () => {
      try {
        const apptRes = await apiFetch('/api/v1/appointments/all');
        if (!apptRes.ok) throw new Error("Failed to fetch appointments");
        const appts = await apptRes.json();
        setAppointments(appts);
        
        const callRes = await apiFetch('/api/v1/calls/');
        if (!callRes.ok) throw new Error("Failed to fetch calls");
        const callLogs = await callRes.json();
        setCalls(callLogs);

        let totalDuration = 0;
        callLogs.forEach((c: any) => { totalDuration += (c.duration_seconds || 0); });
        const avgDurationSecs = callLogs.length ? Math.floor(totalDuration / callLogs.length) : 0;
        const avgDurationStr = `${Math.floor(avgDurationSecs / 60).toString().padStart(2, '0')}:${(avgDurationSecs % 60).toString().padStart(2, '0')}`;

        setStats({ calls: callLogs.length, booked: appts.length, avgDuration: avgDurationStr });

        // Calculate Line Chart Data
        const chartDataMap = new Map();
        callLogs.forEach((c: any) => {
          const d = new Date(c.created_at);
          const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          chartDataMap.set(dateStr, (chartDataMap.get(dateStr) || 0) + 1);
        });
        
        // Fill last 7 days
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          last7Days.push({
            name: dateStr,
            calls: chartDataMap.get(dateStr) || 0
          });
        }
        setChartData(last7Days);

        // Calculate dynamic pie chart data
        let booked = 0;
        let info = 0;
        let voicemail = 0;
        let other = 0;

        callLogs.forEach((c: any) => {
          const status = (c.status || '').toLowerCase();
          if (status.includes('book') || status.includes('transfer')) booked++;
          else if (status.includes('voicemail')) voicemail++;
          else if (status.includes('info') || status.includes('customer-ended')) info++;
          else other++;
        });

        const calculatedOutcomes = [
          { name: 'Action Taken', value: booked },
          { name: 'Info / Ended', value: info },
          { name: 'Voicemail', value: voicemail },
          { name: 'Other', value: other }
        ].filter(o => o.value > 0);

        setOutcomes(calculatedOutcomes.length > 0 ? calculatedOutcomes : [{ name: 'No Calls Yet', value: 1 }]);

      } catch (err: any) {
        console.error("Failed to fetch data:", err);
        setError(err.message || "Failed to load dashboard data. Is the backend running?");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-full min-h-[400px] text-red-500 font-medium bg-red-50 rounded-xl border border-red-100 p-8">
        <AlertCircle className="w-6 h-6 mr-3" /> {error}
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
          <p className="text-slate-500 text-sm">Welcome back. Here is what's happening today.</p>
        </div>
      </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard title="Total Calls" value={stats.calls.toString()} icon={PhoneCall} />
              <StatCard title="Appointments Booked" value={stats.booked.toString()} icon={Calendar} />
              <StatCard title="Conversion Rate" value={stats.calls > 0 ? `${((stats.booked / stats.calls) * 100).toFixed(1)}%` : '0%'} icon={TrendingUp} />
              <StatCard title="Avg. Call Duration" value={stats.avgDuration} icon={Clock} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              {/* Main Chart */}
              <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-slate-900">Calls Over Time</h3>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-md">Last 7 Days</span>
                  </div>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dx={-10} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Line type="monotone" dataKey="calls" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Pie Chart */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <h3 className="font-bold text-slate-900 mb-6">Call Outcomes</h3>
                <div className="flex-1 min-h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={outcomes}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {outcomes.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3 mt-4">
                  {outcomes.map((outcome, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                        <span className="text-slate-600">{outcome.name}</span>
                      </div>
                      <span className="font-bold">{outcome.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* Upcoming Appointments */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-slate-900">Upcoming Appointments</h3>
                  <Link href="/appointments" className="text-blue-600 text-xs font-bold uppercase tracking-wider hover:underline">View All</Link>
                </div>
                <div className="divide-y divide-slate-100">
                  {appointments.length > 0 ? appointments.slice(0, 5).map((appt, i) => (
                    <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="text-center w-12 py-1 bg-blue-50 text-blue-600 rounded-lg font-bold text-xs">
                          {new Date(appt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{appt.customer_name || 'New Customer'}</p>
                          <p className="text-[10px] text-slate-400 font-medium uppercase">{appt.service_name} • {appt.provider_name}</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${appt.status === 'scheduled' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {appt.status}
                      </div>
                    </div>
                  )) : (
                    <div className="p-8 text-center text-slate-400 text-sm">No appointments yet</div>
                  )}
                </div>
              </div>

              {/* Recent Calls */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-slate-900">Recent Calls</h3>
                  <Link href="/transcripts" className="text-blue-600 text-xs font-bold uppercase tracking-wider hover:underline">View All</Link>
                </div>
                <div className="divide-y divide-slate-100">
                  {calls.length > 0 ? calls.slice(0, 5).map((call, i) => (
                    <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
                          <PhoneCall size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{call.customer_phone || 'Web Caller'}</p>
                          <p className="text-[10px] text-slate-400 font-medium uppercase">{new Date(call.created_at).toLocaleTimeString()} • {Math.floor(call.duration_seconds || 0)}s</p>
                        </div>
                      </div>
                      <div className="text-sm font-medium text-slate-600 capitalize">{call.status?.replace(/-/g, ' ')}</div>
                    </div>
                  )) : (
                    <div className="p-8 text-center text-slate-400 text-sm">No calls recorded yet</div>
                  )}
                </div>
              </div>
            </div>
    </>
  );
}
