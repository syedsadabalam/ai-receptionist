"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
function authHeaders() {
  const t = localStorage.getItem("auth_token");
  return { Authorization: `Bearer ${t}`, "Content-Type": "application/json" };
}

const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Phoenix", "America/Anchorage", "Pacific/Honolulu",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Dubai",
  "Asia/Karachi", "Asia/Kolkata", "Asia/Tokyo", "Australia/Sydney",
];

const INDUSTRIES = ["dental", "salon", "law", "medspa", "real_estate", "other"];

const inputStyle: React.CSSProperties = {
  width: "100%", background: "#0f1117", border: "1px solid #1e2130",
  color: "#f9fafb", padding: "10px 14px", borderRadius: 8, fontSize: 14,
  outline: "none", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = { color: "#9ca3af", fontSize: 12, fontWeight: 600, marginBottom: 6, display: "block" };
const fieldStyle: React.CSSProperties = { marginBottom: 18 };

// Step 1 — Clinic Details
function Step1({ data, setData }: { data: any; setData: any }) {
  return (
    <div>
      <h2 style={{ color: "#f9fafb", fontWeight: 700, fontSize: 20, marginBottom: 6 }}>Clinic Details</h2>
      <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 28 }}>Basic information about the new client organization.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>ORGANIZATION NAME *</label>
          <input style={inputStyle} value={data.name} onChange={e => setData({ ...data, name: e.target.value })} placeholder="e.g. Maple Dental" />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>INDUSTRY *</label>
          <select style={{ ...inputStyle, cursor: "pointer" }} value={data.industry} onChange={e => setData({ ...data, industry: e.target.value })}>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i.charAt(0).toUpperCase() + i.slice(1)}</option>)}
          </select>
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>PHONE</label>
          <input style={inputStyle} value={data.phone} onChange={e => setData({ ...data, phone: e.target.value })} placeholder="+1 555 000 0000" />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>EMERGENCY PHONE</label>
          <input style={inputStyle} value={data.emergency_phone} onChange={e => setData({ ...data, emergency_phone: e.target.value })} placeholder="+1 555 000 0001" />
        </div>
        <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
          <label style={labelStyle}>ADDRESS</label>
          <input style={inputStyle} value={data.address} onChange={e => setData({ ...data, address: e.target.value })} placeholder="123 Main St, Toronto, ON" />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>TIMEZONE *</label>
          <select style={{ ...inputStyle, cursor: "pointer" }} value={data.timezone} onChange={e => setData({ ...data, timezone: e.target.value })}>
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ ...fieldStyle, flex: 1 }}>
            <label style={labelStyle}>OPEN TIME</label>
            <input type="time" style={inputStyle} value={data.open_time} onChange={e => setData({ ...data, open_time: e.target.value })} />
          </div>
          <div style={{ ...fieldStyle, flex: 1 }}>
            <label style={labelStyle}>CLOSE TIME</label>
            <input type="time" style={inputStyle} value={data.close_time} onChange={e => setData({ ...data, close_time: e.target.value })} />
          </div>
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>WEBSITE URL</label>
          <input style={inputStyle} value={data.website_url} onChange={e => setData({ ...data, website_url: e.target.value })} placeholder="https://mapledental.com" />
        </div>
      </div>
    </div>
  );
}

