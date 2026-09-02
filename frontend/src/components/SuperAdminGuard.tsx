"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isSuperAdmin } = useAuth();

  useEffect(() => {
    // AuthContext has already hydrated by the time children render (loading gate in AuthProvider).
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!isSuperAdmin) {
      router.replace("/");
      return;
    }
  }, [isAuthenticated, isSuperAdmin, router]);

  // While not yet confirmed, render nothing (prevents flash of admin UI for regular users).
  if (!isAuthenticated || !isSuperAdmin) return null;

  return <>{children}</>;
}
