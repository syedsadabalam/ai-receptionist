"use client";
import SuperAdminGuard from "@/components/SuperAdminGuard";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/clients", label: "Clients", icon: "🏥" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <SuperAdminGuard>
      <div style={{ display: "flex", minHeight: "100vh", background: "#0f1117", fontFamily: "'Inter', sans-serif" }}>
        {/* Sidebar */}
        <aside style={{
          width: 240,
          background: "#13141a",
          borderRight: "1px solid #1e2130",
          display: "flex",
          flexDirection: "column",
          padding: "24px 0",
          flexShrink: 0,
        }}>
          {/* Brand */}
          <div style={{ padding: "0 20px 28px" }}>
            <div style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              borderRadius: 10,
              padding: "10px 14px",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}>
              <span style={{ fontSize: 18 }}>🤖</span>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>AI Receptionist</span>
            </div>
            <div style={{
              background: "#dc2626",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.12em",
              padding: "3px 8px",
              borderRadius: 4,
              display: "inline-block",
            }}>
              ⚡ SUPER ADMIN
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1 }}>
            {navItems.map((item) => {
              const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 20px",
                  margin: "2px 10px",
                  borderRadius: 8,
                  textDecoration: "none",
                  color: active ? "#a5b4fc" : "#6b7280",
                  background: active ? "rgba(99, 102, 241, 0.12)" : "transparent",
                  fontWeight: active ? 600 : 400,
                  fontSize: 14,
                  transition: "all 0.15s",
                  borderLeft: active ? "3px solid #6366f1" : "3px solid transparent",
                }}>
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Back to App & Logout */}
          <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            <Link href="/" style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderRadius: 8,
              textDecoration: "none",
              color: "#4b5563",
              fontSize: 13,
              border: "1px solid #1e2130",
            }}>
              ← Back to App
            </Link>
            <button onClick={logout} style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderRadius: 8,
              background: "transparent",
              color: "#ef4444",
              fontSize: 13,
              fontWeight: 600,
              border: "1px solid #7f1d1d",
              cursor: "pointer",
              textAlign: "left",
            }}>
              🚪 Log Out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, overflow: "auto" }}>
          {children}
        </main>
      </div>
    </SuperAdminGuard>
  );
}
