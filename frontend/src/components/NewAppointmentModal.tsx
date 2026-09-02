"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { X, User, Phone, Stethoscope, Calendar as CalendarIcon, Clock, CheckCircle2, ChevronRight, ChevronLeft, AlertTriangle, ShieldAlert, Loader2 } from 'lucide-react';
import { format, addDays, startOfToday, isSameDay, parseISO } from 'date-fns';
import { useModal } from '@/context/ModalContext';
import { useToast } from '@/context/ToastContext';
import { getIndustryTerminology } from '@/utils/terminology';
import { apiFetch } from '@/utils/api';

export default function NewAppointmentModal() {
  const { isNewAppointmentModalOpen, closeNewAppointmentModal } = useModal();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  
  // Form State
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [isEmergency, setIsEmergency] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [confirmedId, setConfirmedId] = useState<number | null>(null);
  
  // Data State
  const [industry, setIndustry] = useState<string | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  function resetForm() {
    setStep(1);
    setCustomerPhone('');
    setCustomerName('');
    setCustomerId(null);
    setIsEmergency(false);
    setSelectedService(null);
    setSelectedProvider(null);
    setSelectedDate(startOfToday());
    setSelectedSlot(null);
    setNotes('');
  }

  async function fetchInitialData() {
    try {
      const [sRes, pRes, orgRes] = await Promise.all([
        apiFetch('/api/v1/appointments/services'),
        apiFetch('/api/v1/appointments/providers'),
        apiFetch('/api/v1/settings/')
      ]);
      setServices(await sRes.json());
      setProviders(await pRes.json());
      if (orgRes.ok) {
        const settingsData = await orgRes.json();
        setIndustry(settingsData.organization?.industry || 'Clinic');
      }
    } catch (err) {
      toast("Failed to load data", "error");
    }
  }

  useEffect(() => {
    if (isNewAppointmentModalOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchInitialData();
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNewAppointmentModalOpen]);

  // Customer Lookup
  const handlePhoneLookup = async (phone: string) => {
    if (phone.length >= 10) {
      try {
        const res = await apiFetch(`/api/v1/customers/search?phone=${phone}`);
        const data = await res.json();
        if (data.found) {
          setCustomerName(data.name);
          setCustomerId(data.id);
          toast(`Found existing customer: ${data.name}`, "success");
        }
      } catch (err) {
        console.error("Lookup failed");
      }
    }
  };

  // Slot Fetching
  const fetchSlots = useCallback(async () => {
    if (!selectedProvider || !selectedService || !selectedDate) return;
    
    setTimeout(() => setSlotsLoading(true), 0);
    setAvailableSlots([]);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const res = await apiFetch(`/api/v1/appointments/slots?provider_id=${selectedProvider.id}&service_id=${selectedService.id}&date=${dateStr}`);
      const data = await res.json();
      setAvailableSlots(data.slots || []);
    } catch (err) {
      toast("Error fetching slots", "error");
    } finally {
      setSlotsLoading(false);
    }
  }, [selectedProvider, selectedService, selectedDate, toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (step === 4) fetchSlots();
  }, [step, fetchSlots]);

  const handleBooking = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/v1/appointments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: selectedProvider.id,
          service_id: selectedService.id,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_id: customerId,
          start_time: selectedSlot,
          notes: notes + (isEmergency ? " [EMERGENCY]" : "")
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setConfirmedId(data.id);
        setStep(6); // Go to Success Step
        toast("Appointment confirmed!", "success");
      } else {
        const err = await res.json();
        toast(err.detail || "Booking failed", "error");
      }
    } catch (err) {
      toast("Connection error", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isNewAppointmentModalOpen) return null;

  const terms = getIndustryTerminology(industry);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={closeNewAppointmentModal}></div>
      
      <div className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-black text-slate-900">New Appointment</h2>
            <div className="flex gap-2 mt-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`h-1.5 w-8 rounded-full transition-all ${step >= i ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
              ))}
            </div>
          </div>
          <button onClick={closeNewAppointmentModal} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 max-h-[70vh]">
          
          {/* STEP 1: CUSTOMER */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center gap-3 mb-2 text-blue-600">
                <User size={20} />
                <h3 className="font-bold text-lg">Customer Information</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="tel" 
                      value={customerPhone}
                      onChange={(e) => {
                        setCustomerPhone(e.target.value);
                        handlePhoneLookup(e.target.value);
                      }}
                      placeholder="+1 (555) 000-0000"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Enter customer's full name"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                    />
                  </div>
                </div>

                <div 
                  onClick={() => setIsEmergency(!isEmergency)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${isEmergency ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-100'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${isEmergency ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      <ShieldAlert size={20} />
                    </div>
                    <div>
                      <p className={`font-bold text-sm ${isEmergency ? 'text-rose-700' : 'text-slate-700'}`}>Emergency Booking</p>
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Priority Scheduling</p>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isEmergency ? 'border-rose-500 bg-rose-500' : 'border-slate-200'}`}>
                    {isEmergency && <CheckCircle2 size={14} className="text-white" />}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: SERVICE */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center gap-3 mb-2 text-blue-600">
                <Stethoscope size={20} />
                <h3 className="font-bold text-lg">Select Service</h3>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {services.map(s => (
                  <div 
                    key={s.id}
                    onClick={() => setSelectedService(s)}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex justify-between items-center ${selectedService?.id === s.id ? 'bg-blue-50 border-blue-500 shadow-lg shadow-blue-100' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                  >
                    <div>
                      <p className="font-bold text-slate-900">{s.name}</p>
                      <p className="text-xs text-slate-500 font-medium">{s.duration_minutes} minutes duration</p>
                    </div>
                    {selectedService?.id === s.id && <CheckCircle2 className="text-blue-600" size={24} />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: PROVIDER */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center gap-3 mb-2 text-blue-600">
                <User size={20} />
                <h3 className="font-bold text-lg">Select Provider</h3>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {providers.map(p => (
                  <div 
                    key={p.id}
                    onClick={() => setSelectedProvider(p)}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-4 ${selectedProvider?.id === p.id ? 'bg-blue-50 border-blue-500 shadow-lg shadow-blue-100' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400">
                      {p.name.split(' ').map((n:any) => n[0]).join('')}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-500 font-medium">{p.specialty}</p>
                    </div>
                    {selectedProvider?.id === p.id && <CheckCircle2 className="text-blue-600" size={24} />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: DATE & SLOTS */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center gap-3 mb-2 text-blue-600">
                <CalendarIcon size={20} />
                <h3 className="font-bold text-lg">Select Date & Time</h3>
              </div>
              
              <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                {Array.from({ length: 21 }, (_, i) => i).map(i => {
                  const d = addDays(startOfToday(), i);
                  const active = isSameDay(d, selectedDate);
                  return (
                    <div 
                      key={i}
                      onClick={() => setSelectedDate(d)}
                      className={`min-w-[70px] p-3 rounded-2xl border-2 flex flex-col items-center cursor-pointer transition-all ${active ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}
                    >
                      <span className="text-[10px] font-black uppercase mb-1">{format(d, 'EEE')}</span>
                      <span className="text-lg font-black">{format(d, 'd')}</span>
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Available Slots</label>
                {slotsLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-600" size={32} /></div>
                ) : availableSlots.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.map(slot => (
                      <div 
                        key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        className={`p-3 rounded-xl border-2 text-center text-sm font-bold cursor-pointer transition-all ${selectedSlot === slot ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-md' : 'bg-slate-50 border-slate-50 text-slate-600 hover:border-slate-200'}`}
                      >
                        {format(parseISO(slot), 'h:mm a')}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                    <AlertTriangle size={24} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-xs text-slate-400 font-bold">No available slots for this date</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: SUMMARY */}
          {step === 5 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 text-center">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={48} />
              </div>
              <h3 className="text-2xl font-black text-slate-900">Review Booking</h3>
              
              <div className="bg-slate-50 rounded-[2rem] p-8 space-y-6 text-left border border-slate-100">
                <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Customer</p>
                    <p className="font-black text-slate-900">{customerName}</p>
                    <p className="text-xs text-slate-500">{customerPhone}</p>
                  </div>
                  {isEmergency && <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase">Emergency</span>}
                </div>
                
                <div className="grid grid-cols-2 gap-6 pb-4 border-b border-slate-200">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{terms.providerTitle}</p>
                    <p className="font-bold text-slate-900 text-sm">{selectedProvider?.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Service</p>
                    <p className="font-bold text-slate-900 text-sm">{selectedService?.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Time & Date</p>
                    <p className="font-black text-blue-600">{format(selectedDate, 'EEEE, MMM dd')}</p>
                    <p className="text-lg font-black text-slate-900">{format(parseISO(selectedSlot!), 'h:mm a')}</p>
                  </div>
                  <div className="w-px h-12 bg-slate-200"></div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Duration</p>
                    <p className="font-bold text-slate-900">{selectedService?.duration_minutes} Minutes</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-left ml-2">Internal Notes (Optional)</label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any specific requests or symptoms..."
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm min-h-[80px] outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>
          )}

          {/* STEP 6: SUCCESS */}
          {step === 6 && (
            <div className="space-y-6 animate-in zoom-in-95 text-center py-8">
              <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={56} />
              </div>
              <div>
                <h3 className="text-3xl font-black text-slate-900 mb-2">Booking Success!</h3>
                <p className="text-slate-500 font-medium">The appointment has been added to the calendar.</p>
              </div>
              
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 inline-block px-12">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Confirmation ID</p>
                <p className="text-4xl font-black text-blue-600">#{confirmedId}</p>
              </div>

              <div className="pt-8">
                <button 
                  onClick={() => {
                    closeNewAppointmentModal();
                    window.location.reload();
                  }}
                  className="px-10 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        {step < 6 && (
          <div className="p-8 border-t border-slate-100 bg-white flex gap-4">
            {step > 1 && (
              <button 
                onClick={() => setStep(step - 1)}
                className="flex-1 py-4 bg-slate-100 text-slate-700 font-black rounded-2xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
              >
                <ChevronLeft size={20} /> Back
              </button>
            )}
            
            {step < 5 ? (
              <button 
                disabled={(step === 1 && (!customerName || customerPhone.length < 5)) || 
                          (step === 2 && !selectedService) || 
                          (step === 3 && !selectedProvider) || 
                          (step === 4 && !selectedSlot)}
                onClick={() => setStep(step + 1)}
                className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
              >
                Continue <ChevronRight size={20} />
              </button>
            ) : (
              <button 
                disabled={loading}
                onClick={handleBooking}
                className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                {loading ? 'Confirming...' : 'Finalize Booking'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
