"use client";

import React, { useEffect, useState } from 'react';
import { Stethoscope, Calendar, Clock, User, Award, ArrowRight, X, UserSquare2, ChevronRight, Activity, Edit2 } from 'lucide-react';
import { format, parseISO, isToday } from 'date-fns';
import { getIndustryTerminology } from '@/utils/terminology';
import { apiFetch } from '@/utils/api';

export default function ProvidersPage() {
  const [industry, setIndustry] = useState<string | null>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<any | null>(null);
  const [schedule, setSchedule] = useState<any | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [newDoctor, setNewDoctor] = useState({ 
    name: '', 
    specialty: 'General Dentist',
    open_time: '09:00',
    close_time: '17:00'
  });

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const orgRes = await apiFetch('/api/v1/settings/');
      if (orgRes.ok) {
        const settingsData = await orgRes.json();
        setIndustry(settingsData.organization?.industry || 'Clinic');
      }

      const res = await apiFetch('/api/v1/providers/');
      const data = await res.json();
      setProviders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (provider: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditMode(true);
    setEditingProviderId(provider.id);
    setNewDoctor({
      name: provider.name,
      specialty: provider.specialty,
      open_time: provider.open_time || '09:00',
      close_time: provider.close_time || '17:00'
    });
    setIsAddModalOpen(true);
  };

  const handleSubmitDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = isEditMode 
        ? `/api/v1/providers/${editingProviderId}` 
        : '/api/v1/providers/create';
      
      const method = isEditMode ? 'PATCH' : 'POST';

      const res = await apiFetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newDoctor })
      });
      if (res.ok) {
        setIsAddModalOpen(false);
        setIsEditMode(false);
        setEditingProviderId(null);
        setNewDoctor({ 
          name: '', 
          specialty: 'General Dentist',
          open_time: '09:00',
          close_time: '17:00'
        });
        fetchProviders();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDoctor = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    
    setIsDeleting(true);
    try {
      const res = await apiFetch(`/api/v1/providers/${editingProviderId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setIsAddModalOpen(false);
        setIsEditMode(false);
        setEditingProviderId(null);
        setDeleteConfirm(false);
        setSelectedProvider(null);
        fetchProviders();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };


  const fetchSchedule = async (providerId: number) => {
    setScheduleLoading(true);
    try {
      const res = await apiFetch(`/api/v1/providers/${providerId}/schedule`);
      const data = await res.json();
      setSchedule(data);
    } catch (err) {
      console.error(err);
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleProviderClick = (provider: any) => {
    setSelectedProvider(provider);
    fetchSchedule(provider.id);
  };

  const terms = getIndustryTerminology(industry);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{terms.teamTitle}</h1>
          <p className="text-slate-500">{terms.teamSubtitle}</p>
        </div>
        <button 
          onClick={() => {
            setIsEditMode(false);
            setDeleteConfirm(false);
            setNewDoctor({ name: '', specialty: terms.defaultSpecialty, open_time: '09:00', close_time: '17:00' });
            setIsAddModalOpen(true);
          }}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center gap-2"
        >
          <User size={18} /> {terms.addButton}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse h-64"></div>
          ))
        ) : providers.map((provider) => (
          <div 
            key={provider.id}
            onClick={() => handleProviderClick(provider)}
            className="bg-white rounded-2xl border border-slate-200 p-6 hover:border-blue-500 hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className="flex items-start justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">
                  {provider.name.split(' ').map((n: string) => n[1] === '.' ? '' : n[0]).join('')}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{provider.name}</h3>
                  <p className="text-sm text-blue-600 font-semibold">{provider.specialty}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase">
                  {provider.status}
                </span>
                <button 
                  aria-label={`Edit ${provider.name}`}
                  onClick={(e) => handleOpenEdit(provider, e)}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-8 relative z-10">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Today's Load</p>
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-slate-400" />
                  <span className="text-sm font-bold text-slate-900">{provider.today_appointments} Appts</span>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Total Customers</p>
                <div className="flex items-center gap-2">
                  <UserSquare2 size={14} className="text-slate-400" />
                  <span className="text-sm font-bold text-slate-900">{provider.total_appointments}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between text-sm text-slate-500 font-medium group-hover:text-blue-600 transition-colors relative z-10">
              <span className="flex items-center gap-1.5">
                <Clock size={14}/> 
                {provider.open_time && provider.close_time 
                  ? `${provider.open_time} - ${provider.close_time}` 
                  : "9:00 AM - 5:00 PM"}
              </span>
              <ChevronRight size={18} className="translate-x-0 group-hover:translate-x-1 transition-transform" />
            </div>

            {/* Subtle background pattern */}
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
              <Stethoscope size={160} />
            </div>
          </div>
        ))}
      </div>

      {/* Provider Schedule Sidebar */}
      {selectedProvider && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedProvider(null)}></div>
          <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
              <div className="flex gap-4">
                <div className="w-14 h-14 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xl font-bold shadow-lg shadow-blue-200">
                  {selectedProvider.name.split(' ').map((n: string) => n[1] === '.' ? '' : n[0]).join('')}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selectedProvider.name}</h2>
                  <p className="text-sm text-blue-600 font-semibold">{selectedProvider.specialty}</p>
                </div>
              </div>
              <button onClick={() => setSelectedProvider(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {scheduleLoading ? (
                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-slate-500 font-medium">{terms.fetchScheduleMsg}</p>
                </div>
              ) : schedule && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Weekly Agenda</h3>
                    <div className="space-y-4">
                      {schedule.appointments.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                          <Calendar size={32} className="text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-500 font-medium">No appointments scheduled for this week.</p>
                        </div>
                      ) : (
                        schedule.appointments.map((appt: any) => (
                          <div key={appt.id} className="flex gap-4 group">
                            <div className="w-20 pt-1">
                              <p className="text-xs font-bold text-slate-900">{format(parseISO(appt.start_time), 'h:mm a')}</p>
                              <p className="text-[10px] text-slate-400 uppercase font-medium">{format(parseISO(appt.start_time), 'MMM dd')}</p>
                            </div>
                            <div className="flex-1 pb-6">
                              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-blue-500 transition-colors relative overflow-hidden">
                                {isToday(parseISO(appt.start_time)) && (
                                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                                )}
                                <div className="flex justify-between items-start mb-1">
                                  <p className="font-bold text-slate-900">{appt.customer_name}</p>
                                  <Award size={14} className="text-blue-500" />
                                </div>
                                <p className="text-sm text-slate-500 font-medium">{appt.service || 'General Service'}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {/* <div className="p-6 border-t border-slate-100 bg-slate-50/50">
              <button className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-slate-200">
                <Calendar size={18} /> Manage Working Hours
              </button>
            </div> */}
          </div>
        </div>
      )}

      {/* Add Provider Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)}></div>
          <div className="relative bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {isEditMode ? `Edit ${terms.providerTitle} Profile` : `Add New ${terms.providerTitle}`}
              </h2>
              <button 
                onClick={() => {
                  setIsAddModalOpen(false);
                  setDeleteConfirm(false);
                }} 
                className="text-slate-300 hover:text-slate-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitDoctor} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{terms.providerNameLabel}</label>
                <input 
                  autoFocus
                  required
                  placeholder={terms.providerPlaceholder}
                  value={newDoctor.name}
                  onChange={(e) => setNewDoctor({...newDoctor, name: e.target.value})}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-900"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{terms.specialtyLabel}</label>
                <div className="relative">
                  <select 
                    value={newDoctor.specialty}
                    onChange={(e) => setNewDoctor({...newDoctor, specialty: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold appearance-none text-slate-900"
                  >
                    {terms.specialties.map(spec => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </select>
                  <ChevronRight size={18} className="absolute right-6 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Shift Start</label>
                  <input 
                    type="time"
                    value={newDoctor.open_time}
                    onChange={(e) => setNewDoctor({...newDoctor, open_time: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Shift End</label>
                  <input 
                    type="time"
                    value={newDoctor.close_time}
                    onChange={(e) => setNewDoctor({...newDoctor, close_time: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-4">
                {isEditMode && (
                  <button 
                    type="button"
                    onClick={handleDeleteDoctor}
                    disabled={isDeleting || loading}
                    className={`py-5 font-black rounded-2xl transition-all shadow-xl disabled:opacity-50 flex-1 flex items-center justify-center gap-2 ${deleteConfirm ? 'bg-rose-600 text-white shadow-rose-200 hover:bg-rose-700' : 'bg-rose-50 text-rose-600 shadow-none hover:bg-rose-100'}`}
                  >
                    {isDeleting ? <Activity className="animate-spin" size={20} /> : <X size={20} />}
                    {isDeleting ? 'Deleting...' : deleteConfirm ? 'Are you sure?' : `Delete ${terms.providerTitle}`}
                  </button>
                )}
                <button 
                  type="submit"
                  disabled={loading || isDeleting}
                  className={`py-5 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 disabled:opacity-50 flex items-center justify-center gap-2 ${isEditMode ? 'flex-[2]' : 'w-full'}`}
                >
                  {loading ? <Activity className="animate-spin" size={20} /> : isEditMode ? <Edit2 size={20} /> : <User size={20} />}
                  {loading ? 'Processing...' : isEditMode ? 'Save Changes' : terms.confirmAddBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
