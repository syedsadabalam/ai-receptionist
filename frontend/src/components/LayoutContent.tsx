"use client";

import { usePathname } from 'next/navigation';
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from '@/context/AuthContext';

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isSuperAdmin } = useAuth();
  
  const isLoginPage = pathname === '/login';
  const isAdminPage = pathname.startsWith('/admin');
  const isRegisterPage = pathname === '/register';

  // Login, register, and admin pages render their own layout
  if (isLoginPage || isRegisterPage || isAdminPage) {
    return <>{children}</>;
  }

  // Super admins are not supposed to use the client dashboard layout.
  // AuthContext's useEffect will redirect them to /admin, but until that
  // navigation completes, render nothing to prevent a flash of the client UI.
  if (isAuthenticated && isSuperAdmin) {
    return null;
  }

  // Authenticated client/admin users get the full dashboard layout
  if (isAuthenticated) {
    return <DashboardLayout>{children}</DashboardLayout>;
  }

  // Not authenticated and not on a public page — show loading while
  // AuthContext's useEffect redirects to /login.
  return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-400">Loading...</div>;
}
