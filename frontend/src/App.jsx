import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const API = "https://staffalert.onrender.com/api";

// ── Pellissippi Theme ──────────────────────────────────────────────────────
const theme = {
  blue: "#003B71",
  gold: "#F2A900",
  blueDark: "#002856",
  blueLight: "#1A5C9E",
  goldLight: "#F7C84A",
  danger: "#C0392B",
  success: "#1E8C45",
  surface: "#F4F6F9",
  white: "#FFFFFF",
  gray: "#6B7280",
  grayLight: "#E5E7EB",
};

// ── Utility ────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const diff = Math.floor((Date.now() - date) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}

function Badge({ label, color }) {
  const colors = {
    EMERGENCY: { bg: "#FEE2E2", text: "#991B1B" },
    NORMAL: { bg: "#DCFCE7", text: "#166534" },
    SENT: { bg: "#DCFCE7", text: "#166534" },
    PARTIAL: { bg: "#FEF9C3", text: "#854D0E" },
    FAILED: { bg: "#FEE2E2", text: "#991B1B" },
    active: { bg: "#DCFCE7", text: "#166534" },
    inactive: { bg: "#F3F4F6", text: "#6B7280" },
  };
  const c = colors[label] || { bg: "#E0E7FF", text: "#3730A3" };
  return (
    <span style={{
      background: c.bg, color: c.text,
      padding: "2px 10px", borderRadius: 999,
      fontSize: 11, fontWeight: 700, letterSpacing: "0.05em"
    }}>
      {label}
    </span>
  );
}

// ── Nav ────────────────────────────────────────────────────────────────────
function Navbar({ page, setPage, onLogout }) {
  const [openMenu, setOpenMenu] = useState(null);

  const groups = [
    {
      label: "Dashboard",
      single: true,
      page: "Dashboard",
      icon: "📡"
    },
    {
      label: "Alerts",
      icon: "📢",
      items: [
        { label: "Send Alert", page: "Send Alert", icon: "📤" },
        { label: "Schedule", page: "Schedule", icon: "🕐" },
        { label: "Templates", page: "Templates", icon: "📋" },
      ]
    },
    {
      label: "People",
      icon: "👥",
      items: [
        { label: "Staff", page: "Staff", icon: "👤" },
        { label: "Students", page: "Students", icon: "🎓" },
        { label: "Import", page: "Import", icon: "⬆" },
      ]
    },
    {
      label: "Admin",
      icon: "🔒",
      items: [
        { label: "Audit Log", page: "Audit Log", icon: "📜" },
        { label: "Statistics", page: "Statistics", icon: "📊" },
      ]
    },
  ];

  const isGroupActive = (group) => {
    if (group.single) return page === group.page;
    return group.items?.some(i => i.page === page);
  };

  return (
    <nav style={{
      background: theme.blue, color: theme.white,
      display: "flex", alignItems: "center",
      padding: "0 24px", height: 60,
      boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
      position: "relative", zIndex: 100
    }} role="navigation" aria-label="Main navigation">

      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginRight: 32 }}>
        <img src="/paws-logo.png" alt="PAWS" style={{ height: 44, width: "auto" }} />
        <span style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-0.02em", color: "white" }}>
          PAWS<span style={{ color: theme.gold }}> Alert</span>
        </span>
      </div>

      {/* Nav Groups */}
      <div style={{ display: "flex", gap: 2 }}>
        {groups.map(group => (
          <div key={group.label} style={{ position: "relative" }}>
            {group.single ? (
              <button
                onClick={() => { setPage(group.page); setOpenMenu(null); }}
                aria-current={page === group.page ? "page" : undefined}
                style={{
                  background: page === group.page ? theme.gold : "transparent",
                  color: page === group.page ? theme.blue : "rgba(255,255,255,0.85)",
                  border: "none", padding: "8px 16px",
                  borderRadius: 6, cursor: "pointer",
                  fontWeight: page === group.page ? 700 : 500,
                  fontSize: 14, transition: "all 0.15s",
                  display: "flex", alignItems: "center", gap: 6
                }}>
                {group.icon} {group.label}
              </button>
            ) : (
              <>
                <button
                  onClick={() => setOpenMenu(openMenu === group.label ? null : group.label)}
                  onBlur={() => setTimeout(() => setOpenMenu(null), 150)}
                  style={{
                    background: isGroupActive(group) ? theme.gold : openMenu === group.label ? "rgba(255,255,255,0.15)" : "transparent",
                    color: isGroupActive(group) ? theme.blue : "rgba(255,255,255,0.85)",
                    border: "none", padding: "8px 16px",
                    borderRadius: 6, cursor: "pointer",
                    fontWeight: isGroupActive(group) ? 700 : 500,
                    fontSize: 14, transition: "all 0.15s",
                    display: "flex", alignItems: "center", gap: 6
                  }}>
                  {group.icon} {group.label}
                  <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 2 }}>
                    {openMenu === group.label ? "▲" : "▼"}
                  </span>
                </button>

                {/* Dropdown */}
                {openMenu === group.label && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 8px)", left: 0,
                    background: "white", borderRadius: 10,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                    minWidth: 180, overflow: "hidden",
                    border: `1px solid ${theme.grayLight}`
                  }}>
                    {group.items.map(item => (
                      <button key={item.page}
                        onClick={() => { setPage(item.page); setOpenMenu(null); }}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          width: "100%", padding: "11px 16px",
                          background: page === item.page ? "#EFF6FF" : "white",
                          color: page === item.page ? theme.blue : "#374151",
                          border: "none", cursor: "pointer",
                          fontSize: 14, fontWeight: page === item.page ? 700 : 400,
                          textAlign: "left", transition: "background 0.1s",
                          borderBottom: `1px solid ${theme.grayLight}`
                        }}
                        onMouseEnter={e => { if (page !== item.page) e.currentTarget.style.background = "#F9FAFB"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = page === item.page ? "#EFF6FF" : "white"; }}
                      >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                        {page === item.page && <span style={{ marginLeft: "auto", color: theme.blue }}>●</span>}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Right side */}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
          Pellissippi State
        </span>
        <button onClick={onLogout} style={{
          background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
          color: "rgba(255,255,255,0.8)", borderRadius: 6, padding: "6px 14px",
          cursor: "pointer", fontSize: 13, fontWeight: 600
        }}>
          Sign Out
        </button>
      </div>
    </nav>
  );
}

