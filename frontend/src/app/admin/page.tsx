"use client";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function authHeaders() {
  const t = localStorage.getItem("auth_token");
  return { Authorization: `Bearer ${t}`, "Content-Type": "application/json" };
}

interface Stats {
  total_organizations: number;
  provisioned_organizations: number;
  total_calls: number;
  total_appointments: number;
  total_client_users: number;
  call_trend: { day: string; count: number }[];
}

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div style={{
      background: "#13141a",
      border: "1px solid #1e2130",
      borderRadius: 14,
      padding: "22px 24px",
      borderTop: `3px solid ${color}`,
    }}>
      <div style={{ color: "#6b7280", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 8 }}>{label}</div>
      <div style={{ color: "#f9fafb", fontSize: 32, fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ color: "#4b5563", fontSize: 12, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/v1/admin/stats`, { headers: authHeaders() })
      .then(r => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  const maxCount = stats ? Math.max(...stats.call_trend.map(d => d.count), 1) : 1;

  return (
    <div style={{ padding: "36px 40px", color: "#f9fafb" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Platform Overview</h1>
        <p style={{ color: "#6b7280", marginTop: 6, fontSize: 14 }}>
          Real-time metrics across all tenant organizations.
        </p>
      </div>

      {loading ? (
        <div style={{ color: "#4b5563", fontSize: 16 }}>Loading...</div>
      ) : stats ? (
        <>
          {/* Stat Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 36 }}>
            <StatCard label="TOTAL CLIENTS" value={stats.total_organizations} color="#6366f1" />
            <StatCard label="PROVISIONED (LIVE)" value={stats.provisioned_organizations} sub={`${stats.total_organizations - stats.provisioned_organizations} need setup`} color="#10b981" />
            <StatCard label="TOTAL AI CALLS" value={stats.total_calls.toLocaleString()} color="#f59e0b" />
            <StatCard label="TOTAL APPOINTMENTS" value={stats.total_appointments.toLocaleString()} color="#ec4899" />
            <StatCard label="CLIENT USERS" value={stats.total_client_users} color="#8b5cf6" />
          </div>

          {/* Call Trend Chart */}
          <div style={{ background: "#13141a", border: "1px solid #1e2130", borderRadius: 14, padding: "24px 28px" }}>
            <div style={{ color: "#9ca3af", fontSize: 13, fontWeight: 600, marginBottom: 20 }}>📞 PLATFORM CALL VOLUME — LAST 7 DAYS</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 120 }}>
              {stats.call_trend.map((d) => (
                <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{ color: "#6b7280", fontSize: 11 }}>{d.count}</div>
                  <div style={{
                    width: "100%",
                    height: `${(d.count / maxCount) * 90 + (d.count > 0 ? 10 : 0)}px`,
                    minHeight: 4,
                    background: "linear-gradient(180deg, #6366f1, #4338ca)",
                    borderRadius: "4px 4px 0 0",
                    transition: "height 0.3s",
                  }} />
                  <div style={{ color: "#4b5563", fontSize: 11 }}>{d.day}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div style={{ color: "#ef4444" }}>Failed to load stats.</div>
      )}
    </div>
  );
}
