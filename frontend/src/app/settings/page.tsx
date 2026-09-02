"use client";

import React, { useEffect, useState } from 'react';
import { Settings, Save, RefreshCw, Zap, Shield, Globe, Clock, MessageSquare, Key, CheckCircle, AlertCircle, Phone } from 'lucide-react';
import { apiFetch } from '@/utils/api';

export default function SettingsPage() {
  const [organization, setOrganization] = useState<any>(null);
  const [env, setEnv] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await apiFetch('/api/v1/settings/');
      const data = await res.json();
      setOrganization(data.organization);
      setEnv(data.env);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await apiFetch('/api/v1/settings/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(organization)
      });
      if (res.ok) {
        setStatus({ type: 'success', msg: 'Settings saved successfully!' });
      } else {
        setStatus({ type: 'error', msg: 'Failed to save settings.' });
      }
    } catch (err) {
      setStatus({ type: 'error', msg: 'An error occurred while saving.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setStatus(null);
    try {
      const res = await apiFetch('/api/v1/settings/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setStatus({ type: 'success', msg: `AI Synced! New Assistant ID: ${data.assistant_id}` });
      } else {
        setStatus({ type: 'error', msg: data.detail || 'Failed to sync AI.' });
      }
    } catch (err) {
      setStatus({ type: 'error', msg: 'Failed to sync with the AI system. Please check your internet connection or contact support.' });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <div className="p-8 animate-pulse">Loading settings...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
          <p className="text-slate-500">Configure your organization profile and AI behavior</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleSync}
            disabled={syncing}
            className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm"
          >
            {syncing ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} className="text-amber-500" />}
            {syncing ? 'Syncing...' : 'Push to AI'}
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center gap-2"
          >
            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {status && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
          status.type === 'success' ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' : 'bg-rose-50 border border-rose-100 text-rose-700'
        }`}>
          {status.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-medium">{status.msg}</span>
        </div>
      )}

      <div className="flex gap-8">
        {/* Tabs */}
        <div className="w-48 flex flex-col gap-1">
          <button 
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${activeTab === 'general' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Globe size={18} /> General
          </button>
          <button 
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${activeTab === 'ai' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <MessageSquare size={18} /> AI Prompt
          </button>
          <button 
            onClick={() => setActiveTab('integrations')}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${activeTab === 'integrations' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Key size={18} /> Integrations
          </button>
        </div>

        {/* Form Area */}
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4">Organization Profile</h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Organization Name</label>
                  <input 
                    type="text" 
                    value={organization?.name || ''}
                    onChange={(e) => setOrganization({...organization, name: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Timezone</label>
                  <select 
                    value={organization?.timezone || ''}
                    onChange={(e) => setOrganization({...organization, timezone: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                  >
                    <optgroup label="Canada">
                      <option value="America/St_Johns">Newfoundland (NST/NDT)</option>
                      <option value="America/Halifax">Atlantic (AST/ADT)</option>
                      <option value="America/Toronto">Eastern (EST/EDT)</option>
                      <option value="America/Winnipeg">Central (CST/CDT)</option>
                      <option value="America/Edmonton">Mountain (MST/MDT)</option>
                      <option value="America/Vancouver">Pacific (PST/PDT)</option>
                    </optgroup>
                    <optgroup label="India">
                      <option value="Asia/Kolkata">India Standard Time (IST)</option>
                    </optgroup>
                    <optgroup label="Other">
                      <option value="America/New_York">Eastern US (EST/EDT)</option>
                      <option value="UTC">UTC (Universal)</option>
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Working Hours */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Clock size={12} /> Opening Time
                  </label>
                  <input 
                    type="time" 
                    value={organization?.open_time || "09:00"}
                    onChange={(e) => setOrganization({...organization, open_time: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Clock size={12} /> Closing Time
                  </label>
                  <input 
                    type="time" 
                    value={organization?.close_time || "17:00"}
                    onChange={(e) => setOrganization({...organization, close_time: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Phone size={12} /> Emergency Phone
                </label>
                <input 
                  type="text" 
                  value={organization?.emergency_phone || ""}
                  onChange={(e) => setOrganization({...organization, emergency_phone: e.target.value})}
                  placeholder="+1 (555) 911-0000"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Address</label>
                <input 
                  type="text" 
                  value={organization?.address || ""}
                  onChange={(e) => setOrganization({...organization, address: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Website URL</label>
                  <input 
                    type="text" 
                    value={organization?.website_url || ""}
                    onChange={(e) => setOrganization({...organization, website_url: e.target.value})}
                    placeholder="https://example.com"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Google Maps Link</label>
                  <input 
                    type="text" 
                    value={organization?.map_link || ""}
                    onChange={(e) => setOrganization({...organization, map_link: e.target.value})}
                    placeholder="Link to your organization on Maps"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Main Phone Number</label>
                <input 
                  type="text" 
                  value={organization?.phone || ""}
                  onChange={(e) => setOrganization({...organization, phone: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-6 h-full flex flex-col">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900">Custom AI Instructions</h2>
                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                  <Shield size={10} /> System Active
                </span>
              </div>
              <p className="text-sm text-slate-500">
                Add specific rules for your organization. For example: "Be extremely cheerful," or "Always mention we have free parking in the rear."
              </p>
              <textarea 
                placeholder="Enter custom instructions for the AI..."
                value={organization?.custom_prompt || ""}
                onChange={(e) => setOrganization({...organization, custom_prompt: e.target.value})}
                className="flex-1 min-h-[200px] w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-sm leading-relaxed mb-4"
              ></textarea>
              <div className="space-y-2 mt-4">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Voice Engine</label>
                <select 
                  value={organization?.vapi_voice_id || 'asteria'}
                  onChange={(e) => setOrganization({...organization, vapi_voice_id: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                >
                  <option value="asteria">Asteria (Female, Friendly)</option>
                  <option value="luna">Luna (Female, Professional)</option>
                  <option value="stella">Stella (Female, Energetic)</option>
                  <option value="orion">Orion (Male, Deep)</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-8">
              <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4">API Connectivity</h2>
              <div className="space-y-4">
                
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                      <Zap size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Google Calendar</p>
                      <p className="text-xs text-slate-500">Sync appointments and check availability</p>
                    </div>
                  </div>
                  {organization?.google_oauth_access_token ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-emerald-100 text-emerald-700">Connected</span>
                  ) : (
                    <button onClick={() => {
                      const token = localStorage.getItem('auth_token');
                      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                      window.location.href = `${API}/api/v1/calendar/oauth/login?token=${token}`;
                    }} className="bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm">
                      Connect Calendar
                    </button>
                  )}
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${env?.vapi_key_configured || organization?.vapi_api_key ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                        <Zap size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">AI Brain Integration</p>
                        <p className="text-xs text-slate-500">Voice AI orchestration and routing</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${env?.vapi_key_configured || organization?.vapi_api_key ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {env?.vapi_key_configured || organization?.vapi_api_key ? 'Connected' : 'Missing Key'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">API Key</label>
                    <input 
                      type="password"
                      placeholder="Enter API Key to connect"
                      value={organization?.vapi_api_key || ''}
                      onChange={(e) => setOrganization({...organization, vapi_api_key: e.target.value})}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                      <MessageSquare size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">AI Voice Engine</p>
                      <p className="text-xs text-slate-500">Ultra-low latency text-to-speech engine</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-emerald-100 text-emerald-700">
                    Connected
                  </span>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${env?.twilio_configured || organization?.twilio_api_key ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                        <Phone size={20} className="transform scale-x-[-1]" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Phone System Integration</p>
                        <p className="text-xs text-slate-500">Global phone number and call handling</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${env?.twilio_configured || organization?.twilio_api_key ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {env?.twilio_configured || organization?.twilio_api_key ? 'Connected' : 'Missing Key'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">API Key</label>
                    <input 
                      type="password"
                      placeholder="Enter API Key to connect"
                      value={organization?.twilio_api_key || ''}
                      onChange={(e) => setOrganization({...organization, twilio_api_key: e.target.value})}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