// Step 2 — Services & Providers
function Step2({ services, setServices, providers, setProviders }: any) {
  const addService = () => setServices([...services, { name: "", duration_minutes: 30, price: 0 }]);
  const addProvider = () => setProviders([...providers, { name: "", specialty: "", open_time: "09:00", close_time: "17:00" }]);

  return (
    <div>
      <h2 style={{ color: "#f9fafb", fontWeight: 700, fontSize: 20, marginBottom: 6 }}>Services & Providers</h2>
      <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 24 }}>The AI uses this to book appointments correctly.</p>

      {/* Services */}
      <div style={{ marginBottom: 30 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ color: "#a5b4fc", fontWeight: 700, fontSize: 13 }}>🗂 SERVICES</span>
          <button onClick={addService} style={{ background: "#1e2130", color: "#a5b4fc", border: "1px dashed #6366f1", padding: "6px 14px", borderRadius: 7, cursor: "pointer", fontSize: 12 }}>+ Add Service</button>
        </div>
        {services.map((s: any, i: number) => (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <input style={{ ...inputStyle, flex: 2 }} placeholder="Service name (e.g. Teeth Cleaning)" value={s.name} onChange={e => { const n = [...services]; n[i].name = e.target.value; setServices(n); }} />
            <input type="number" style={{ ...inputStyle, flex: 1 }} placeholder="Duration (min)" value={s.duration_minutes} onChange={e => { const n = [...services]; n[i].duration_minutes = parseInt(e.target.value) || 0; setServices(n); }} />
            <input type="number" style={{ ...inputStyle, flex: 1 }} placeholder="Price ($)" value={s.price === 0 ? "" : s.price} onChange={e => { const n = [...services]; n[i].price = parseFloat(e.target.value) || 0; setServices(n); }} />
            <button onClick={() => setServices(services.filter((_: any, idx: number) => idx !== i))} style={{ background: "#1e1a1a", color: "#ef4444", border: "none", borderRadius: 7, padding: "8px 12px", cursor: "pointer" }}>✕</button>
          </div>
        ))}
        {services.length === 0 && <div style={{ color: "#374151", fontSize: 13, textAlign: "center", padding: 16, border: "1px dashed #1e2130", borderRadius: 8 }}>No services yet. Add at least one.</div>}
      </div>

      {/* Providers */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ color: "#a5b4fc", fontWeight: 700, fontSize: 13 }}>👨‍⚕️ PROVIDERS</span>
          <button onClick={addProvider} style={{ background: "#1e2130", color: "#a5b4fc", border: "1px dashed #6366f1", padding: "6px 14px", borderRadius: 7, cursor: "pointer", fontSize: 12 }}>+ Add Provider</button>
        </div>
        {providers.map((p: any, i: number) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr auto", gap: 10, marginBottom: 10 }}>
            <input style={inputStyle} placeholder="Full name" value={p.name} onChange={e => { const n = [...providers]; n[i].name = e.target.value; setProviders(n); }} />
            <input style={inputStyle} placeholder="Specialty (e.g. General Dentist)" value={p.specialty} onChange={e => { const n = [...providers]; n[i].specialty = e.target.value; setProviders(n); }} />
            <input type="time" style={inputStyle} value={p.open_time} onChange={e => { const n = [...providers]; n[i].open_time = e.target.value; setProviders(n); }} />
            <input type="time" style={inputStyle} value={p.close_time} onChange={e => { const n = [...providers]; n[i].close_time = e.target.value; setProviders(n); }} />
            <button onClick={() => setProviders(providers.filter((_: any, idx: number) => idx !== i))} style={{ background: "#1e1a1a", color: "#ef4444", border: "none", borderRadius: 7, padding: "8px 12px", cursor: "pointer" }}>✕</button>
          </div>
        ))}
        {providers.length === 0 && <div style={{ color: "#374151", fontSize: 13, textAlign: "center", padding: 16, border: "1px dashed #1e2130", borderRadius: 8 }}>No providers yet. Add at least one.</div>}
      </div>
    </div>
  );
}

// Step 3 — Admin User
function Step3({ data, setData }: { data: any; setData: any }) {
  return (
    <div>
      <h2 style={{ color: "#f9fafb", fontWeight: 700, fontSize: 20, marginBottom: 6 }}>Admin User Account</h2>
      <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 28 }}>This user will log into the clinic dashboard. Share these credentials with the clinic owner.</p>
      <div style={fieldStyle}>
        <label style={labelStyle}>USERNAME *</label>
        <input style={inputStyle} value={data.username} onChange={e => setData({ ...data, username: e.target.value })} placeholder="mapledental_admin" />
      </div>
      <div style={fieldStyle}>
        <label style={labelStyle}>EMAIL *</label>
        <input type="email" style={inputStyle} value={data.email} onChange={e => setData({ ...data, email: e.target.value })} placeholder="admin@mapledental.com" />
      </div>
      <div style={fieldStyle}>
        <label style={labelStyle}>TEMPORARY PASSWORD *</label>
        <input type="password" style={inputStyle} value={data.password} onChange={e => setData({ ...data, password: e.target.value })} placeholder="Strong password" />
      </div>
      <div style={{ background: "#1a1a0f", border: "1px solid #854d0e", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: "#fbbf24" }}>
        ⚠️ You will need to send these credentials to the client manually.
      </div>
    </div>
  );
}

