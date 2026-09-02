"use client";

import React, { useEffect, useState } from 'react';
import { format, startOfWeek, addDays, parseISO, getHours, getDay, isSameDay, addWeeks, subWeeks, isToday } from 'date-fns';
import { Calendar as CalendarIcon, Clock, User, Phone, Stethoscope, ChevronLeft, ChevronRight, X, Edit2, Mail, FileText, Users } from 'lucide-react';
import { useModal } from '@/context/ModalContext';
import { useToast } from '@/context/ToastContext';
import { apiFetch } from '@/utils/api';

export default function AppointmentsPage() {
  const { openNewAppointmentModal } = useModal();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<any>(null);
  const [selectedAppt, setSelectedAppt] = useState<any | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));

  // Check for mobile on mount
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Generate current week dates
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));

  // Generate dynamic hours based on organization settings
  const getHoursRange = () => {
    if (!organization) return Array.from({ length: 9 }).map((_, i) => i + 9);
    const start = parseInt(organization.open_time?.split(':')[0] || '9');
    const end = parseInt(organization.close_time?.split(':')[0] || '17');
    return Array.from({ length: (end - start) + 1 }).map((_, i) => i + start);
  };

  const hours = getHoursRange();

  const fetchAppointments = async () => {
    try {
      // Fetch organization for hours
      const orgRes = await apiFetch('/api/v1/settings/');
      const settingsData = await orgRes.json();
      setOrganization(settingsData.organization);

      const res = await apiFetch('/api/v1/appointments/all');
      const data = await res.json();
      setAppointments(data);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleNextWeek = () => setCurrentWeekStart(prev => addWeeks(prev, 1));
  const handlePrevWeek = () => setCurrentWeekStart(prev => subWeeks(prev, 1));
  const handleToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));

  const handleCancelAppointment = async () => {
    if (!selectedAppt) return;
    if (!confirm("Are you sure you want to cancel this appointment?")) return;

    try {
      const res = await apiFetch(`/api/v1/appointments/${selectedAppt.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSelectedAppt(null);
        fetchAppointments();
        toast("Appointment cancelled successfully.", "success");
      } else {
        toast("Failed to cancel appointment.", "error");
      }
    } catch (err) {
      console.error("Cancel failed:", err);
      toast("Error connecting to server.", "error");
    }
  };

  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newTime, setNewTime] = useState("");
  const [editData, setEditData] = useState({ notes: "" });

  const handleReschedule = async () => {
    if (!selectedAppt || !newTime) return;
    
    setLoading(true);
    try {
      const res = await apiFetch(`/api/v1/appointments/${selectedAppt.id}/reschedule?new_start_time=${newTime}`, {
        method: 'PATCH',
      });
      
      if (res.ok) {
        setIsRescheduling(false);
        setSelectedAppt(null);
        fetchAppointments();
        toast("Appointment moved successfully!", "success");
      } else {
        const error = await res.json();
        toast(`Failed to move: ${error.detail}`, "error");
      }
    } catch (err) {
      console.error("Reschedule failed:", err);
      toast("Error rescheduling appointment.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEditDetails = async () => {
    if (!selectedAppt) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/v1/appointments/${selectedAppt.id}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      });
      if (res.ok) {
        setIsEditing(false);
        fetchAppointments();
        setSelectedAppt({...selectedAppt, ...editData});
        toast("Clinical notes updated.", "success");
      }
    } catch (err) {
      console.error(err);
      toast("Failed to update notes.", "error");
    } finally {
      setLoading(false);
    }
  };

  const getServiceColor = (serviceName: string) => {
    const name = (serviceName || '').toLowerCase();
    if (name.includes('cleaning')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (name.includes('filling')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (name.includes('consultation')) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-purple-100 text-purple-700 border-purple-200';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-slate-400">
        <div className="animate-pulse flex items-center gap-2">
          <CalendarIcon size={20} />
          <span>Loading calendar...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white z-20">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-slate-900">Appointments</h1>
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
              <button onClick={handlePrevWeek} className="p-1 rounded hover:bg-white transition-colors"><ChevronLeft size={16} /></button>
              <span className="px-3 text-sm font-semibold text-slate-700">
                {format(weekDays[0], 'MMM d')} – {format(weekDays[6], 'MMM d, yyyy')}
              </span>
              <button onClick={handleNextWeek} className="p-1 rounded hover:bg-white transition-colors"><ChevronRight size={16} /></button>
            </div>
            <button onClick={handleToday} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">Today</button>
          </div>
          <button 
            onClick={openNewAppointmentModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
          >
            + New Appointment
          </button>
        </div>

      {isMobile ? (
        <div className="flex-1 overflow-y-auto space-y-4 px-4 pb-20">
          {weekDays.map(day => (
            <div key={day.toString()} className="space-y-2">
              <div className="sticky top-0 bg-slate-50 py-2 z-10">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CalendarIcon size={16} className="text-blue-500" />
                  {format(day, 'EEEE, MMM d')}
                </h3>
              </div>
              <div className="space-y-2">
                {appointments.filter(a => format(parseISO(a.start_time), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')).length > 0 ? (
                  appointments
                    .filter(a => format(parseISO(a.start_time), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'))
                    .map(appt => (
                      <div 
                        key={appt.id} 
                        onClick={() => setSelectedAppt(appt)}
                        className={`p-4 rounded-2xl border shadow-sm transition-all active:scale-[0.98] ${getServiceColor(appt.service_name)}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-bold text-sm">{format(parseISO(appt.start_time), 'h:mm a')}</p>
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{appt.service_name}</span>
                        </div>
                        <p className="font-bold text-base mb-1">{appt.customer_name}</p>
                        <p className="text-xs font-medium opacity-80 flex items-center gap-1">
                          <Users size={12} /> {appt.provider_name}
                        </p>
                      </div>
                    ))
                ) : (
                  <p className="text-xs text-slate-400 italic py-2 pl-6">No appointments scheduled</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden flex flex-col mb-8">
          <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-slate-100 bg-slate-50/50">
            <div className="p-4"></div>
            {weekDays.map((day) => (
              <div key={day.toString()} className={`p-4 text-center border-l border-slate-100 ${isToday(day) ? 'bg-blue-50/50' : ''}`}>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{format(day, 'EEE')}</p>
                <p className={`text-xl font-black ${isToday(day) ? 'text-blue-600' : 'text-slate-900'}`}>{format(day, 'd')}</p>
              </div>
            ))}
          </div>
          
          <div className="flex-1 overflow-y-auto relative bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
            <div className="grid grid-cols-[80px_repeat(7,1fr)] min-h-full">
              <div className="border-r border-slate-100 bg-slate-50/30">
                {hours.map((hour) => (
                  <div key={hour} className="h-24 border-b border-slate-100 p-2 text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      {hour > 12 ? `${hour-12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                    </span>
                  </div>
                ))}
              </div>

              {/* Day Columns */}
              {weekDays.map((day) => (
                <div key={day.toString()} className="relative border-r border-slate-100 group">
                  {hours.map((hour) => (
                    <div key={hour} className="h-24 border-b border-slate-50 group-hover:bg-slate-50/30 transition-colors"></div>
                  ))}
                  
                  {/* Render Appointments for this day */}
                  {appointments
                    .filter((appt) => format(parseISO(appt.start_time), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'))
                    .map((appt) => {
                      const startTime = parseISO(appt.start_time);
                      const hour = startTime.getHours();
                      const minutes = startTime.getMinutes();
                      
                      // Calculate position dynamically based on opening hour
                      const startHour = parseInt(organization?.open_time?.split(':')[0] || '9');
                      const top = (hour - startHour) * 96 + (minutes / 60) * 96;
                      
                      return (
                        <div 
                          key={appt.id}
                          onClick={() => setSelectedAppt(appt)}
                          className={`absolute left-1 right-1 p-2 rounded-xl border shadow-sm cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md z-10 overflow-hidden ${getServiceColor(appt.service_name)}`}
                          style={{ top: `${top}px`, height: '80px' }}
                        >
                          <p className="text-[10px] font-black uppercase tracking-wider mb-1 truncate">
                            {format(startTime, 'h:mm a')}
                          </p>
                          <p className="font-bold text-xs truncate">{appt.customer_name}</p>
                          <p className="text-[9px] font-medium opacity-80 truncate">{appt.provider_name}</p>
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="lg:hidden fixed bottom-20 left-4 right-4 p-4 border border-slate-200 bg-white rounded-2xl shadow-lg flex items-center justify-center gap-4 text-[10px] font-bold text-slate-500 z-30">
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>Clean</div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500"></div>Fill</div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500"></div>Consult</div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-purple-500"></div>Proc</div>
      </div>
      </div>

      {/* Right Sidebar - Details Pane */}
      {selectedAppt ? (
        <div className="w-80 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden shrink-0">
          <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{selectedAppt.customer_name}</h2>
              <span className="inline-block mt-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-md border border-emerald-200">
                Confirmed
              </span>
            </div>
            <button onClick={() => setSelectedAppt(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
              <X size={18} />
            </button>
          </div>

          <div className="p-6 flex-1 overflow-y-auto space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CalendarIcon size={16} className="text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">{format(parseISO(selectedAppt.start_time), 'MMM d, yyyy')}</p>
                  <p className="text-xs text-slate-500">{format(parseISO(selectedAppt.start_time), 'h:mm a')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Stethoscope size={16} className="text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">{selectedAppt.provider_name}</p>
                  <p className="text-xs text-slate-500">{selectedAppt.service_name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone size={16} className="text-slate-400" />
                <p className="text-sm font-medium text-slate-700">{selectedAppt.customer_phone}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-2 text-slate-900 font-semibold text-sm">
                <FileText size={16} className="text-slate-400" /> Notes
              </div>
              {isEditing ? (
                <textarea 
                  value={editData.notes}
                  onChange={(e) => setEditData({...editData, notes: e.target.value})}
                  className="w-full p-3 bg-white border border-blue-200 rounded-lg text-sm min-h-[100px] outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter clinical notes..."
                />
              ) : (
                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                  {selectedAppt.notes || "No notes provided."}
                </p>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-2">
            {isRescheduling ? (
              <div className="space-y-3 p-2 bg-blue-50/50 rounded-xl border border-blue-100 animate-in fade-in zoom-in duration-200">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider px-1">Select New Date & Time</p>
                <input 
                  type="datetime-local" 
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <button onClick={handleReschedule} className="flex-1 py-2 bg-blue-600 text-white font-bold text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                    Confirm Move
                  </button>
                  <button onClick={() => setIsRescheduling(false)} className="flex-1 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-lg hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            ) : isEditing ? (
              <div className="flex gap-2">
                <button onClick={handleEditDetails} className="flex-1 py-2 bg-blue-600 text-white font-bold text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                  Save Notes
                </button>
                <button onClick={() => setIsEditing(false)} className="flex-1 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-lg hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <button onClick={() => setIsRescheduling(true)} className="w-full py-2 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                  Reschedule
                </button>
                <button onClick={() => {
                  setIsEditing(true);
                  setEditData({ notes: selectedAppt.notes || "" });
                }} className="w-full py-2 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                  Edit Details
                </button>
                <button onClick={handleCancelAppointment} className="w-full py-2 bg-rose-50 border border-rose-100 text-rose-600 font-bold text-sm rounded-lg hover:bg-rose-100 transition-colors mt-2">
                  Cancel Appointment
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="w-80 bg-slate-50 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center p-6 shrink-0 text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-slate-300 mb-4 shadow-sm">
            <CalendarIcon size={32} />
          </div>
          <p className="text-sm font-bold text-slate-500 mb-1">No Appointment Selected</p>
          <p className="text-xs text-slate-400">Click on an appointment block in the calendar to view details.</p>
        </div>
      )}
    </div>
  );
}
