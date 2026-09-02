"use client";

import React, { useEffect, useState } from 'react';
import { Users, Search, Phone, Mail, Calendar, ChevronRight, X, Clock, FileText, PhoneCall, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { apiFetch } from '@/utils/api';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [history, setHistory] = useState<any | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await apiFetch('/api/v1/customers/');
      const data = await res.json();
      setCustomers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (customerId: number) => {
    setHistoryLoading(true);
    try {
      const res = await apiFetch(`/api/v1/customers/${customerId}/history`);
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCustomerClick = (customer: any) => {
    setSelectedCustomer(customer);
    fetchHistory(customer.id);
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customer Directory</h1>
          <p className="text-slate-500">Manage customer records and history</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search customers..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64 shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-200">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer Name</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Last Visit</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Visits</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={6} className="px-6 py-4 h-16 bg-slate-50/20"></td>
                </tr>
              ))
            ) : filteredCustomers.map((customer) => (
              <tr 
                key={customer.id} 
                onClick={() => handleCustomerClick(customer)}
                className="hover:bg-slate-50 transition-colors cursor-pointer group"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                      {customer.name.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{customer.name}</p>
                      <p className="text-xs text-slate-400">ID: #{customer.id.toString().padStart(4, '0')}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone size={12} className="text-slate-400" />
                      {customer.phone}
                    </div>
                    {customer.email && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail size={12} className="text-slate-400" />
                        {customer.email}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    customer.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {customer.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                  {customer.last_visit ? format(parseISO(customer.last_visit), 'MMM dd, yyyy') : 'No visits'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${Math.min(customer.total_appointments * 20, 100)}%` }}></div>
                    </div>
                    <span className="text-sm text-slate-600 font-bold">{customer.total_appointments}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Customer Detail Sidebar */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedCustomer(null)}></div>
          <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Sidebar Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
              <div className="flex gap-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl font-bold shadow-lg shadow-blue-200">
                  {selectedCustomer.name.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{selectedCustomer.name}</h2>
                  <div className="flex gap-4 mt-2">
                    <span className="text-sm text-slate-500 flex items-center gap-1.5">
                      <Phone size={14} /> {selectedCustomer.phone}
                    </span>
                    <span className="text-sm text-slate-500 flex items-center gap-1.5">
                      <Mail size={14} /> {selectedCustomer.email || "No email"}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {historyLoading ? (
                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-slate-500 font-medium">Loading history...</p>
                </div>
              ) : history && (
                <>
                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Total Visits</p>
                      <p className="text-2xl font-bold text-slate-900">{history.appointments.length}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Total Calls</p>
                      <p className="text-2xl font-bold text-slate-900">{history.calls.length}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Reliability</p>
                      <p className="text-2xl font-bold text-emerald-600">100%</p>
                    </div>
                  </div>

                  {/* Appointments Timeline */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <Calendar size={18} className="text-blue-500" />
                      Appointment History
                    </h3>
                    <div className="space-y-4">
                      {history.appointments.map((appt: any) => (
                        <div key={appt.id} className="flex gap-4 group">
                          <div className="flex flex-col items-center">
                            <div className={`w-3 h-3 rounded-full mt-1.5 ${
                              appt.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500'
                            }`}></div>
                            <div className="w-px flex-1 bg-slate-100 my-1 group-last:hidden"></div>
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-colors">
                              <div className="flex justify-between items-start mb-2">
                                <p className="font-bold text-slate-900">{appt.service}</p>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                  appt.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {appt.status}
                                </span>
                              </div>
                              <div className="flex gap-4 text-xs text-slate-500">
                                <span className="flex items-center gap-1"><Clock size={12}/> {format(parseISO(appt.date), 'MMM dd, yyyy @ h:mm a')}</span>
                                <span className="flex items-center gap-1 font-medium text-slate-700"><Users size={12}/> {appt.provider}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Call History */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <PhoneCall size={18} className="text-purple-500" />
                      AI Conversation Logs
                    </h3>
                    <div className="space-y-4">
                      {history.calls.map((call: any) => (
                        <div key={call.id} className="bg-slate-50 rounded-xl p-4 border border-slate-100 hover:bg-white hover:border-slate-300 transition-all cursor-pointer">
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg">
                                <Clock size={14} />
                              </div>
                              <span className="text-sm font-bold text-slate-900">{format(parseISO(call.date), 'MMM dd, yyyy')}</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{Math.floor(call.duration/60)}m {call.duration%60}s</span>
                          </div>
                          <p className="text-sm text-slate-600 line-clamp-2 italic">
                            "{call.transcript || "No transcript available for this call."}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Sidebar Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
              <a 
                href={`tel:${selectedCustomer.phone}`}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
              >
                <Phone size={16} /> Call Customer
              </a>
              {selectedCustomer.email && (
                <a 
                  href={`mailto:${selectedCustomer.email}`}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Mail size={16} /> Send Email
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
