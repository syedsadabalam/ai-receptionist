"use client";

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/utils/api';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, Trash2, Clock, Briefcase } from 'lucide-react';

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newService, setNewService] = useState({ name: '', duration_minutes: 30, price: 0 });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const res = await apiFetch('/api/v1/services/');
      if (res.ok) setServices(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newService.name) return;
    try {
      const res = await apiFetch('/api/v1/services/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newService)
      });
      if (res.ok) {
        setNewService({ name: '', duration_minutes: 30, price: 0 });
        fetchServices();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await apiFetch(`/api/v1/services/${id}`, { method: 'DELETE' });
      if (res.ok) fetchServices();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Services</h1>
        <p className="text-slate-500">Manage the services your organization offers.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900">Add New Service</h3>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Service Name</label>
              <input 
                type="text" 
                value={newService.name}
                onChange={(e) => setNewService({...newService, name: e.target.value})}
                placeholder="e.g. Checkup"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Duration (Minutes)</label>
              <input 
                type="number" 
                value={newService.duration_minutes}
                onChange={(e) => setNewService({...newService, duration_minutes: parseInt(e.target.value) || 30})}
                min="5"
                step="5"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Price ($)</label>
              <input 
                type="number" 
                value={newService.price}
                onChange={(e) => setNewService({...newService, price: parseFloat(e.target.value) || 0})}
                min="0"
                step="0.01"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                required
              />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
              <Plus size={16} /> Add Service
            </button>
          </form>
        </div>
        
        <div className="md:col-span-2">
          {loading ? (
            <div className="animate-pulse bg-white border border-slate-200 rounded-xl h-64"></div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="divide-y divide-slate-100">
                {services.length > 0 ? services.map(service => (
                  <div key={service.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Briefcase size={20} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{service.name}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                          <Clock size={12} /> {service.duration_minutes} minutes &bull; ${service.price?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                    </div>
                    <button aria-label={`Delete ${service.name}`} onClick={() => handleDelete(service.id)} className="text-slate-400 hover:text-rose-600 transition-colors p-2 rounded-lg hover:bg-rose-50">
                      <Trash2 size={18} />
                    </button>
                  </div>
                )) : (
                  <div className="p-8 text-center text-slate-500">No services added yet.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
