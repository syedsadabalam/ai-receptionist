"use client";

import React, { useState } from 'react';
import { Shield, Lock, User, RefreshCw, AlertCircle, Phone, Building, CheckCircle2, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/utils/api';

const INDUSTRIES = ['Clinic', 'Law', 'Salon', 'MedSpa', 'Real Estate', 'Other'];

export default function RegisterPage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    organization_name: '',
    industry: 'Clinic',
    email: '',
    password: '',
    confirm_password: '',
    phone: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (formData.password !== formData.confirm_password) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }
    
    try {
      const res = await apiFetch('/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organization_name: formData.organization_name,
          industry: formData.industry,
          email: formData.email,
          password: formData.password,
          phone: formData.phone
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/login?registered=true');
        }, 2000);
      } else {
        setError(data.detail || "Registration failed. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
        <div className="w-full max-w-md text-center bg-white/80 backdrop-blur-xl border border-white rounded-[2.5rem] p-10 shadow-2xl shadow-slate-200/50">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <CheckCircle2 className="text-green-600" size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-4">Registration Successful!</h2>
          <p className="text-slate-600 font-medium leading-relaxed">
            Your organization has been registered and we are provisioning your AI Receptionist and dedicated phone number in the background.
          </p>
          <p className="text-sm text-slate-400 mt-6">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] py-12">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-xl shadow-blue-200 mb-4 transform -rotate-6">
            <Shield className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Join AI Receptionist</h1>
          <p className="text-slate-500 font-medium mt-2">Automate your organization's calls 24/7</p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl border border-white rounded-[2.5rem] p-10 shadow-2xl shadow-slate-200/50">
          <form onSubmit={handleSubmit} className="space-y-5">
            
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Organization Name</label>
              <div className="relative">
                <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  name="organization_name"
                  value={formData.organization_name}
                  onChange={handleChange}
                  placeholder="Acme Corp"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-medium text-slate-700"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Industry</label>
                <div className="relative">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select 
                    name="industry"
                    value={formData.industry}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-medium text-slate-700 appearance-none"
                    required
                  >
                    {INDUSTRIES.map(ind => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Admin Email</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="admin@company.com"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-medium text-slate-700"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Contact Phone</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 000-0000"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-medium text-slate-700"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="password" 
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-medium text-slate-700"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Confirm</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="password" 
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-medium text-slate-700"
                    required
                  />
                </div>
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
              className="w-full bg-blue-600 text-white py-4 mt-2 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              {loading ? <RefreshCw className="animate-spin" size={20} /> : null}
              {loading ? 'Creating Account...' : 'Register Organization'}
            </button>
          </form>
        </div>
        
        <p className="text-center mt-8 text-slate-400 text-sm font-medium">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 font-bold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
