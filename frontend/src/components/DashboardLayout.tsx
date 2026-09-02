"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Calendar, 
  PhoneCall, 
  Users, 
  UserSquare2, 
  Settings, 
  BarChart3,
  Briefcase,
  HelpCircle,
  Loader2,
  AlertTriangle,
  Menu,
  X
} from 'lucide-react';
import { format } from 'date-fns';

const SidebarItem = ({ icon: Icon, label, href }: { icon: any, label: string, href: string }) => {
  const pathname = usePathname();
  const active = pathname === href;
  
  return (
    <Link href={href} className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${active ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}>
      <Icon size={20} />
      <span className="font-medium text-sm">{label}</span>
    </Link>
  );
};

import { useModal } from '@/context/ModalContext';

import { useAuth } from '@/context/AuthContext';
import { LogOut } from 'lucide-react';
import { apiFetch } from '@/utils/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { openNewAppointmentModal } = useModal();
  const { username, logout } = useAuth();
  const [provisioning, setProvisioning] = React.useState<boolean>(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    const checkStatus = async () => {
      try {
        const res = await apiFetch('/api/v1/settings/');
        if (res.ok) {
          const data = await res.json();
          if (!data.organization?.vapi_assistant_id) {
            setProvisioning(true);
          } else {
            setProvisioning(false);
          }
        }
      } catch (err) {
        // Ignore
      }
    };
    checkStatus();
    interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, []);
  
  // Close mobile menu on path change
  const pathname = usePathname();
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 relative">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 text-blue-600 font-bold text-xl mb-1">
              <div className="bg-blue-600 text-white p-1 rounded">🏢</div>
              <span>Organization</span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[2px]">AI Receptionist</p>
          </div>
          <button 
            className="md:hidden p-1 text-slate-400 hover:text-slate-600"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 mt-4">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" href="/" />
          <SidebarItem icon={Calendar} label="Appointments" href="/appointments" />
          <SidebarItem icon={PhoneCall} label="Calls & Transcripts" href="/transcripts" />
          <SidebarItem icon={Users} label="Customers" href="/customers" />
          <SidebarItem icon={UserSquare2} label="Providers" href="/providers" />
          <SidebarItem icon={Briefcase} label="Services" href="/services" />
          <SidebarItem icon={HelpCircle} label="FAQs" href="/faqs" />
          <SidebarItem icon={Settings} label="AI Settings" href="/settings" />
          <SidebarItem icon={BarChart3} label="Analytics" href="/analytics" />
          
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors text-rose-500 hover:bg-rose-50 mt-4 border-t border-slate-50"
          >
            <LogOut size={20} />
            <span className="font-medium text-sm">Sign Out</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="bg-slate-900 rounded-xl p-4 text-white">
            <p className="text-xs text-slate-400 mb-1">Organization</p>
            <p className="text-sm font-semibold truncate">My Organization</p>
            <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              AI Agent Online
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
            <button 
              className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg md:hidden"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div className="text-sm font-medium text-slate-600 hidden md:block">
              <span>{format(new Date(), 'MMMM yyyy')}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center gap-3 pr-4 border-r border-slate-200">
               <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs uppercase">
                {username?.substring(0, 2) || 'AD'}
               </div>
               <div className="text-right">
                <p className="text-sm font-semibold capitalize">{username || 'Admin'}</p>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Admin</p>
               </div>
            </div>
            <button 
              onClick={openNewAppointmentModal}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
            >
              + New Appointment
            </button>
          </div>
        </header>

        {provisioning && (
          <div className="bg-amber-50 border-b border-amber-200 px-8 py-3 flex items-center justify-between shadow-sm z-10">
            <div className="flex items-center gap-3 text-amber-700">
              <Loader2 size={18} className="animate-spin" />
              <p className="text-sm font-semibold">Provisioning your AI Phone Number...</p>
            </div>
            <p className="text-xs text-amber-600">This usually takes about 30 seconds. Some features may be disabled until this completes.</p>
          </div>
        )}

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