// Step 4 — Provision & Confirm
function Step4({ orgData, services, providers, userInfo, orgId, onDone }: any) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [assistantId, setAssistantId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const provision = async () => {
    setStatus("loading");
    try {
      const res = await fetch(`${API}/api/v1/admin/organizations/${orgId}/provision`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Provisioning failed");
      }
      const data = await res.json();
      setAssistantId(data.vapi_assistant_id);
      setStatus("success");
    } catch (e: any) {
      setErrorMsg(e.message);
      setStatus("error");
    }
  };

  return (
    <div>
      <h2 style={{ color: "#f9fafb", fontWeight: 700, fontSize: 20, marginBottom: 6 }}>Provision AI Receptionist</h2>
      <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 24 }}>Review the summary below, then click Provision to go live.</p>

      {/* Summary */}
      <div style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: 10, padding: "18px 20px", marginBottom: 24 }}>
        <div style={{ color: "#a5b4fc", fontSize: 12, fontWeight: 700, marginBottom: 12 }}>ONBOARDING SUMMARY</div>
        <div style={{ color: "#9ca3af", fontSize: 13, lineHeight: 2 }}>
          <div>🏥 <strong style={{ color: "#f9fafb" }}>{orgData.name}</strong> ({orgData.industry}) — {orgData.timezone}</div>
          <div>📞 {orgData.phone || "No phone"} &nbsp;|&nbsp; ⏰ {orgData.open_time} → {orgData.close_time}</div>
          <div>🗂 {services.length} service(s): {services.map((s: any) => s.name).join(", ") || "None"}</div>
          <div>👨‍⚕️ {providers.length} provider(s): {providers.map((p: any) => p.name).join(", ") || "None"}</div>
          <div>👤 Admin: {userInfo.email}</div>
          <div>🤖 Org ID: <strong style={{ color: "#6366f1" }}>#{orgId}</strong></div>
        </div>
      </div>

      {status === "idle" && (
        <button onClick={provision} style={{
          width: "100%", padding: "14px", borderRadius: 10, border: "none", cursor: "pointer",
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          color: "#fff", fontSize: 15, fontWeight: 700,
        }}>
          🚀 Provision AI Receptionist
        </button>
      )}

      {status === "loading" && (
        <div style={{ textAlign: "center", padding: 24, color: "#6b7280" }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>⚙️</div>
          <div>Talking to Vapi... This may take a few seconds.</div>
        </div>
      )}

      {status === "success" && (
        <div style={{ background: "#052e16", border: "1px solid #166534", borderRadius: 10, padding: "20px 24px" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
          <div style={{ color: "#4ade80", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Client is live!</div>
          <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 12 }}>Vapi Assistant ID (save this!):</div>
          <div style={{ background: "#0f1117", borderRadius: 6, padding: "10px 14px", fontFamily: "monospace", color: "#a5b4fc", fontSize: 13, wordBreak: "break-all" }}>
            {assistantId}
          </div>
          <div style={{ color: "#6b7280", fontSize: 12, marginTop: 14 }}>
            <strong style={{ color: "#9ca3af" }}>Next step:</strong> In Twilio Console, link the client&apos;s phone number to this Assistant ID, and set the Recording Callback to <code style={{ color: "#a5b4fc" }}>POST /api/v1/calls/twilio/recording</code>.
          </div>
          <button onClick={onDone} style={{ marginTop: 16, background: "#6366f1", color: "#fff", border: "none", padding: "10px 24px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
            Go to Client List →
          </button>
        </div>
      )}

      {status === "error" && (
        <div style={{ background: "#1a0e0e", border: "1px solid #991b1b", borderRadius: 10, padding: 20 }}>
          <div style={{ color: "#ef4444", fontWeight: 700, marginBottom: 6 }}>Provisioning failed</div>
          <div style={{ color: "#6b7280", fontSize: 13 }}>{errorMsg}</div>
          <button onClick={() => setStatus("idle")} style={{ marginTop: 14, background: "#1e2130", color: "#f9fafb", border: "none", padding: "8px 18px", borderRadius: 7, cursor: "pointer" }}>Try Again</button>
        </div>
      )}
    </div>
  );
}

// Main Wizard
export default function NewClientPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedOrgId, setSavedOrgId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const [orgData, setOrgData] = useState({
    name: "", industry: "dental", phone: "", address: "", timezone: "America/New_York",
    open_time: "09:00", close_time: "17:00", emergency_phone: "", website_url: "", map_link: "",
  });
  const [services, setServices] = useState([{ name: "", duration_minutes: 30, price: 0 }]);
  const [providers, setProviders] = useState([{ name: "", specialty: "", open_time: "09:00", close_time: "17:00" }]);
  const [userInfo, setUserInfo] = useState({ username: "", email: "", password: "", is_admin: true });

  const steps = ["Clinic Details", "Services & Providers", "Admin User", "Go Live"];

  const createOrgAndRelated = async () => {
    setSaving(true);
    setError("");
    try {
      // 1. Create org
      const orgRes = await fetch(`${API}/api/v1/admin/organizations`, {
        method: "POST", headers: authHeaders(), body: JSON.stringify(orgData),
      });
      if (!orgRes.ok) throw new Error((await orgRes.json()).detail || "Failed to create organization");
      const org = await orgRes.json();
      setSavedOrgId(org.id);

      // 2. Add services
      for (const s of services.filter(s => s.name)) {
        await fetch(`${API}/api/v1/admin/organizations/${org.id}/services`, {
          method: "POST", headers: authHeaders(), body: JSON.stringify(s),
        });
      }

      // 3. Add providers
      for (const p of providers.filter(p => p.name)) {
        await fetch(`${API}/api/v1/admin/organizations/${org.id}/providers`, {
          method: "POST", headers: authHeaders(), body: JSON.stringify(p),
        });
      }

      // 4. Create admin user
      const userRes = await fetch(`${API}/api/v1/admin/organizations/${org.id}/users`, {
        method: "POST", headers: authHeaders(), body: JSON.stringify(userInfo),
      });
      if (!userRes.ok) throw new Error((await userRes.json()).detail || "Failed to create admin user");

      setStep(3);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const canNext = () => {
    if (step === 0) return orgData.name.trim().length > 0;
    if (step === 1) return services.some(s => s.name) && providers.some(p => p.name);
    if (step === 2) return userInfo.username && userInfo.email && userInfo.password.length >= 8;
    return true;
  };

  return (
    <div style={{ padding: "36px 40px", color: "#f9fafb", maxWidth: 760, margin: "0 auto" }}>
      {/* Header */}
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Onboard New Client</h1>
      <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 36 }}>Follow the steps below to provision a new clinic.</p>

      {/* Step Progress */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 40 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : undefined }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: 13,
                background: i < step ? "#6366f1" : i === step ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#1e2130",
                color: i <= step ? "#fff" : "#4b5563",
                boxShadow: i === step ? "0 0 0 3px rgba(99,102,241,0.3)" : "none",
              }}>
                {i < step ? "✓" : i + 1}
              </div>
              <span style={{ color: i === step ? "#f9fafb" : "#4b5563", fontSize: 13, fontWeight: i === step ? 600 : 400 }}>{s}</span>
            </div>
            {i < steps.length - 1 && <div style={{ flex: 1, height: 1, background: i < step ? "#6366f1" : "#1e2130", margin: "0 12px" }} />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div style={{ background: "#13141a", border: "1px solid #1e2130", borderRadius: 16, padding: "32px 36px", marginBottom: 24 }}>
        {step === 0 && <Step1 data={orgData} setData={setOrgData} />}
        {step === 1 && <Step2 services={services} setServices={setServices} providers={providers} setProviders={setProviders} />}
        {step === 2 && <Step3 data={userInfo} setData={setUserInfo} />}
        {step === 3 && savedOrgId && (
          <Step4
            orgData={orgData} services={services} providers={providers}
            userInfo={userInfo} orgId={savedOrgId}
            onDone={() => router.push("/admin/clients")}
          />
        )}
      </div>

      {error && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 16 }}>❌ {error}</div>}

      {/* Nav Buttons */}
      {step < 3 && (
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <button onClick={() => step > 0 ? setStep(step - 1) : router.push("/admin/clients")} style={{
            background: "#1e2130", color: "#9ca3af", border: "1px solid #374151", padding: "10px 22px",
            borderRadius: 9, cursor: "pointer", fontWeight: 600, fontSize: 14,
          }}>
            {step === 0 ? "Cancel" : "← Back"}
          </button>

          {step < 2 ? (
            <button onClick={() => setStep(step + 1)} disabled={!canNext()} style={{
              background: canNext() ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "#1e2130",
              color: canNext() ? "#fff" : "#4b5563",
              border: "none", padding: "10px 28px", borderRadius: 9, cursor: canNext() ? "pointer" : "not-allowed",
              fontWeight: 700, fontSize: 14,
            }}>
              Next →
            </button>
          ) : (
            <button onClick={createOrgAndRelated} disabled={saving || !canNext()} style={{
              background: saving || !canNext() ? "#1e2130" : "linear-gradient(135deg, #10b981, #059669)",
              color: saving || !canNext() ? "#4b5563" : "#fff",
              border: "none", padding: "10px 28px", borderRadius: 9, cursor: saving ? "not-allowed" : "pointer",
              fontWeight: 700, fontSize: 14,
            }}>
              {saving ? "Creating..." : "✓ Create Client & Continue"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