// ── Dashboard Page ─────────────────────────────────────────────────────────
function Dashboard() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [receipts, setReceipts] = useState(null);
  const [receiptsLoading, setReceiptsLoading] = useState(false);

  const fetchReceipts = async (alertId) => {
    setSelectedAlert(alertId);
    setReceiptsLoading(true);
    setReceipts(null);
    try {
      const res = await fetch(`${API}/receipts/${alertId}`);
      setReceipts(await res.json());
    } catch { setReceipts({ error: "Could not load receipts" }); }
    finally { setReceiptsLoading(false); }
  };

  const fetchData = useCallback(async () => {
    try {
      const [logsRes, statsRes] = await Promise.all([
        fetch(`${API}/logs/`),
        fetch(`${API}/logs/stats`)
      ]);
      setLogs(await logsRes.json());
      setStats(await statsRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // Auto-refresh every 15s
    return () => clearInterval(interval);
  }, [fetchData]);

  const statCards = [
    { label: "Total Alerts", value: stats.total_alerts ?? "—", icon: "📡" },
    { label: "Successful", value: stats.successful_alerts ?? "—", icon: "✅" },
    { label: "SMS Sent", value: stats.total_sms_sent ?? "—", icon: "📱" },
    { label: "Partial", value: stats.partial_alerts ?? "—", icon: "⚠️" },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: theme.blue, margin: 0 }}>
            Live Alert Feed
          </h1>
          <p style={{ color: theme.gray, margin: "4px 0 0", fontSize: 14 }}>
            Auto-refreshes every 15 seconds
          </p>
        </div>
        <a href={`${API}/logs/export/alerts`} style={{
          background: theme.grayLight, color: theme.gray,
          borderRadius: 8, padding: "8px 16px",
          fontWeight: 600, fontSize: 13,
          textDecoration: "none", display: "inline-block"
        }}>⬇ Export CSV</a>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {statCards.map(c => (
          <div key={c.label} style={{
            background: theme.white, borderRadius: 12,
            padding: "16px 20px", border: `1px solid ${theme.grayLight}`,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)"
          }}>
            <div style={{ fontSize: 24 }}>{c.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: theme.blue, lineHeight: 1.1 }}>
              {loading ? "…" : c.value}
            </div>
            <div style={{ fontSize: 12, color: theme.gray, marginTop: 2 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Logs Table */}
      <div style={{
        background: theme.white, borderRadius: 12,
        border: `1px solid ${theme.grayLight}`, overflow: "hidden"
      }}>
        <div style={{
          padding: "14px 20px", borderBottom: `1px solid ${theme.grayLight}`,
          display: "flex", alignItems: "center", justifyContent: "space-between"
        }}>
          <span style={{ fontWeight: 700, color: theme.blue }}>Recent Alerts</span>
          <button onClick={fetchData} style={{
            background: theme.gold, border: "none", borderRadius: 6,
            padding: "4px 14px", cursor: "pointer", fontWeight: 700,
            fontSize: 13, color: theme.blue
          }}>↻ Refresh</button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: theme.gray }}>Loading…</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: theme.gray }}>
            No alerts sent yet. Alerts triggered via SMS will appear here.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: theme.surface }}>
                {["Time", "Section", "Priority", "Message", "Recipients", "Status"].map(h => (
                  <th key={h} style={{
                    padding: "10px 16px", textAlign: "left",
                    fontSize: 12, fontWeight: 700, color: theme.gray,
                    letterSpacing: "0.05em", textTransform: "uppercase"
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={log.id} onClick={() => fetchReceipts(log.id)} style={{
                  borderTop: `1px solid ${theme.grayLight}`,
                  background: i % 2 === 0 ? theme.white : "#FAFAFA",
                  cursor: "pointer", transition: "background 0.1s"
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#EFF6FF"}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? theme.white : "#FAFAFA"}
                >
                  <td style={{ padding: "10px 16px", fontSize: 13, color: theme.gray, whiteSpace: "nowrap" }}>
                    {timeAgo(log.timestamp)}
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600 }}>
                    {log.section_code}
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <Badge label={log.priority_level} />
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: 13, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {log.message_content}
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 700, color: theme.blue }}>
                    {log.recipient_count}
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <Badge label={log.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Receipt Modal */}
      {selectedAlert && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: 24
        }} onClick={() => setSelectedAlert(null)}>
          <div style={{
            background: theme.white, borderRadius: 16,
            width: "100%", maxWidth: 600, maxHeight: "80vh",
            overflow: "auto", padding: 24
          }} onClick={e => e.stopPropagation()}>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: theme.blue, margin: 0 }}>Delivery Receipts</h2>
              <button onClick={() => setSelectedAlert(null)} style={{
                background: theme.grayLight, border: "none", borderRadius: 6,
                padding: "4px 12px", cursor: "pointer", fontWeight: 700
              }}>✕ Close</button>
            </div>

            {receiptsLoading && <p style={{ color: theme.gray }}>Loading receipts...</p>}

            {receipts && !receiptsLoading && (
              <>
                <div style={{ background: theme.surface, borderRadius: 8, padding: 12, marginBottom: 16 }}>
                  <p style={{ margin: "0 0 4px", fontSize: 13, color: "#374151" }}><strong>Message:</strong> {receipts.message}</p>
                  <p style={{ margin: 0, fontSize: 12, color: theme.gray }}>Section: {receipts.section} · {receipts.timestamp}</p>
                </div>

                {/* Summary */}
                <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                  {[
                    { label: "Total", value: receipts.total, color: theme.blue },
                    { label: "Delivered", value: receipts.sent_count, color: theme.success },
                    { label: "Failed", value: receipts.failed_count, color: theme.danger },
                  ].map(s => (
                    <div key={s.label} style={{
                      flex: 1, background: theme.surface, borderRadius: 8,
                      padding: "10px", textAlign: "center"
                    }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: 12, color: theme.gray }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Receipt List */}
                {receipts.receipts && receipts.receipts.length > 0 ? (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: theme.surface }}>
                        <th style={{ padding: "8px 12px", textAlign: "left", color: theme.gray, fontWeight: 700 }}>Phone</th>
                        <th style={{ padding: "8px 12px", textAlign: "left", color: theme.gray, fontWeight: 700 }}>Status</th>
                        <th style={{ padding: "8px 12px", textAlign: "left", color: theme.gray, fontWeight: 700 }}>Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receipts.receipts.map((r, i) => (
                        <tr key={i} style={{ borderTop: `1px solid ${theme.grayLight}` }}>
                          <td style={{ padding: "8px 12px", fontFamily: "monospace" }}>{r.phone}</td>
                          <td style={{ padding: "8px 12px" }}>
                            <span style={{
                              background: r.status === "sent" ? "#DCFCE7" : "#FEE2E2",
                              color: r.status === "sent" ? theme.success : theme.danger,
                              padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700
                            }}>{r.status.toUpperCase()}</span>
                          </td>
                          <td style={{ padding: "8px 12px", color: theme.danger, fontSize: 12 }}>
                            {r.error || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: theme.gray, fontSize: 13 }}>No individual receipts recorded for this alert. Receipts are saved for alerts sent after this feature was enabled.</p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Staff Page ─────────────────────────────────────────────────────────────
function StaffManager() {
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({ name: "", phone_number: "", system_id: "", pin: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchStaff = async () => {
    const res = await fetch(`${API}/staff/`);
    setStaff(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchStaff(); }, []);

  const handleSubmit = async () => {
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`${API}/staff/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || "Failed to create staff member");
      } else {
        setForm({ name: "", phone_number: "", system_id: "", pin: "" });
        fetchStaff();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id) => {
    await fetch(`${API}/staff/${id}/toggle`, { method: "PATCH" });
    fetchStaff();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this staff member?")) return;
    await fetch(`${API}/staff/${id}`, { method: "DELETE" });
    fetchStaff();
  };

  const inputStyle = {
    border: `1px solid ${theme.grayLight}`, borderRadius: 8,
    padding: "8px 12px", fontSize: 14, width: "100%", boxSizing: "border-box",
    outline: "none"
  };

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: theme.blue, margin: "0 0 20px" }}>
        Staff Management
      </h1>

      {/* Add Staff Form */}
      <div style={{
        background: theme.white, borderRadius: 12,
        border: `1px solid ${theme.grayLight}`, padding: 20, marginBottom: 24
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px", color: theme.blue }}>
          Add New Staff Member
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: theme.gray, display: "block", marginBottom: 4 }}>Full Name</label>
            <input style={inputStyle} placeholder="Dr. Jane Smith" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: theme.gray, display: "block", marginBottom: 4 }}>Phone Number</label>
            <input style={inputStyle} placeholder="+18655551234" value={form.phone_number}
              onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: theme.gray, display: "block", marginBottom: 4 }}>System ID</label>
            <input style={inputStyle} placeholder="STAFF001" value={form.system_id}
              onChange={e => setForm(f => ({ ...f, system_id: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: theme.gray, display: "block", marginBottom: 4 }}>5-Digit PIN</label>
            <input style={inputStyle} placeholder="12345" maxLength={5} value={form.pin}
              onChange={e => setForm(f => ({ ...f, pin: e.target.value }))} />
          </div>
          <button onClick={handleSubmit} disabled={saving} style={{
            background: theme.blue, color: theme.white,
            border: "none", borderRadius: 8, padding: "9px 20px",
            cursor: "pointer", fontWeight: 700, fontSize: 14, whiteSpace: "nowrap"
          }}>
            {saving ? "Adding…" : "+ Add Staff"}
          </button>
        </div>
        {error && <div style={{ color: theme.danger, fontSize: 13, marginTop: 10 }}>⚠ {error}</div>}
      </div>

      {/* Staff Table */}
      <div style={{
        background: theme.white, borderRadius: 12,
        border: `1px solid ${theme.grayLight}`, overflow: "hidden"
      }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: theme.gray }}>Loading…</div>
        ) : staff.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: theme.gray }}>
            No staff members yet. Add one above.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: theme.surface }}>
                {["Name", "Phone", "System ID", "PIN", "Status", "Actions"].map(h => (
                  <th key={h} style={{
                    padding: "10px 16px", textAlign: "left",
                    fontSize: 12, fontWeight: 700, color: theme.gray,
                    letterSpacing: "0.05em", textTransform: "uppercase"
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.map((s, i) => (
                <tr key={s.id} style={{ borderTop: `1px solid ${theme.grayLight}`, background: i % 2 === 0 ? theme.white : "#FAFAFA" }}>
                  <td style={{ padding: "10px 16px", fontWeight: 600 }}>{s.name}</td>
                  <td style={{ padding: "10px 16px", fontSize: 13, color: theme.gray }}>{s.phone_number}</td>
                  <td style={{ padding: "10px 16px" }}>
                    <code style={{ background: "#EFF6FF", color: theme.blue, padding: "2px 8px", borderRadius: 4, fontSize: 13 }}>
                      {s.system_id}
                    </code>
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: 13, color: theme.gray }}>•••••</td>
                  <td style={{ padding: "10px 16px" }}>
                    <Badge label={s.is_active ? "active" : "inactive"} />
                  </td>
                  <td style={{ padding: "10px 16px", display: "flex", gap: 8 }}>
                    <button onClick={() => handleToggle(s.id)} style={{
                      background: s.is_active ? "#FEF9C3" : "#DCFCE7",
                      color: s.is_active ? "#854D0E" : "#166534",
                      border: "none", borderRadius: 6, padding: "4px 12px",
                      cursor: "pointer", fontWeight: 600, fontSize: 12
                    }}>
                      {s.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button onClick={() => handleDelete(s.id)} style={{
                      background: "#FEE2E2", color: theme.danger,
                      border: "none", borderRadius: 6, padding: "4px 12px",
                      cursor: "pointer", fontWeight: 600, fontSize: 12
                    }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── CSV Import Page ────────────────────────────────────────────────────────
function CSVImport() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [drag, setDrag] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch(`${API}/import/csv`, { method: "POST", body: form });
      setResult(await res.json());
    } catch {
      setResult({ message: "Upload failed. Is the backend running?" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: theme.blue, margin: "0 0 8px" }}>
        CSV Student Import
      </h1>
      <p style={{ color: theme.gray, fontSize: 14, margin: "0 0 24px" }}>
        Upload a CSV to bulk-import student phone numbers into sections. Required columns: <strong>Phone</strong>, <strong>SectionCode</strong>
      </p>

      {/* Self Enrollment Info */}
      <div style={{
        background: theme.white, borderRadius: 12,
        border: `1px solid ${theme.grayLight}`, padding: 20, marginBottom: 24
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: theme.blue, margin: "0 0 12px" }}>
          📱 Student Self-Enrollment
        </h2>
        <p style={{ fontSize: 13, color: theme.gray, margin: "0 0 12px" }}>
          Students can subscribe themselves by texting your Twilio number — no CSV needed.
          Share these commands with your students.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            { cmd: "JOIN CS101", desc: "Subscribe to a section" },
            { cmd: "LEAVE CS101", desc: "Unsubscribe from a section" },
            { cmd: "MYSECTIONS", desc: "See all subscriptions" },
          ].map(item => (
            <div key={item.cmd} style={{
              background: theme.surface, borderRadius: 8, padding: 12,
              border: `1px solid ${theme.grayLight}`, flex: 1, minWidth: 180
            }}>
              <code style={{
                background: "#1E1E1E", color: "#00FF88",
                padding: "4px 10px", borderRadius: 4,
                fontSize: 13, display: "block", marginBottom: 6
              }}>
                {item.cmd}
              </code>
              <span style={{ fontSize: 12, color: theme.gray }}>{item.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Format Guide */}
      <div style={{
        background: "#EFF6FF", border: `1px solid #BFDBFE`,
        borderRadius: 10, padding: 16, marginBottom: 24
      }}>
        <div style={{ fontWeight: 700, color: theme.blue, marginBottom: 8, fontSize: 14 }}>
          📋 Expected CSV Format
        </div>
        <table style={{ borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ padding: "4px 16px 4px 0", color: theme.blue, textAlign: "left" }}>Phone</th>
              <th style={{ padding: "4px 16px 4px 0", color: theme.blue, textAlign: "left" }}>SectionCode</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["+18655551234", "CS101"],
              ["865-555-5678", "MATH201"],
              ["8655559999", "CS101"],
            ].map((r, i) => (
              <tr key={i}>
                <td style={{ padding: "3px 16px 3px 0", color: "#374151", fontFamily: "monospace" }}>{r[0]}</td>
                <td style={{ padding: "3px 16px 3px 0", color: "#374151", fontFamily: "monospace" }}>{r[1]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ margin: "8px 0 0", fontSize: 12, color: theme.gray }}>
          Phone numbers are auto-normalized to E.164. Sections are auto-created if they don't exist.
          Duplicates are skipped.
        </p>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); setFile(e.dataTransfer.files[0]); }}
        style={{
          border: `2px dashed ${drag ? theme.blue : theme.grayLight}`,
          background: drag ? "#EFF6FF" : theme.surface,
          borderRadius: 12, padding: 40, textAlign: "center",
          transition: "all 0.15s", marginBottom: 16, cursor: "pointer"
        }}
        onClick={() => document.getElementById("csv-input").click()}
      >
        <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
        <div style={{ fontWeight: 700, color: theme.blue, marginBottom: 4 }}>
          {file ? file.name : "Drop your CSV here or click to browse"}
        </div>
        <div style={{ fontSize: 13, color: theme.gray }}>
          {file ? `${(file.size / 1024).toFixed(1)} KB — ready to upload` : "Supports .csv files"}
        </div>
        <input id="csv-input" type="file" accept=".csv" style={{ display: "none" }}
          onChange={e => setFile(e.target.files[0])} />
      </div>

      <button onClick={handleUpload} disabled={!file || loading} style={{
        background: file ? theme.blue : theme.grayLight,
        color: file ? theme.white : theme.gray,
        border: "none", borderRadius: 8, padding: "10px 28px",
        cursor: file ? "pointer" : "not-allowed",
        fontWeight: 700, fontSize: 15, transition: "all 0.15s"
      }}>
        {loading ? "Importing…" : "Upload & Import"}
      </button>

      {/* Results */}
      {result && (
        <div style={{
          marginTop: 24, background: theme.white,
          borderRadius: 12, border: `1px solid ${theme.grayLight}`, padding: 20
        }}>
          <div style={{ fontWeight: 700, color: theme.blue, marginBottom: 12 }}>
            Import Results
          </div>
          <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: theme.success }}>{result.imported ?? "—"}</div>
              <div style={{ fontSize: 12, color: theme.gray }}>Imported</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: theme.gray }}>{result.skipped ?? "—"}</div>
              <div style={{ fontSize: 12, color: theme.gray }}>Skipped</div>
            </div>
          </div>
          <div style={{ color: theme.success, fontWeight: 600, marginBottom: result.errors?.length ? 12 : 0 }}>
            {result.message}
          </div>
          {result.errors?.length > 0 && (
            <div style={{ background: "#FEF2F2", borderRadius: 8, padding: 12 }}>
              <div style={{ fontWeight: 700, color: theme.danger, fontSize: 13, marginBottom: 6 }}>
                ⚠ Row Errors:
              </div>
              {result.errors.map((e, i) => (
                <div key={i} style={{ fontSize: 12, color: theme.danger }}>{e}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Students Page ──────────────────────────────────────────────────────────
function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState("");

  const fetchStudents = async (all = false) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/students?active_only=${!all}`);
      setStudents(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStudents(showAll); }, [showAll]);

  const handleRemove = async (id) => {
    if (!confirm("Remove this student from the alert system?")) return;
    await fetch(`${API}/students/${id}`, { method: "DELETE" });
    fetchStudents(showAll);
  };

  const handleDeactivate = async (id) => {
    await fetch(`${API}/students/${id}/deactivate`, { method: "PATCH" });
    fetchStudents(showAll);
  };

  const filtered = students.filter(s =>
    s.student_name.toLowerCase().includes(search.toLowerCase()) ||
    s.student_phone.includes(search) ||
    s.section_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: theme.blue, margin: 0 }}>
            Student Subscribers
          </h1>
          <p style={{ color: theme.gray, fontSize: 14, margin: "4px 0 0" }}>
            {students.length} {showAll ? "total" : "active"} subscribers
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <a href={`${API}/logs/export/students`} style={{
            background: theme.grayLight, color: theme.gray,
            borderRadius: 8, padding: "8px 16px",
            fontWeight: 600, fontSize: 13,
            textDecoration: "none", display: "inline-block"
          }}>⬇ Export CSV</a>
          <button onClick={() => setShowAll(!showAll)} style={{
            background: showAll ? theme.blue : theme.grayLight,
            color: showAll ? theme.white : theme.gray,
            border: "none", borderRadius: 8, padding: "8px 16px",
            cursor: "pointer", fontWeight: 600, fontSize: 13
          }}>
            {showAll ? "Showing All" : "Show Graduated"}
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          placeholder="Search by name, phone, or section..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: "100%", padding: "10px 16px",
            border: `1px solid ${theme.grayLight}`,
            borderRadius: 10, fontSize: 14, outline: "none",
            boxSizing: "border-box"
          }}
        />
      </div>

      {/* CSV Format reminder */}
      <div style={{
        background: "#EFF6FF", border: `1px solid #BFDBFE`,
        borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13, color: "#1E40AF"
      }}>
        📋 <strong>CSV columns supported:</strong> Phone, SectionCode, Name, GraduationDate (YYYY-MM-DD) — students auto-deactivate on graduation date
      </div>

      {/* Table */}
      <div style={{
        background: theme.white, borderRadius: 12,
        border: `1px solid ${theme.grayLight}`, overflow: "hidden"
      }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: theme.gray }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: theme.gray }}>
            No students found. Import a CSV to add students.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: theme.surface }}>
                {["Name", "Phone", "Section", "Graduation Date", "Status", "Actions"].map(h => (
                  <th key={h} style={{
                    padding: "10px 16px", textAlign: "left",
                    fontSize: 12, fontWeight: 700, color: theme.gray,
                    letterSpacing: "0.05em", textTransform: "uppercase"
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id} style={{
                  borderTop: `1px solid ${theme.grayLight}`,
                  background: !s.is_active ? "#FAFAFA" : i % 2 === 0 ? theme.white : "#FAFAFA",
                  opacity: s.is_active ? 1 : 0.6
                }}>
                  <td style={{ padding: "10px 16px", fontWeight: 600 }}>{s.student_name}</td>
                  <td style={{ padding: "10px 16px", fontSize: 13, color: theme.gray, fontFamily: "monospace" }}>
                    {s.student_phone}
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <code style={{ background: "#EFF6FF", color: theme.blue, padding: "2px 8px", borderRadius: 4, fontSize: 13 }}>
                      {s.section_code}
                    </code>
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: 13, color: theme.gray }}>
                    {s.graduation_date || "—"}
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <Badge label={s.status === "Graduated" ? "inactive" : "active"} />
                  </td>
                  <td style={{ padding: "10px 16px", display: "flex", gap: 8 }}>
                    {s.is_active && (
                      <button onClick={() => handleDeactivate(s.id)} style={{
                        background: "#FEF9C3", color: "#854D0E",
                        border: "none", borderRadius: 6, padding: "4px 12px",
                        cursor: "pointer", fontWeight: 600, fontSize: 12
                      }}>Deactivate</button>
                    )}
                    <button onClick={() => handleRemove(s.id)} style={{
                      background: "#FEE2E2", color: theme.danger,
                      border: "none", borderRadius: 6, padding: "4px 12px",
                      cursor: "pointer", fontWeight: 600, fontSize: 12
                    }}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Send Alert Page ────────────────────────────────────────────────────────
function SendAlert() {
  const [message, setMessage] = useState("");
  const [sectionCode, setSectionCode] = useState("00000");
  const [priority, setPriority] = useState("NORMAL");
  const [sections, setSections] = useState([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    fetch(`${API}/alerts/sections-list`).then(r => r.json()).then(setSections).catch(() => {});
    fetch(`${API}/alerts/templates`).then(r => r.json()).then(setTemplates).catch(() => {});
  }, []);

  const handleSend = async () => {
    if (!message.trim()) { setError("Message cannot be empty"); return; }
    if (message.length > 160) { setError("Message exceeds 160 characters"); return; }
    setSending(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`${API}/alerts/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, section_code: sectionCode, priority_level: priority })
      });
      const data = await res.json();
      if (!res.ok) setError(data.detail || "Failed to send alert");
      else setResult(data);
    } catch { setError("Could not reach backend"); }
    finally { setSending(false); }
  };

  const applyTemplate = (t) => {
    setMessage(t.message);
    if (t.section_code) setSectionCode(t.section_code);
    setPriority(t.priority_level);
  };

  const charColor = message.length > 140 ? theme.danger : message.length > 120 ? "#D97706" : theme.gray;

  return (
    <div style={{ padding: 24, maxWidth: 700, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: theme.blue, margin: "0 0 6px" }}>
        Send Alert
      </h1>
      <p style={{ color: theme.gray, fontSize: 14, margin: "0 0 24px" }}>
        Broadcast an alert directly from the dashboard without needing a phone.
      </p>

      {/* Quick Templates */}
      {templates.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: theme.gray, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            Quick Templates
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {templates.map(t => (
              <button key={t.id} onClick={() => applyTemplate(t)} style={{
                background: t.priority_level === "EMERGENCY" ? "#FEE2E2" : "#EFF6FF",
                color: t.priority_level === "EMERGENCY" ? theme.danger : theme.blue,
                border: `1px solid ${t.priority_level === "EMERGENCY" ? "#FCA5A5" : "#BFDBFE"}`,
                borderRadius: 20, padding: "6px 14px",
                cursor: "pointer", fontSize: 13, fontWeight: 600
              }}>
                {t.priority_level === "EMERGENCY" ? "🚨 " : "📢 "}{t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      <div style={{ background: theme.white, borderRadius: 16, border: `1px solid ${theme.grayLight}`, padding: 24 }}>

        {/* Section */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: theme.gray, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Send To
          </label>
          <select value={sectionCode} onChange={e => setSectionCode(e.target.value)} style={{
            width: "100%", padding: "10px 12px", border: `1px solid ${theme.grayLight}`,
            borderRadius: 8, fontSize: 14, outline: "none", background: "white", boxSizing: "border-box"
          }}>
            {sections.map(s => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: theme.gray, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Priority
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            {["NORMAL", "URGENT", "EMERGENCY"].map(p => (
              <button key={p} onClick={() => setPriority(p)} style={{
                flex: 1, padding: "8px",
                background: priority === p ? (p === "EMERGENCY" ? theme.danger : p === "URGENT" ? "#D97706" : theme.blue) : theme.grayLight,
                color: priority === p ? "white" : theme.gray,
                border: "none", borderRadius: 8, cursor: "pointer",
                fontWeight: 700, fontSize: 13, transition: "all 0.15s"
              }}>{p}</button>
            ))}
          </div>
        </div>

        {/* Message */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: theme.gray, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Message
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Type your alert message here..."
            rows={4}
            style={{
              width: "100%", padding: "10px 12px",
              border: `1px solid ${message.length > 160 ? theme.danger : theme.grayLight}`,
              borderRadius: 8, fontSize: 14, outline: "none",
              resize: "vertical", boxSizing: "border-box", fontFamily: "inherit"
            }}
          />
          <div style={{ textAlign: "right", fontSize: 12, color: charColor, marginTop: 4 }}>
            {message.length}/160 characters
          </div>
        </div>

        {error && (
          <div style={{ background: "#FEE2E2", color: theme.danger, borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>
            ⚠ {error}
          </div>
        )}

        {result && (
          <div style={{ background: theme.green_bg || "#DCFCE7", color: theme.success, borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16, fontWeight: 600 }}>
            ✅ {result.message}
          </div>
        )}

        <button onClick={handleSend} disabled={sending || message.length > 160} style={{
          width: "100%",
          background: priority === "EMERGENCY" ? theme.danger : theme.blue,
          color: "white", border: "none", borderRadius: 10,
          padding: "14px", fontSize: 16, fontWeight: 700,
          cursor: sending ? "not-allowed" : "pointer",
          opacity: sending ? 0.7 : 1
        }}>
          {sending ? "Sending..." : priority === "EMERGENCY" ? "🚨 Send Emergency Broadcast" : "📢 Send Alert"}
        </button>
      </div>
    </div>
  );
}


// ── Templates Page ─────────────────────────────────────────────────────────
function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState({ name: "", message: "", section_code: "", priority_level: "NORMAL" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchTemplates = async () => {
    const res = await fetch(`${API}/alerts/templates`);
    setTemplates(await res.json());
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleSave = async () => {
    if (!form.name.trim() || !form.message.trim()) { setError("Name and message are required"); return; }
    if (form.message.length > 160) { setError("Message exceeds 160 characters"); return; }
    setSaving(true);
    setError("");
    try {
      await fetch(`${API}/alerts/templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      setForm({ name: "", message: "", section_code: "", priority_level: "NORMAL" });
      fetchTemplates();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this template?")) return;
    await fetch(`${API}/alerts/templates/${id}`, { method: "DELETE" });
    fetchTemplates();
  };

  const inputStyle = {
    border: `1px solid ${theme.grayLight}`, borderRadius: 8,
    padding: "8px 12px", fontSize: 14, width: "100%", boxSizing: "border-box", outline: "none"
  };

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: theme.blue, margin: "0 0 6px" }}>
        Alert Templates
      </h1>
      <p style={{ color: theme.gray, fontSize: 14, margin: "0 0 24px" }}>
        Save common messages as templates for one-click sending.
      </p>

      {/* Add Template */}
      <div style={{ background: theme.white, borderRadius: 16, border: `1px solid ${theme.grayLight}`, padding: 20, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px", color: theme.blue }}>New Template</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: theme.gray, display: "block", marginBottom: 4 }}>Template Name</label>
            <input style={inputStyle} placeholder="e.g. Class Cancelled" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: theme.gray, display: "block", marginBottom: 4 }}>Priority</label>
            <select style={inputStyle} value={form.priority_level}
              onChange={e => setForm(f => ({ ...f, priority_level: e.target.value }))}>
              <option>NORMAL</option>
              <option>URGENT</option>
              <option>EMERGENCY</option>
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: theme.gray, display: "block", marginBottom: 4 }}>Message (max 160 chars)</label>
          <textarea style={{ ...inputStyle, resize: "vertical" }} rows={3}
            placeholder="Type your template message..."
            value={form.message}
            onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
          <div style={{ textAlign: "right", fontSize: 11, color: form.message.length > 160 ? theme.danger : theme.gray }}>
            {form.message.length}/160
          </div>
        </div>
        {error && <div style={{ color: theme.danger, fontSize: 13, marginBottom: 10 }}>⚠ {error}</div>}
        <button onClick={handleSave} disabled={saving} style={{
          background: theme.blue, color: "white", border: "none",
          borderRadius: 8, padding: "9px 20px", cursor: "pointer", fontWeight: 700, fontSize: 14
        }}>
          {saving ? "Saving..." : "+ Save Template"}
        </button>
      </div>

      {/* Templates List */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {templates.map(t => (
          <div key={t.id} style={{
            background: theme.white, borderRadius: 12,
            border: `1px solid ${t.priority_level === "EMERGENCY" ? "#FCA5A5" : theme.grayLight}`,
            padding: 20
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: theme.blue }}>{t.name}</span>
              <Badge label={t.priority_level} />
            </div>
            <p style={{ fontSize: 13, color: "#374151", margin: "0 0 16px", lineHeight: 1.5 }}>{t.message}</p>
            <button onClick={() => handleDelete(t.id)} style={{
              background: "#FEE2E2", color: theme.danger,
              border: "none", borderRadius: 6, padding: "4px 12px",
              cursor: "pointer", fontWeight: 600, fontSize: 12
            }}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}


// ── Login Screen ───────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError("Invalid username or password");
      } else {
        localStorage.setItem("paws_token", data.access_token);
        onLogin();
      }
    } catch {
      setError("Could not reach server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: theme.blueDark,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Segoe UI', system-ui, sans-serif"
    }}>
      {/* Background pattern */}
      <div style={{
        position: "fixed", inset: 0, opacity: 0.04,
        backgroundImage: "radial-gradient(circle, #F2A900 1px, transparent 1px)",
        backgroundSize: "32px 32px"
      }} />

      {/* Login Card */}
      <div style={{
        background: "white", borderRadius: 20,
        padding: "48px 44px", width: "100%", maxWidth: 420,
        boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
        position: "relative", zIndex: 1
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src="/paws-logo.png" alt="PAWS" style={{ height: 72, width: "auto", marginBottom: 16 }} />
          <h1 style={{
            fontSize: 28, fontWeight: 900, color: theme.blue,
            margin: 0, letterSpacing: "-0.02em"
          }}>
            PAWS<span style={{ color: theme.gold }}>Alert</span>
          </h1>
          <p style={{ color: theme.gray, fontSize: 14, margin: "6px 0 0" }}>
            Admin Dashboard — Pellissippi State
          </p>
        </div>

        {/* Fields */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: theme.gray, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter username"
            style={{
              width: "100%", padding: "12px 16px",
              border: `2px solid ${error ? theme.danger : theme.grayLight}`,
              borderRadius: 10, fontSize: 15, outline: "none",
              boxSizing: "border-box", transition: "border 0.15s"
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: theme.gray, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter password"
            style={{
              width: "100%", padding: "12px 16px",
              border: `2px solid ${error ? theme.danger : theme.grayLight}`,
              borderRadius: 10, fontSize: 15, outline: "none",
              boxSizing: "border-box", transition: "border 0.15s"
            }}
          />
        </div>

        {error && (
          <div style={{
            background: "#FEE2E2", color: theme.danger,
            borderRadius: 8, padding: "10px 14px",
            fontSize: 13, fontWeight: 600, marginBottom: 16,
            textAlign: "center"
          }}>
            ⚠ {error}
          </div>
        )}

        <button onClick={handleLogin} disabled={loading} style={{
          width: "100%", background: theme.blue,
          color: "white", border: "none", borderRadius: 10,
          padding: "14px", fontSize: 16, fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1, transition: "all 0.15s"
        }}>
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <p style={{ textAlign: "center", fontSize: 12, color: theme.gray, marginTop: 20 }}>
          🔒 Authorized personnel only
        </p>
      </div>

      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 24 }}>
        Pellissippi State Community College © 2025
      </p>
    </div>
  );
}

// ── Schedule Page ──────────────────────────────────────────────────────────
function SchedulePage() {
  const [scheduled, setScheduled] = useState([]);
  const [sections, setSections] = useState([]);
  const [form, setForm] = useState({
    message: "", section_code: "00000", priority_level: "NORMAL", scheduled_for: ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchScheduled = async () => {
    const res = await fetch(`${API}/scheduled/`);
    setScheduled(await res.json());
  };

  useEffect(() => {
    fetchScheduled();
    fetch(`${API}/alerts/sections-list`).then(r => r.json()).then(setSections).catch(() => {});
    const interval = setInterval(fetchScheduled, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSchedule = async () => {
    setError(""); setSuccess("");
    if (!form.message.trim()) { setError("Message cannot be empty"); return; }
    if (!form.scheduled_for) { setError("Please select a date and time"); return; }
    if (form.message.length > 160) { setError("Message exceeds 160 characters"); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API}/scheduled/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, scheduled_for: new Date(form.scheduled_for).toISOString().slice(0, 19) })
      });
      const data = await res.json();
      if (!res.ok) setError(data.detail || "Failed to schedule alert");
      else {
        setSuccess(`Alert scheduled for ${data.scheduled_for}`);
        setForm({ message: "", section_code: "00000", priority_level: "NORMAL", scheduled_for: "" });
        fetchScheduled();
      }
    } catch { setError("Could not reach backend"); }
    finally { setSaving(false); }
  };

  const handleCancel = async (id) => {
    if (!confirm("Cancel this scheduled alert?")) return;
    await fetch(`${API}/scheduled/${id}`, { method: "DELETE" });
    fetchScheduled();
  };

  const statusColors = {
    PENDING:   { bg: "#EFF6FF", color: "#1D4ED8" },
    SENT:      { bg: "#DCFCE7", color: "#166534" },
    PARTIAL:   { bg: "#FEF9C3", color: "#854D0E" },
    FAILED:    { bg: "#FEE2E2", color: "#991B1B" },
    CANCELLED: { bg: "#F3F4F6", color: "#6B7280" },
  };

  const inputStyle = {
    border: `1px solid ${theme.grayLight}`, borderRadius: 8,
    padding: "10px 12px", fontSize: 14, width: "100%",
    boxSizing: "border-box", outline: "none", fontFamily: "inherit"
  };

  const pending = scheduled.filter(a => a.status === "PENDING");
  const past = scheduled.filter(a => a.status !== "PENDING");

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: theme.blue, margin: "0 0 6px" }}>
        Schedule Alert
      </h1>
      <p style={{ color: theme.gray, fontSize: 14, margin: "0 0 24px" }}>
        Set an alert to send automatically at a future date and time.
      </p>

      {/* Schedule Form */}
      <div style={{ background: theme.white, borderRadius: 16, border: `1px solid ${theme.grayLight}`, padding: 24, marginBottom: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: theme.gray, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Send To
            </label>
            <select value={form.section_code} onChange={e => setForm(f => ({ ...f, section_code: e.target.value }))} style={inputStyle}>
              {sections.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: theme.gray, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Priority
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {["NORMAL", "URGENT", "EMERGENCY"].map(p => (
                <button key={p} onClick={() => setForm(f => ({ ...f, priority_level: p }))} style={{
                  flex: 1, padding: "10px",
                  background: form.priority_level === p
                    ? (p === "EMERGENCY" ? theme.danger : p === "URGENT" ? "#D97706" : theme.blue)
                    : theme.grayLight,
                  color: form.priority_level === p ? "white" : theme.gray,
                  border: "none", borderRadius: 8, cursor: "pointer",
                  fontWeight: 700, fontSize: 12
                }}>{p}</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: theme.gray, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Date & Time
          </label>
          <input
            type="datetime-local"
            value={form.scheduled_for}
            onChange={e => setForm(f => ({ ...f, scheduled_for: e.target.value }))}
            style={inputStyle}
            min={new Date().toISOString().slice(0, 16)}
          />
          <p style={{ fontSize: 11, color: theme.gray, margin: "4px 0 0" }}>
            Times are in your local timezone. The server runs on UTC.
          </p>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: theme.gray, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Message
          </label>
          <textarea rows={3} value={form.message}
            onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
            placeholder="Type your scheduled message..."
            style={{ ...inputStyle, resize: "vertical" }}
          />
          <div style={{ textAlign: "right", fontSize: 11, color: form.message.length > 140 ? theme.danger : theme.gray, marginTop: 4 }}>
            {form.message.length}/160
          </div>
        </div>

        {error && <div style={{ background: "#FEE2E2", color: theme.danger, borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 12 }}>⚠ {error}</div>}
        {success && <div style={{ background: "#DCFCE7", color: theme.success, borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 12, fontWeight: 600 }}>✅ {success}</div>}

        <button onClick={handleSchedule} disabled={saving} style={{
          background: theme.blue, color: "white", border: "none",
          borderRadius: 10, padding: "13px", fontSize: 15,
          fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
          width: "100%", opacity: saving ? 0.7 : 1
        }}>
          {saving ? "Scheduling..." : "🕐 Schedule Alert"}
        </button>
      </div>

      {/* Pending Scheduled Alerts */}
      {pending.length > 0 && (
        <>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: theme.blue, margin: "0 0 12px" }}>
            ⏳ Upcoming ({pending.length})
          </h2>
          <div style={{ display: "grid", gap: 12, marginBottom: 24 }}>
            {pending.map(a => (
              <div key={a.id} style={{
                background: theme.white, borderRadius: 12,
                border: `1px solid #BFDBFE`, padding: 16,
                display: "flex", justifyContent: "space-between", alignItems: "center"
              }}>
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: theme.blue }}>{a.section_code}</span>
                    <Badge label={a.priority_level} />
                    <span style={{ fontSize: 12, color: theme.gray }}>🕐 {a.scheduled_for}</span>
                  </div>
                  <p style={{ fontSize: 13, color: "#374151", margin: 0 }}>{a.message}</p>
                </div>
                <button onClick={() => handleCancel(a.id)} style={{
                  background: "#FEE2E2", color: theme.danger,
                  border: "none", borderRadius: 6, padding: "6px 14px",
                  cursor: "pointer", fontWeight: 600, fontSize: 13, marginLeft: 16, whiteSpace: "nowrap"
                }}>Cancel</button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Past Scheduled Alerts */}
      {past.length > 0 && (
        <>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: theme.gray, margin: "0 0 12px" }}>
            History
          </h2>
          <div style={{ background: theme.white, borderRadius: 12, border: `1px solid ${theme.grayLight}`, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: theme.surface }}>
                  {["Scheduled For", "Section", "Message", "Status", "Recipients"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", fontSize: 12, fontWeight: 700, color: theme.gray, textAlign: "left", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {past.map((a, i) => {
                  const c = statusColors[a.status] || statusColors.PENDING;
                  return (
                    <tr key={a.id} style={{ borderTop: `1px solid ${theme.grayLight}` }}>
                      <td style={{ padding: "10px 16px", fontSize: 13, color: theme.gray }}>{a.scheduled_for}</td>
                      <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: theme.blue }}>{a.section_code}</td>
                      <td style={{ padding: "10px 16px", fontSize: 13, color: "#374151", maxWidth: 300 }}>{a.message}</td>
                      <td style={{ padding: "10px 16px" }}>
                        <span style={{ background: c.bg, color: c.color, padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{a.status}</span>
                      </td>
                      <td style={{ padding: "10px 16px", fontSize: 13, color: theme.gray }}>{a.recipient_count || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {pending.length === 0 && past.length === 0 && (
        <div style={{ textAlign: "center", padding: 48, color: theme.gray }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🕐</div>
          <div style={{ fontWeight: 600 }}>No scheduled alerts yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Use the form above to schedule your first alert</div>
        </div>
      )}
    </div>
  );
}


// ── Statistics Page ────────────────────────────────────────────────────────
function StatisticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [Recharts, setRecharts] = useState(null);

  useEffect(() => {
    import("recharts").then(m => setRecharts(m)).catch(() => {});
    fetch(`${API}/logs/stats/charts`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError("Could not load statistics"); setLoading(false); });
  }, []);

  const COLORS = [theme.blue, theme.gold, "#10B981", "#8B5CF6", "#EF4444", "#F59E0B", "#06B6D4", "#EC4899"];

  const statCard = (icon, label, value, sub = null, color = theme.blue) => (
    <div style={{
      background: theme.white, borderRadius: 12,
      border: `1px solid ${theme.grayLight}`,
      padding: "20px", flex: 1, minWidth: 140
    }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 30, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, color: theme.gray, marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: theme.gray, marginTop: 2 }}>{sub}</div>}
    </div>
  );

  if (loading || !Recharts) return (
    <div style={{ padding: 48, textAlign: "center", color: theme.gray }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
      <div>Loading statistics...</div>
    </div>
  );

  if (error) return (
    <div style={{ padding: 48, textAlign: "center", color: theme.danger }}>{error}</div>
  );

  const {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, AreaChart, Area
  } = Recharts;

  const s = data.summary;
  const chartDays = data.alerts_by_day.slice(-14);
  const activeHours = data.alerts_by_hour.filter(h => h.alerts > 0);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: theme.blue, margin: 0 }}>Statistics</h1>
          <p style={{ color: theme.gray, fontSize: 14, margin: "4px 0 0" }}>Live analytics from your PAWS Alert system</p>
        </div>
        <button onClick={() => {
          setLoading(true);
          fetch(`${API}/logs/stats/charts`).then(r => r.json()).then(d => { setData(d); setLoading(false); });
        }} style={{
          background: theme.gold, border: "none", borderRadius: 8,
          padding: "8px 16px", cursor: "pointer", fontWeight: 700, fontSize: 13, color: theme.blue
        }}>↻ Refresh</button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {statCard("📡", "Total Alerts", s.total_alerts)}
        {statCard("📱", "SMS Sent", s.total_sms)}
        {statCard("✅", "Success Rate", `${s.success_rate}%`, null, theme.success)}
        {statCard("🎓", "Active Students", s.active_students, `of ${s.total_students} total`)}
        {statCard("📚", "Sections", s.total_sections)}
      </div>

      {/* Row 1: Alert Volume + Delivery Rate */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

        {/* Alert Volume Chart */}
        <div style={{ background: theme.white, borderRadius: 12, border: `1px solid ${theme.grayLight}`, padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: theme.blue, margin: "0 0 16px" }}>
            📈 Alert Volume — Last 14 Days
          </h3>
          {chartDays.length === 0 ? (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: theme.gray, fontSize: 13 }}>
              No alert data yet — send some alerts to see this chart
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartDays} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.grayLight} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="alerts" name="Alerts" fill={theme.blue} radius={[4,4,0,0]} />
                <Bar dataKey="sms" name="SMS Sent" fill={theme.gold} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Delivery Success Rate */}
        <div style={{ background: theme.white, borderRadius: 12, border: `1px solid ${theme.grayLight}`, padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: theme.blue, margin: "0 0 16px" }}>
            📬 Delivery Success Rate — Last 14 Days
          </h3>
          {data.delivery_rate.every(d => d.rate === null) ? (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: theme.gray, fontSize: 13 }}>
              No delivery receipt data yet — receipts are saved for new alerts
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.delivery_rate.slice(-14)} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="successGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.grayLight} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip formatter={(v) => v !== null ? `${v}%` : "No data"} />
                <Area type="monotone" dataKey="rate" name="Success %" stroke="#10B981" fill="url(#successGrad)" strokeWidth={2} dot={false} connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Row 2: Section Activity + Priority Breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>

        {/* Alerts by Section */}
        <div style={{ background: theme.white, borderRadius: 12, border: `1px solid ${theme.grayLight}`, padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: theme.blue, margin: "0 0 16px" }}>
            📚 Most Active Sections
          </h3>
          {data.alerts_by_section.length === 0 ? (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: theme.gray, fontSize: 13 }}>
              No section data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.alerts_by_section} layout="vertical" margin={{ top: 0, right: 16, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.grayLight} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="section" tick={{ fontSize: 11 }} width={60} />
                <Tooltip />
                <Bar dataKey="alerts" name="Alerts" fill={theme.blue} radius={[0,4,4,0]}>
                  {data.alerts_by_section.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Priority Breakdown */}
        <div style={{ background: theme.white, borderRadius: 12, border: `1px solid ${theme.grayLight}`, padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: theme.blue, margin: "0 0 16px" }}>
            🚨 Priority Breakdown
          </h3>
          {data.alerts_by_priority.length === 0 ? (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: theme.gray, fontSize: 13 }}>
              No data yet
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={data.alerts_by_priority} dataKey="count" nameKey="priority"
                    cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
                    {data.alerts_by_priority.map((_, i) => (
                      <Cell key={i} fill={
                        _.priority === "EMERGENCY" ? "#EF4444" :
                        _.priority === "URGENT" ? "#F59E0B" : theme.blue
                      } />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                {data.alerts_by_priority.map(p => (
                  <div key={p.priority} style={{ fontSize: 11, color: theme.gray, display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: "50%", display: "inline-block",
                      background: p.priority === "EMERGENCY" ? "#EF4444" : p.priority === "URGENT" ? "#F59E0B" : theme.blue
                    }}/>
                    {p.priority} ({p.count})
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Row 3: Peak Hours + Section Enrollment */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Peak Alert Hours */}
        <div style={{ background: theme.white, borderRadius: 12, border: `1px solid ${theme.grayLight}`, padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: theme.blue, margin: "0 0 16px" }}>
            🕐 Peak Alert Hours
          </h3>
          {activeHours.length === 0 ? (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: theme.gray, fontSize: 13 }}>
              No hourly data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.alerts_by_hour} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.grayLight} />
                <XAxis dataKey="hour" tick={{ fontSize: 9 }} interval={3} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="alerts" name="Alerts" fill={theme.gold} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Students per Section */}
        <div style={{ background: theme.white, borderRadius: 12, border: `1px solid ${theme.grayLight}`, padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: theme.blue, margin: "0 0 16px" }}>
            🎓 Students per Section
          </h3>
          {data.section_enrollment.length === 0 ? (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: theme.gray, fontSize: 13 }}>
              No enrolled students yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.section_enrollment} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.grayLight} />
                <XAxis dataKey="section" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="students" name="Students" radius={[4,4,0,0]}>
                  {data.section_enrollment.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}


// ── Audit Log Page ─────────────────────────────────────────────────────────
function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("paws_token");
    fetch(`${API}/auth/audit-logs`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => { setLogs(data); setLoading(false); })
      .catch(() => { setError("Could not load audit logs"); setLoading(false); });
  }, []);

  const actionColor = (action) => {
    if (action.includes("DELETE")) return { bg: "#FEE2E2", color: "#991B1B" };
    if (action.includes("FAILED")) return { bg: "#FEE2E2", color: "#991B1B" };
    if (action.includes("CREATE")) return { bg: "#DCFCE7", color: "#166534" };
    if (action.includes("LOGIN_SUCCESS")) return { bg: "#DCFCE7", color: "#166534" };
    if (action.includes("TOGGLE")) return { bg: "#FEF9C3", color: "#854D0E" };
    return { bg: "#EFF6FF", color: "#1D4ED8" };
  };

  return (
    <div style={{ padding: 24 }} role="main" aria-label="Audit Log">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: theme.blue, margin: 0 }}>Audit Log</h1>
          <p style={{ color: theme.gray, fontSize: 14, margin: "4px 0 0" }}>
            Every action taken in the system with timestamp and IP address
          </p>
        </div>
        <a href={`${API}/auth/audit-logs?limit=1000`} style={{
          background: theme.grayLight, color: theme.gray,
          borderRadius: 8, padding: "8px 16px",
          fontWeight: 600, fontSize: 13, textDecoration: "none"
        }}>⬇ Export</a>
      </div>

      {loading && <p style={{ color: theme.gray }}>Loading...</p>}
      {error && <p style={{ color: theme.danger }}>{error}</p>}

      {!loading && !error && (
        <div style={{ background: theme.white, borderRadius: 16, border: `1px solid ${theme.grayLight}`, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }} aria-label="Audit log entries">
            <thead>
              <tr style={{ background: theme.blue }}>
                {["Timestamp", "Action", "Details", "IP Address"].map(h => (
                  <th key={h} scope="col" style={{ padding: "12px 16px", color: "white", fontWeight: 700, fontSize: 13, textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr><td colSpan={4} style={{ padding: 24, textAlign: "center", color: theme.gray }}>No audit logs yet</td></tr>
              )}
              {logs.map((log, i) => {
                const c = actionColor(log.action);
                return (
                  <tr key={log.id} style={{ background: i % 2 === 0 ? theme.white : theme.surface }}>
                    <td style={{ padding: "10px 16px", fontSize: 13, color: theme.gray, whiteSpace: "nowrap" }}>{log.timestamp}</td>
                    <td style={{ padding: "10px 16px" }}>
                      <span style={{ background: c.bg, color: c.color, padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: "10px 16px", fontSize: 13, color: "#374151" }}>{log.details}</td>
                    <td style={{ padding: "10px 16px", fontSize: 12, color: theme.gray, fontFamily: "monospace" }}>{log.ip_address}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Root App ────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("Dashboard");
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem("paws_token"));

  const handleLogout = () => {
    localStorage.removeItem("paws_token");
    setLoggedIn(false);
  };

  const pages = {
    Dashboard: <Dashboard />,
    "Send Alert": <SendAlert />,
    Schedule: <SchedulePage />,
    Templates: <TemplatesPage />,
    Staff: <StaffManager />,
    Students: <StudentsPage />,
    Import: <CSVImport />,
    "Audit Log": <AuditLogPage />,
    Statistics: <StatisticsPage />,
  };

  if (!loggedIn) {
    return <LoginScreen onLogin={() => setLoggedIn(true)} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: theme.surface, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <Navbar page={page} setPage={setPage} onLogout={handleLogout} />
      <main style={{ maxWidth: 1200, margin: "0 auto" }} role="main">
        {pages[page]}
      </main>
    </div>
  );
}
