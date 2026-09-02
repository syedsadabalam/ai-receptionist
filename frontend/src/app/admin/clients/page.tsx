"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
function authHeaders() {
  const t = localStorage.getItem("auth_token");
  return { Authorization: `Bearer ${t}`, "Content-Type": "application/json" };
}

const INDUSTRY_COLORS: Record<string, string> = {
  dental: "#6366f1", salon: "#ec4899", law: "#f59e0b",
  medspa: "#10b981", real_estate: "#3b82f6", other: "#6b7280",
};

interface Org {
  id: number; name: string; industry: string; phone?: string;
  is_provisioned: boolean; total_appointments: number;
  total_calls: number; last_call_at?: string; user_count: number;
}

export default function ClientsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "provisioned" | "pending">("all");

  const fetchOrgs = () => {
    setLoading(true);
    fetch(`${API}/api/v1/admin/organizations`, { headers: authHeaders() })
      .then(r => r.json())
      .then(setOrgs)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrgs(); }, []);

  const filtered = orgs
    .filter(o => filter === "all" || (filter === "provisioned" ? o.is_provisioned : !o.is_provisioned))
    .filter(o => o.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ padding: "36px 40px", color: "#f9fafb" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Clients</h1>
          <p style={{ color: "#6b7280", marginTop: 6, fontSize: 14 }}>{orgs.length} organizations on the platform</p>
        </div>
        <Link href="/admin/clients/new" style={{
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          color: "#fff", padding: "10px 20px", borderRadius: 10,
          textDecoration: "none", fontWeight: 600, fontSize: 14,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          + Onboard New Client
        </Link>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <input
          placeholder="Search by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            background: "#13141a", border: "1px solid #1e2130", color: "#f9fafb",
            padding: "9px 14px", borderRadius: 8, fontSize: 14, outline: "none", flex: 1,
          }}
        />
        {(["all", "provisioned", "pending"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
            background: filter === f ? "#6366f1" : "#13141a",
            color: filter === f ? "#fff" : "#6b7280",
            border: `1px solid ${filter === f ? "#6366f1" : "#1e2130"}`,
          }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: "#13141a", border: "1px solid #1e2130", borderRadius: 14, overflow: "hidden" }}>
        {/* Table Header */}
        <div style={{
          display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 120px",
          padding: "12px 20px", borderBottom: "1px solid #1e2130",
          color: "#4b5563", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
        }}>
          <span>ORGANIZATION</span><span>CALLS</span><span>APPTS</span>
          <span>USERS</span><span>LAST CALL</span><span>STATUS</span><span>ACTIONS</span>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#4b5563" }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#4b5563" }}>No clients found.</div>
        ) : (
          filtered.map((org, i) => (
            <div key={org.id} style={{
              display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 120px",
              padding: "14px 20px", alignItems: "center",
              borderBottom: i < filtered.length - 1 ? "1px solid #1e2130" : "none",
              transition: "background 0.15s",
            }}
              onMouseEnter={e => (e.currentTarget.style.background = "#0f1117")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              {/* Name + industry */}
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{org.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                  <span style={{
                    background: INDUSTRY_COLORS[org.industry] + "22",
                    color: INDUSTRY_COLORS[org.industry] || "#6b7280",
                    fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                  }}>
                    {org.industry.toUpperCase()}
                  </span>
                  {org.phone && <span style={{ color: "#4b5563", fontSize: 12 }}>{org.phone}</span>}
                </div>
              </div>
              <span style={{ color: "#9ca3af", fontSize: 14 }}>{org.total_calls}</span>
              <span style={{ color: "#9ca3af", fontSize: 14 }}>{org.total_appointments}</span>
              <span style={{ color: "#9ca3af", fontSize: 14 }}>{org.user_count}</span>
              <span style={{ color: "#4b5563", fontSize: 12 }}>
                {org.last_call_at ? new Date(org.last_call_at).toLocaleDateString() : "—"}
              </span>
              {/* Status badge */}
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 12, fontWeight: 600,
                color: org.is_provisioned ? "#10b981" : "#f59e0b",
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: org.is_provisioned ? "#10b981" : "#f59e0b",
                }} />
                {org.is_provisioned ? "Live" : "Needs Setup"}
              </span>
              {/* Actions */}
              <Link href={`/admin/clients/${org.id}`} style={{
                background: "#1e2130", color: "#a5b4fc", padding: "6px 14px",
                borderRadius: 7, textDecoration: "none", fontSize: 12, fontWeight: 600,
              }}>
                Manage →
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
