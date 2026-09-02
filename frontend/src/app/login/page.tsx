"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/utils/api';
import { useAuth } from '@/context/AuthContext';
import { Shield, Lock, User, RefreshCw, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);

      const res = await apiFetch('/api/v1/auth/login', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        login(data.access_token, data.username, data.is_super_admin === true);
      } else {
        setError(data.detail || 'Invalid credentials');
      }
    } catch (err) {
      setError('Connection failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-xl shadow-blue-200 mb-4 transform -rotate-6">
            <Shield className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">AI Receptionist</h1>
          <p className="text-slate-500 font-medium mt-2">Professional AI CRM Portal</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/80 backdrop-blur-xl border border-white rounded-[2.5rem] p-10 shadow-2xl shadow-slate-200/50">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Username</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-medium text-slate-700"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-medium text-slate-700"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold animate-in fade-in slide-in-from-top-1">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              {loading ? <RefreshCw className="animate-spin" size={20} /> : null}
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
              Protected by Enterprise Grade Security
            </p>
          </div>
        </div>
        
        <p className="text-center mt-8 text-slate-400 text-sm font-medium">
          Forgot password? <a href="mailto:support@aireceptionist.com" className="text-blue-600 cursor-pointer hover:underline">Contact Support</a>
        </p>
      </div>
    </div>
  );
}
