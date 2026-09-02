"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
function authHeaders() {
  const t = localStorage.getItem("auth_token");
  return { Authorization: `Bearer ${t}`, "Content-Type": "application/json" };
}

const TABS = ["Overview", "Services", "Providers", "Users"];

const inputStyle: React.CSSProperties = {
  background: "#0f1117", border: "1px solid #1e2130", color: "#f9fafb",
  padding: "9px 13px", borderRadius: 7, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box",
};

export default function ClientDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [org, setOrg] = useState<any>(null);
  const [tab, setTab] = useState("Overview");
  const [provision, setProvision] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [provisionResult, setProvisionResult] = useState("");
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const fetchOrg = () => {
    fetch(`${API}/api/v1/admin/organizations/${id}`, { headers: authHeaders() })
      .then(r => r.json()).then(setOrg);
  };

  useEffect(() => { fetchOrg(); }, [id]);

  const handleProvision = async () => {
    setProvision("loading");
    try {
      const res = await fetch(`${API}/api/v1/admin/organizations/${id}/provision`, { method: "POST", headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed");
      setProvisionResult(data.vapi_assistant_id);
      setProvision("success");
      fetchOrg();
    } catch (e: any) {
      setProvisionResult(e.message);
      setProvision("error");
    }
  };

  const saveField = async (field: string, value: string) => {
    await fetch(`${API}/api/v1/admin/organizations/${id}`, {
      method: "PATCH", headers: authHeaders(), body: JSON.stringify({ [field]: value }),
    });
    setEditField(null);
    fetchOrg();
  };

  if (!org) return <div style={{ padding: 40, color: "#4b5563" }}>Loading...</div>;

  return (
    <div style={{ padding: "36px 40px", color: "#f9fafb" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <button onClick={() => router.push("/admin/clients")} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 13, marginBottom: 8, padding: 0 }}>
            ← Back to Clients
          </button>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>{org.name}</h1>
          <div style={{ display: "flex", gap: 10, marginTop: 8, alignItems: "center" }}>
            <span style={{ background: "#1e2130", color: "#a5b4fc", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 5 }}>
              #{org.id} · {org.industry.toUpperCase()}
            </span>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600,
              color: org.is_provisioned ? "#10b981" : "#f59e0b",
            }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: org.is_provisioned ? "#10b981" : "#f59e0b" }} />
              {org.is_provisioned ? "AI Live" : "Not Provisioned"}
            </span>
          </div>
        </div>

        {/* Re-Provision Button */}
        <button onClick={handleProvision} disabled={provision === "loading"} style={{
          background: org.is_provisioned ? "#1e2130" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
          color: org.is_provisioned ? "#6b7280" : "#fff",
          border: org.is_provisioned ? "1px solid #374151" : "none",
          padding: "10px 22px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14,
        }}>
          {provision === "loading" ? "⚙️ Provisioning..." : org.is_provisioned ? "🔄 Re-Provision AI" : "🚀 Provision AI"}
        </button>
      </div>

      {/* Provision Result */}
      {provision === "success" && (
        <div style={{ background: "#052e16", border: "1px solid #166534", borderRadius: 10, padding: "14px 18px", marginBottom: 20, fontSize: 13 }}>
          ✅ Provisioned! Assistant ID: <code style={{ color: "#4ade80" }}>{provisionResult}</code>
        </div>
      )}
      {provision === "error" && (
        <div style={{ background: "#1a0e0e", border: "1px solid #991b1b", borderRadius: 10, padding: "14px 18px", marginBottom: 20, fontSize: 13, color: "#ef4444" }}>
          ❌ {provisionResult}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#0f1117", padding: 4, borderRadius: 10, width: "fit-content" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 18px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
            background: tab === t ? "#1e2130" : "transparent",
            color: tab === t ? "#f9fafb" : "#6b7280",
          }}>{t}</button>
        ))}
      </div>

      {/* Tab: Overview */}
      {tab === "Overview" && (
        <div style={{ background: "#13141a", border: "1px solid #1e2130", borderRadius: 14, padding: "24px 28px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 40px" }}>
            {[
              ["name", "Name", org.name],
              ["phone", "Phone", org.phone || "—"],
              ["address", "Address", org.address || "—"],
              ["timezone", "Timezone", org.timezone],
              ["open_time", "Open Time", org.open_time],
              ["close_time", "Close Time", org.close_time],
              ["website_url", "Website", org.website_url || "—"],
              ["emergency_phone", "Emergency Phone", org.emergency_phone || "—"],
            ].map(([field, label, val]) => (
              <div key={field} style={{ marginBottom: 20 }}>
                <div style={{ color: "#4b5563", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>{label}</div>
                {editField === field ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <input style={inputStyle} value={editValue} onChange={e => setEditValue(e.target.value)} />
                    <button onClick={() => saveField(field, editValue)} style={{ background: "#6366f1", color: "#fff", border: "none", padding: "8px 14px", borderRadius: 7, cursor: "pointer", fontSize: 12 }}>Save</button>
                    <button onClick={() => setEditField(null)} style={{ background: "#1e2130", color: "#6b7280", border: "none", padding: "8px 10px", borderRadius: 7, cursor: "pointer" }}>✕</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ color: "#e5e7eb", fontSize: 14 }}>{val}</span>
                    <button onClick={() => { setEditField(field); setEditValue(val === "—" ? "" : val); }} style={{ background: "none", border: "none", color: "#374151", cursor: "pointer", fontSize: 11 }}>✏️</button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {org.vapi_assistant_id && (
            <div style={{ marginTop: 8, background: "#0f1117", borderRadius: 8, padding: "10px 14px" }}>
              <span style={{ color: "#4b5563", fontSize: 11, fontWeight: 700 }}>VAPI ASSISTANT ID</span>
              <div style={{ fontFamily: "monospace", color: "#a5b4fc", fontSize: 13, marginTop: 4, wordBreak: "break-all" }}>{org.vapi_assistant_id}</div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Services */}
      {tab === "Services" && (
        <div style={{ background: "#13141a", border: "1px solid #1e2130", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #1e2130", display: "grid", gridTemplateColumns: "1fr 1fr", color: "#4b5563", fontSize: 11, fontWeight: 700 }}>
            <span>NAME</span><span>DURATION</span>
          </div>
          {(org.services || []).length === 0 && <div style={{ padding: 30, textAlign: "center", color: "#374151" }}>No services.</div>}
          {(org.services || []).map((s: any) => (
            <div key={s.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: "14px 20px", borderBottom: "1px solid #0f1117", color: "#e5e7eb", fontSize: 14 }}>
              <span>{s.name}</span><span>{s.duration_minutes} min</span>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Providers */}
      {tab === "Providers" && (
        <div style={{ background: "#13141a", border: "1px solid #1e2130", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #1e2130", display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr", color: "#4b5563", fontSize: 11, fontWeight: 700 }}>
            <span>NAME</span><span>SPECIALTY</span><span>OPEN</span><span>CLOSE</span>
          </div>
          {(org.providers || []).length === 0 && <div style={{ padding: 30, textAlign: "center", color: "#374151" }}>No providers.</div>}
          {(org.providers || []).map((p: any) => (
            <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr", padding: "14px 20px", borderBottom: "1px solid #0f1117", color: "#e5e7eb", fontSize: 14 }}>
              <span>{p.name}</span>
              <span style={{ color: "#9ca3af" }}>{p.specialty}</span>
              <span style={{ color: "#6b7280" }}>{p.open_time || "—"}</span>
              <span style={{ color: "#6b7280" }}>{p.close_time || "—"}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Users */}
      {tab === "Users" && (
        <div style={{ background: "#13141a", border: "1px solid #1e2130", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #1e2130", display: "grid", gridTemplateColumns: "1fr 2fr 1fr", color: "#4b5563", fontSize: 11, fontWeight: 700 }}>
            <span>USERNAME</span><span>EMAIL</span><span>ROLE</span>
          </div>
          {(org.users || []).length === 0 && <div style={{ padding: 30, textAlign: "center", color: "#374151" }}>No users.</div>}
          {(org.users || []).map((u: any) => (
            <div key={u.id} style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr", padding: "14px 20px", borderBottom: "1px solid #0f1117", color: "#e5e7eb", fontSize: 14 }}>
              <span style={{ fontFamily: "monospace" }}>{u.username}</span>
              <span style={{ color: "#9ca3af" }}>{u.email}</span>
              <span style={{
                background: u.is_admin ? "rgba(99,102,241,0.15)" : "#1e2130",
                color: u.is_admin ? "#a5b4fc" : "#6b7280",
                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, display: "inline-block"
              }}>
                {u.is_admin ? "ADMIN" : "USER"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
