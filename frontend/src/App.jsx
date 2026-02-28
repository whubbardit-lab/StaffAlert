import { useState, useEffect, useCallback } from "react";

const API = "https://staffalert.onrender.com/api";

// ── Design 3 Glass Theme ───────────────────────────────────────────────────
const g = {
  bg: "linear-gradient(135deg, #030712 0%, #0A1628 40%, #0D0A2E 70%, #060D1F 100%)",
  surface: "rgba(255,255,255,0.05)",
  surfaceHover: "rgba(255,255,255,0.08)",
  border: "rgba(255,255,255,0.1)",
  borderActive: "rgba(59,130,246,0.4)",
  blue: "#2563EB",
  gold: "#F59E0B",
  green: "#10B981",
  red: "#EF4444",
  purple: "#7C3AED",
  text: "#FFFFFF",
  muted: "rgba(255,255,255,0.5)",
  dim: "rgba(255,255,255,0.25)",
};

const glassCard = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 16,
  backdropFilter: "blur(12px)",
  overflow: "hidden",
};

const glassInput = {
  width: "100%",
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 9,
  padding: "10px 13px",
  color: "white",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};

// ── Utilities ──────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const diff = Math.floor((Date.now() - date) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}

function Badge({ label }) {
  const styles = {
    EMERGENCY: { bg: "rgba(239,68,68,0.2)", color: "#FCA5A5", border: "rgba(239,68,68,0.3)" },
    URGENT:    { bg: "rgba(245,158,11,0.2)", color: "#FCD34D", border: "rgba(245,158,11,0.3)" },
    NORMAL:    { bg: "rgba(59,130,246,0.2)", color: "#93C5FD", border: "rgba(59,130,246,0.3)" },
    SENT:      { bg: "rgba(16,185,129,0.2)", color: "#6EE7B7", border: "rgba(16,185,129,0.3)" },
    PARTIAL:   { bg: "rgba(245,158,11,0.2)", color: "#FCD34D", border: "rgba(245,158,11,0.3)" },
    FAILED:    { bg: "rgba(239,68,68,0.2)", color: "#FCA5A5", border: "rgba(239,68,68,0.3)" },
    PENDING:   { bg: "rgba(59,130,246,0.2)", color: "#93C5FD", border: "rgba(59,130,246,0.3)" },
    CANCELLED: { bg: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", border: "rgba(255,255,255,0.1)" },
    active:    { bg: "rgba(16,185,129,0.2)", color: "#6EE7B7", border: "rgba(16,185,129,0.3)" },
    inactive:  { bg: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", border: "rgba(255,255,255,0.1)" },
  };
  const s = styles[label] || { bg: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", border: "rgba(255,255,255,0.15)" };
  return (
    <span style={{
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
      padding: "2px 9px", borderRadius: 5,
      fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
      fontFamily: "monospace"
    }}>{label}</span>
  );
}

// ── Toast ──────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const color = type === "error" ? g.red : g.green;
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      background: "rgba(15,20,35,0.95)", border: `1px solid ${color}40`,
      borderRadius: 12, padding: "13px 18px", backdropFilter: "blur(20px)",
      display: "flex", alignItems: "center", gap: 10,
      boxShadow: `0 0 24px ${color}30`,
      animation: "slideIn 0.2s ease",
      maxWidth: 360,
    }}>
      <span style={{ fontSize: 16 }}>{type === "error" ? "⚠" : "✓"}</span>
      <span style={{ fontSize: 13, color: "white" }}>{message}</span>
      <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: g.muted, cursor: "pointer", fontSize: 16 }}>×</button>
    </div>
  );
}

// ── Sidebar Nav ────────────────────────────────────────────────────────────
function Sidebar({ page, setPage, onLogout }) {
  const groups = [
    { label: "Overview", items: [{ label: "Dashboard", page: "Dashboard", icon: "⬡" }] },
    { label: "Alerts", items: [
      { label: "Send Alert", page: "Send Alert", icon: "↗" },
      { label: "Schedule", page: "Schedule", icon: "◷" },
      { label: "Templates", page: "Templates", icon: "▤" },
    ]},
    { label: "People", items: [
      { label: "Staff", page: "Staff", icon: "◈" },
      { label: "Sections", page: "Sections", icon: "📚" },
      { label: "Students", page: "Students", icon: "◉" },
      { label: "Import", page: "Import", icon: "⬆" },
    ]},
    { label: "Admin", items: [
      { label: "Statistics", page: "Statistics", icon: "◎" },
      { label: "Audit Log", page: "Audit Log", icon: "▦" },
    ]},
  ];

  return (
    <aside style={{
      background: "rgba(255,255,255,0.03)",
      borderRight: "1px solid rgba(255,255,255,0.08)",
      backdropFilter: "blur(20px)",
      display: "flex", flexDirection: "column",
      position: "sticky", top: 0, height: "100vh",
      width: 240,
    }}>
      {/* Logo */}
      <div style={{ padding: "26px 20px 22px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ fontSize: 21, fontWeight: 900, letterSpacing: "-0.03em", color: "white" }}>
          PAWS<span style={{ color: g.gold }}> Alert</span>
        </div>
        <div style={{ fontFamily: "monospace", fontSize: 9, color: g.muted, marginTop: 3, letterSpacing: "0.12em" }}>
          PELLISSIPPI STATE · ENS v2.0
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 99, padding: "3px 9px", marginTop: 10 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: g.green, display: "inline-block", boxShadow: `0 0 6px ${g.green}` }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: g.green, letterSpacing: "0.05em" }}>SYSTEM ONLINE</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: "14px 12px", flex: 1, overflowY: "auto" }}>
        {groups.map(group => (
          <div key={group.label} style={{ marginBottom: 18 }}>
            <div style={{ fontFamily: "monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: g.dim, padding: "0 8px", marginBottom: 5 }}>
              {group.label}
            </div>
            {group.items.map(item => (
              <button key={item.page} onClick={() => setPage(item.page)} style={{
                display: "flex", alignItems: "center", gap: 9,
                width: "100%", padding: "9px 10px",
                borderRadius: 9, cursor: "pointer",
                fontSize: 13.5, fontWeight: page === item.page ? 600 : 400,
                color: page === item.page ? "white" : g.muted,
                background: page === item.page ? "linear-gradient(135deg, rgba(37,99,235,0.25), rgba(124,58,237,0.15))" : "transparent",
                border: page === item.page ? "1px solid rgba(37,99,235,0.3)" : "1px solid transparent",
                marginBottom: 2, transition: "all 0.12s", textAlign: "left",
                fontFamily: "inherit",
              }}
                onMouseEnter={e => { if (page !== item.page) { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "white"; } }}
                onMouseLeave={e => { if (page !== item.page) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = g.muted; } }}
              >
                <span style={{ fontSize: 13, width: 18, textAlign: "center" }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: 14, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 11, padding: "11px 13px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #2563EB, #7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "white", flexShrink: 0 }}>PA</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "white" }}>pscc_admin</div>
            <div style={{ fontSize: 10, color: g.muted }}>Administrator</div>
          </div>
          <button onClick={onLogout} style={{ background: "none", border: "none", color: g.muted, cursor: "pointer", fontSize: 16 }} title="Sign out">↩</button>
        </div>
      </div>
    </aside>
  );
}

// ── Page Shell ─────────────────────────────────────────────────────────────
function PageShell({ title, subtitle, actions, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <div style={{ padding: "0 28px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.07)", position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(20px)" }}>
        <div>
          <div style={{ fontFamily: "monospace", fontSize: 9, color: g.muted, letterSpacing: "0.12em", marginBottom: 2 }}>PAWS ALERT / {title.toUpperCase()}</div>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.02em", color: "white" }}>{subtitle || title}</div>
        </div>
        {actions && <div style={{ display: "flex", gap: 10 }}>{actions}</div>}
      </div>
      <div style={{ padding: "24px 28px", flex: 1 }}>{children}</div>
    </div>
  );
}

function GlassBtn({ onClick, children, primary, danger }) {
  const bg = primary ? "linear-gradient(135deg, #2563EB, #7C3AED)" : danger ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.07)";
  const border = primary ? "none" : danger ? "1px solid rgba(239,68,68,0.25)" : "1px solid rgba(255,255,255,0.12)";
  const color = primary ? "white" : danger ? "#FCA5A5" : "rgba(255,255,255,0.7)";
  return (
    <button onClick={onClick} style={{ background: bg, border, color, padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: primary ? "0 0 20px rgba(37,99,235,0.3)" : "none" }}>
      {children}
    </button>
  );
}

function GlassCard({ children, style = {} }) {
  return <div style={{ ...glassCard, ...style }}>{children}</div>;
}

function CardHead({ title, right }) {
  return (
    <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>{title}</span>
      {right && <span style={{ fontSize: 11, color: g.muted }}>{right}</span>}
    </div>
  );
}

function GlassInput({ value, onChange, placeholder, type = "text" }) {
  return <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={{ ...glassInput }} />;
}

function GlassSelect({ value, onChange, children }) {
  return (
    <select value={value} onChange={onChange} style={{ ...glassInput }}>
      {children}
    </select>
  );
}

function GlassTextarea({ value, onChange, placeholder, rows = 3 }) {
  return <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} style={{ ...glassInput, resize: "vertical" }} />;
}

function FieldLabel({ children }) {
  return <label style={{ display: "block", fontFamily: "monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: g.muted, marginBottom: 5 }}>{children}</label>;
}

// ── Dashboard ──────────────────────────────────────────────────────────────
function Dashboard({ setPage }) {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({});
  const [scheduled, setScheduled] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [receipts, setReceipts] = useState(null);
  const [receiptsLoading, setReceiptsLoading] = useState(false);

  // Quick Send state
  const [qSection, setQSection] = useState("00000");
  const [qPriority, setQPriority] = useState("NORMAL");
  const [qMessage, setQMessage] = useState("");
  const [qSending, setQSending] = useState(false);
  const [qResult, setQResult] = useState(null);

  const fetchReceipts = async (alertId) => {
    setSelectedAlert(alertId);
    setReceiptsLoading(true);
    setReceipts(null);
    try { setReceipts(await (await fetch(`${API}/receipts/${alertId}`)).json()); }
    catch { setReceipts({ error: "Could not load receipts" }); }
    finally { setReceiptsLoading(false); }
  };

  const fetchData = useCallback(async () => {
    try {
      const [l, s, sc, sec] = await Promise.all([
        fetch(`${API}/logs/`),
        fetch(`${API}/logs/stats`),
        fetch(`${API}/scheduled/`),
        fetch(`${API}/alerts/sections-list`),
      ]);
      setLogs(await l.json());
      setStats(await s.json());
      setScheduled(await sc.json());
      setSections(await sec.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 15000); return () => clearInterval(i); }, [fetchData]);

  const handleQuickSend = async () => {
    if (!qMessage.trim()) { setQResult({ error: "Message cannot be empty" }); return; }
    if (qMessage.length > 160) { setQResult({ error: "Message exceeds 160 characters" }); return; }
    setQSending(true); setQResult(null);
    try {
      const res = await fetch(`${API}/alerts/send`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ section_code: qSection, priority_level: qPriority, message: qMessage }) });
      const data = await res.json();
      if (!res.ok) setQResult({ error: data.detail || "Failed to send" });
      else { setQResult({ success: `✓ Sent to ${data.recipient_count} recipients` }); setQMessage(""); fetchData(); }
    } catch { setQResult({ error: "Could not reach backend" }); }
    finally { setQSending(false); }
  };

  const handleCancelScheduled = async (id) => {
    await fetch(`${API}/scheduled/${id}`, { method: "DELETE" });
    fetchData();
  };

  const prioColors = { NORMAL: "#93C5FD", URGENT: "#FCD34D", EMERGENCY: "#FCA5A5" };
  const pendingScheduled = scheduled.filter(a => a.status === "PENDING");

  // Delivery stats calculation
  const totalSms = stats.total_sms_sent ?? 0;
  const successRate = stats.successful_alerts && stats.total_alerts ? Math.round((stats.successful_alerts / stats.total_alerts) * 100) : 0;
  const failedCount = stats.partial_alerts ?? 0;

  const thCell = { fontFamily: "monospace", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: g.dim, padding: "10px 18px", textAlign: "left" };
  const tdBase = { padding: "11px 18px" };

  return (
    <PageShell title="Dashboard" subtitle="Command Center" actions={<>
      <GlassBtn onClick={fetchData}>↻ Refresh</GlassBtn>
      <a href={`${API}/logs/export/alerts`} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)", padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>⬇ Export</a>
      <GlassBtn primary onClick={() => setPage("Send Alert")}>⚡ Send Alert</GlassBtn>
    </>}>

      {/* ── Row 1: Stat Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
        {[
          { icon: "📡", label: "Total Alerts", value: stats.total_alerts ?? "—", chip: `${stats.total_alerts ?? 0} total`, chipColor: "#93C5FD" },
          { icon: "📱", label: "SMS Delivered", value: stats.total_sms_sent ?? "—", chip: `${stats.total_sms_sent ?? 0} msgs`, chipColor: "#6EE7B7" },
          { icon: "🎓", label: "Active Students", value: stats.active_students ?? "—", chip: "enrolled", chipColor: "#6EE7B7" },
          { icon: "📚", label: "Sections", value: stats.total_sections ?? "—", chip: "active", chipColor: "#FCD34D" },
        ].map(s => (
          <div key={s.label} style={{ ...glassCard, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <span style={{ fontSize: 20 }}>{s.icon}</span>
              <span style={{ fontFamily: "monospace", fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "rgba(255,255,255,0.08)", color: s.chipColor }}>{s.chip}</span>
            </div>
            <div style={{ fontSize: 34, fontWeight: 900, color: "white", letterSpacing: "-0.05em", lineHeight: 1 }}>{loading ? "—" : s.value}</div>
            <div style={{ fontSize: 12, color: g.muted, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Row 2: Recent Alerts + Quick Send ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 14, marginBottom: 14 }}>

        {/* Recent Alerts */}
        <GlassCard>
          <CardHead title="Recent Alerts" right="Click row for delivery receipts" />
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: g.muted }}>Loading...</div>
          ) : logs.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: g.muted }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📡</div>
              <div style={{ fontWeight: 600 }}>No alerts sent yet</div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["Time", "Section", "Priority", "Message", "Sent", "Status"].map(h => <th key={h} style={thCell}>{h}</th>)}</tr></thead>
              <tbody>
                {logs.slice(0, 6).map(log => (
                  <tr key={log.id} onClick={() => fetchReceipts(log.id)}
                    style={{ borderTop: "1px solid rgba(255,255,255,0.05)", cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ ...tdBase, fontSize: 11, color: g.muted, fontFamily: "monospace", whiteSpace: "nowrap" }}>{timeAgo(log.timestamp)}</td>
                    <td style={{ ...tdBase, fontSize: 13, fontWeight: 700, color: "white" }}>{log.section_code}</td>
                    <td style={tdBase}><Badge label={log.priority_level} /></td>
                    <td style={{ ...tdBase, fontSize: 12, color: g.muted, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.message_content}</td>
                    <td style={{ ...tdBase, fontSize: 13, fontWeight: 700, color: "#93C5FD" }}>{log.recipient_count}</td>
                    <td style={tdBase}><Badge label={log.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </GlassCard>

        {/* Quick Send */}
        <GlassCard>
          <CardHead title="Quick Send" />
          <div style={{ padding: 18 }}>
            <div style={{ marginBottom: 13 }}>
              <FieldLabel>Send To</FieldLabel>
              <GlassSelect value={qSection} onChange={e => setQSection(e.target.value)}>
                {sections.map(s => <option key={s.code} value={s.code} style={{ background: "#1a1a2e" }}>{s.name}</option>)}
              </GlassSelect>
            </div>
            <div style={{ marginBottom: 13 }}>
              <FieldLabel>Priority</FieldLabel>
              <div style={{ display: "flex", gap: 6 }}>
                {["NORMAL", "URGENT", "EMERGENCY"].map(p => (
                  <button key={p} onClick={() => setQPriority(p)} style={{
                    flex: 1, padding: "8px 4px", borderRadius: 7, cursor: "pointer",
                    fontSize: 10, fontWeight: 700, fontFamily: "inherit",
                    border: `1px solid ${qPriority === p ? prioColors[p] + "80" : "rgba(255,255,255,0.1)"}`,
                    background: qPriority === p ? prioColors[p] + "20" : "rgba(255,255,255,0.04)",
                    color: qPriority === p ? prioColors[p] : g.muted,
                  }}>{p === "EMERGENCY" ? "🚨 SOS" : p}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <FieldLabel>Message <span style={{ float: "right", color: qMessage.length > 140 ? "#FCA5A5" : g.muted }}>{qMessage.length}/160</span></FieldLabel>
              <textarea value={qMessage} onChange={e => setQMessage(e.target.value)} placeholder="Type your message..." rows={3} style={{ ...glassInput, resize: "vertical" }} />
            </div>
            {qResult?.error && <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 7, padding: "8px 12px", fontSize: 12, color: "#FCA5A5", marginBottom: 10 }}>⚠ {qResult.error}</div>}
            {qResult?.success && <div style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 7, padding: "8px 12px", fontSize: 12, color: "#6EE7B7", marginBottom: 10 }}>{qResult.success}</div>}
            <button onClick={handleQuickSend} disabled={qSending} style={{
              width: "100%", background: qPriority === "EMERGENCY" ? "linear-gradient(135deg,#DC2626,#991B1B)" : "linear-gradient(135deg,#2563EB,#7C3AED)",
              border: "none", color: "white", borderRadius: 9, padding: 11, fontSize: 13,
              fontWeight: 700, cursor: qSending ? "not-allowed" : "pointer", fontFamily: "inherit",
              boxShadow: "0 0 20px rgba(37,99,235,0.25)", opacity: qSending ? 0.7 : 1
            }}>{qSending ? "Sending..." : "⚡ Broadcast Now"}</button>
          </div>
        </GlassCard>
      </div>

      {/* ── Row 3: Scheduled Alerts + Delivery Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

        {/* Scheduled Alerts */}
        <GlassCard>
          <CardHead title="Scheduled Alerts" right={<span onClick={() => setPage("Schedule")} style={{ cursor: "pointer", color: "#93C5FD", fontSize: 12 }}>+ Schedule new</span>} />
          {pendingScheduled.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: g.muted, fontSize: 13 }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>🕐</div>
              No scheduled alerts — <span onClick={() => setPage("Schedule")} style={{ color: "#93C5FD", cursor: "pointer" }}>create one</span>
            </div>
          ) : pendingScheduled.slice(0, 3).map(a => {
            const dt = new Date(a.scheduled_for);
            const day = dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
            const time = dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
            return (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 18px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ background: "rgba(37,99,235,0.15)", border: "1px solid rgba(37,99,235,0.25)", borderRadius: 8, padding: "6px 10px", textAlign: "center", minWidth: 52, flexShrink: 0 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "#93C5FD", textTransform: "uppercase", letterSpacing: "0.06em" }}>{day.split(" ")[0]}</div>
                  <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "white" }}>{time}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "white", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, color: "#93C5FD" }}>{a.section_code}</span> — {a.message.length > 40 ? a.message.slice(0, 40) + "..." : a.message}
                    <Badge label={a.priority_level} />
                  </div>
                  <div style={{ fontSize: 11, color: g.muted, marginTop: 2 }}>{day} · {a.recipient_count || "?"} recipients</div>
                </div>
                <button onClick={() => handleCancelScheduled(a.id)} style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)", color: "#FCA5A5", padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: "inherit", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>Cancel</button>
              </div>
            );
          })}
        </GlassCard>

        {/* Delivery Stats */}
        <GlassCard>
          <CardHead title="Delivery Stats" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "16px 18px" }}>
            {[
              { label: "Success Rate", value: `${successRate}%`, color: "#6EE7B7" },
              { label: "Failed", value: failedCount, color: "#FCA5A5" },
              { label: "This Week", value: stats.total_alerts ?? 0, color: "#93C5FD" },
              { label: "Total SMS", value: totalSms, color: "#FCD34D" },
            ].map(s => (
              <div key={s.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "13px 14px" }}>
                <div style={{ fontSize: 26, fontWeight: 900, color: s.color, letterSpacing: "-0.04em" }}>{s.value}</div>
                <div style={{ fontSize: 11, color: g.muted, marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: "0 18px 16px" }}>
            {[
              { label: "Delivered", value: stats.total_sms_sent ?? 0, total: Math.max(stats.total_sms_sent ?? 0, 1), color: g.green },
              { label: "Failed", value: failedCount, total: Math.max(stats.total_sms_sent ?? 1, 1), color: g.red },
              { label: "Pending", value: pendingScheduled.length, total: Math.max(pendingScheduled.length || 1, 1), color: g.gold },
            ].map(r => {
              const pct = Math.min(100, Math.round((r.value / r.total) * 100));
              return (
                <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: g.muted, width: 70 }}>{r.label}</span>
                  <div style={{ flex: 1, height: 6, borderRadius: 99, background: "rgba(255,255,255,0.08)" }}>
                    <div style={{ height: 6, borderRadius: 99, background: r.color, width: `${pct}%`, transition: "width 0.5s ease" }} />
                  </div>
                  <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: r.color, width: 40, textAlign: "right" }}>{r.value}</span>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* Receipt Modal */}
      {selectedAlert && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24, backdropFilter: "blur(8px)" }} onClick={() => setSelectedAlert(null)}>
          <div style={{ ...glassCard, width: "100%", maxWidth: 560, maxHeight: "80vh", overflow: "auto", padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "white", margin: 0 }}>Delivery Receipts</h2>
              <GlassBtn onClick={() => setSelectedAlert(null)}>✕ Close</GlassBtn>
            </div>
            {receiptsLoading && <p style={{ color: g.muted }}>Loading...</p>}
            {receipts && !receiptsLoading && (
              <>
                <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: 12, marginBottom: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
                  <p style={{ margin: "0 0 4px", fontSize: 13, color: "white" }}><strong>Message:</strong> {receipts.message}</p>
                  <p style={{ margin: 0, fontSize: 12, color: g.muted }}>Section: {receipts.section} · {receipts.timestamp}</p>
                </div>
                <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                  {[{ label: "Total", value: receipts.total, color: "#93C5FD" }, { label: "Delivered", value: receipts.sent_count, color: "#6EE7B7" }, { label: "Failed", value: receipts.failed_count, color: "#FCA5A5" }].map(s => (
                    <div key={s.label} style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: 12, textAlign: "center", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: 11, color: g.muted }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {receipts.receipts?.length > 0 ? (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead><tr>{["Phone", "Status", "Error"].map(h => <th key={h} style={{ fontFamily: "monospace", fontSize: 9, color: g.dim, padding: "8px 10px", textAlign: "left", letterSpacing: "0.1em", textTransform: "uppercase" }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {receipts.receipts.map((r, i) => (
                        <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                          <td style={{ padding: "8px 10px", fontFamily: "monospace", color: "white" }}>{r.phone}</td>
                          <td style={{ padding: "8px 10px" }}><Badge label={r.status === "sent" ? "SENT" : "FAILED"} /></td>
                          <td style={{ padding: "8px 10px", color: "#FCA5A5", fontSize: 11 }}>{r.error || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p style={{ color: g.muted, fontSize: 13 }}>No individual receipts recorded for this alert.</p>}
              </>
            )}
          </div>
        </div>
      )}
    </PageShell>
  );
}

// ── Send Alert ─────────────────────────────────────────────────────────────
function SendAlert({ toast, setPage }) {
  const [sections, setSections] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [section, setSection] = useState("00000");
  const [priority, setPriority] = useState("NORMAL");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  useEffect(() => {
    fetch(`${API}/alerts/sections-list`).then(r => r.json()).then(setSections).catch(() => {});
    fetch(`${API}/logs/`).then(r => r.json()).then(d => setRecentLogs(d.slice(0, 3))).catch(() => {});
    fetch(`${API}/alerts/templates`).then(r => r.json()).then(setTemplates).catch(() => {});
  }, []);

  const handleSend = async () => {
    if (!message.trim()) { toast("Message cannot be empty", "error"); return; }
    if (message.length > 160) { toast("Message exceeds 160 characters", "error"); return; }
    setSending(true);
    try {
      const res = await fetch(`${API}/alerts/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section_code: section, priority_level: priority, message })
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.detail || "Failed to send", "error");
      } else {
        toast(`✓ Sent to ${data.recipient_count} recipients`, "success");
        setSentSuccess(true);
        setMessage("");
        setTimeout(() => setSentSuccess(false), 3000);
        fetch(`${API}/logs/`).then(r => r.json()).then(d => setRecentLogs(d.slice(0, 3))).catch(() => {});
      }
    } catch { toast("Could not reach backend", "error"); }
    finally { setSending(false); }
  };

  // Derived values
  const selectedSection = sections.find(s => s.code === section);
  const recipientCount = selectedSection?.count ?? 0;
  const charPct = Math.min(100, (message.length / 160) * 100);
  const prefix = priority === "EMERGENCY" ? "[EMERGENCY] " : priority === "URGENT" ? "[URGENT] " : "[CAMPUS] ";
  const fullMsg = prefix + (message || "");
  const segments = Math.ceil(Math.max(fullMsg.length, 1) / 160);
  const estCost = (recipientCount * segments * 0.0079).toFixed(2);

  const prioConfig = {
    NORMAL:    { color: "#93C5FD", border: "rgba(37,99,235,0.5)",   bg: "rgba(37,99,235,0.15)",  icon: "📢", desc: "Routine update",   btnBg: "linear-gradient(135deg,#2563EB,#7C3AED)", glow: "rgba(37,99,235,0.3)" },
    URGENT:    { color: "#FCD34D", border: "rgba(245,158,11,0.5)",  bg: "rgba(245,158,11,0.12)", icon: "⚠️", desc: "Time-sensitive",   btnBg: "linear-gradient(135deg,#D97706,#B45309)", glow: "rgba(245,158,11,0.25)" },
    EMERGENCY: { color: "#FCA5A5", border: "rgba(239,68,68,0.5)",   bg: "rgba(239,68,68,0.15)",  icon: "🚨", desc: "Safety critical",  btnBg: "linear-gradient(135deg,#EF4444,#991B1B)", glow: "rgba(239,68,68,0.45)" },
  };
  const pc = prioConfig[priority];

  const sectionDotColors = ["#93C5FD","#6EE7B7","#FCD34D","#C4B5FD","#F9A8D4","#6EE7B7","#FCD34D","#93C5FD"];

  const builtinTemplates = [
    { label: "📭 Class Cancelled", msg: "Class cancelled today. Check your email for updates." },
    { label: "🌧 Campus Closure",  msg: "Campus is closed today due to inclement weather. Stay safe." },
    { label: "🚪 Room Change",     msg: "Room change: your class has moved. Check with your instructor." },
    { label: "🚨 Emergency",       msg: "EMERGENCY: Follow all instructions from campus safety personnel immediately." },
  ];
  const allTemplates = [...builtinTemplates, ...templates.map(t => ({ label: `▤ ${t.name}`, msg: t.message }))];

  const fieldLabel = {
    fontFamily: "monospace", fontSize: 10, fontWeight: 700,
    letterSpacing: "0.1em", textTransform: "uppercase",
    color: g.muted, marginBottom: 8, display: "flex",
    alignItems: "center", justifyContent: "space-between",
  };

  return (
    <PageShell
      title="Send Alert"
      subtitle="Send Alert"
      actions={
        <>
          <GlassBtn onClick={() => setPage("Schedule")}>◷ Schedule Instead</GlassBtn>
          <GlassBtn onClick={() => setPage("Templates")}>▤ Templates</GlassBtn>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 16 }}>

        {/* ── LEFT: COMPOSE ── */}
        <div>
          <GlassCard>
            <CardHead title="Compose Alert" right="SMS · Max 160 characters" />
            <div style={{ padding: 22 }}>

              {/* Info notice */}
              <div style={{ display: "flex", gap: 10, background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.18)", borderRadius: 10, padding: "12px 14px", marginBottom: 22 }}>
                <span style={{ fontSize: 15, flexShrink: 0 }}>⚡</span>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, margin: 0 }}>
                  Messages are sent instantly via SMS. Students do <strong style={{ color: "#FCD34D" }}>not</strong> need an app — they receive a standard text message directly to their phone.
                </p>
              </div>

              {/* Section picker */}
              <div style={{ marginBottom: 20 }}>
                <div style={fieldLabel}>
                  Send To
                  <span style={{ color: g.dim, fontWeight: 400, fontSize: 9 }}>Select one section or broadcast to all</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                  {sections.map((s, i) => {
                    const isAll = s.code === "00000";
                    const sel = section === s.code;
                    return (
                      <button
                        key={s.code}
                        onClick={() => setSection(s.code)}
                        style={{
                          gridColumn: isAll ? "1 / -1" : "auto",
                          padding: "10px 12px", borderRadius: 9, cursor: "pointer",
                          fontFamily: "inherit", textAlign: "center",
                          border: sel ? `1px solid ${isAll ? "rgba(37,99,235,0.6)" : "rgba(37,99,235,0.45)"}` : "1px solid rgba(255,255,255,0.1)",
                          background: sel ? (isAll ? "rgba(37,99,235,0.2)" : "rgba(37,99,235,0.13)") : "rgba(255,255,255,0.04)",
                          color: sel ? "#93C5FD" : g.muted,
                          transition: "all 0.12s",
                        }}
                        onMouseEnter={e => { if (!sel) { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "white"; }}}
                        onMouseLeave={e => { if (!sel) { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = g.muted; }}}
                      >
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{isAll ? "🌐 " : ""}{s.name}</div>
                        <div style={{ fontSize: 10, color: sel ? "rgba(147,197,253,0.6)" : g.dim, marginTop: 2 }}>
                          {s.count != null ? `${s.count} student${s.count !== 1 ? "s" : ""}` : ""}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Priority */}
              <div style={{ marginBottom: 20 }}>
                <div style={fieldLabel}>
                  Priority Level
                  <span style={{ color: g.dim, fontWeight: 400, fontSize: 9 }}>Affects message prefix sent to students</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {Object.entries(prioConfig).map(([val, cfg]) => {
                    const sel = priority === val;
                    return (
                      <button
                        key={val}
                        onClick={() => setPriority(val)}
                        style={{
                          padding: "13px 8px", borderRadius: 10, cursor: "pointer",
                          fontFamily: "inherit", textAlign: "center",
                          border: sel ? `1px solid ${cfg.border}` : "1px solid rgba(255,255,255,0.1)",
                          background: sel ? cfg.bg : "rgba(255,255,255,0.04)",
                          color: sel ? cfg.color : g.muted,
                          boxShadow: sel && val === "EMERGENCY" ? "0 0 24px rgba(239,68,68,0.2)" : "none",
                          transition: "all 0.15s",
                        }}
                      >
                        <span style={{ fontSize: 20, display: "block", marginBottom: 5 }}>{cfg.icon}</span>
                        <span style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em" }}>{val}</span>
                        <span style={{ display: "block", fontSize: 9, marginTop: 3, opacity: 0.55 }}>{cfg.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick templates */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ ...fieldLabel, marginBottom: 8 }}>Quick Templates</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {allTemplates.map((t, i) => (
                    <button
                      key={i}
                      onClick={() => setMessage(t.msg)}
                      style={{
                        padding: "5px 11px", borderRadius: 6, cursor: "pointer",
                        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                        color: g.muted, fontSize: 11, fontWeight: 600, fontFamily: "inherit",
                        transition: "all 0.12s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.09)"; e.currentTarget.style.color = "white"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = g.muted; }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message textarea */}
              <div style={{ marginBottom: 20 }}>
                <div style={fieldLabel}>
                  Message
                  <span style={{ color: message.length > 140 ? "#FCA5A5" : g.dim, fontWeight: 400, fontSize: 9 }}>{message.length} / 160 characters</span>
                </div>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Type your alert message here..."
                  rows={4}
                  maxLength={160}
                  style={{
                    ...glassInput, resize: "vertical", minHeight: 110,
                    fontSize: 14, lineHeight: 1.6,
                    border: `1px solid ${message.length > 140 ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.12)"}`,
                  }}
                />
                {/* Char progress bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7 }}>
                  <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 99 }}>
                    <div style={{
                      height: 3, borderRadius: 99, transition: "width 0.2s, background 0.2s",
                      width: `${charPct}%`,
                      background: message.length > 140 ? "linear-gradient(90deg,#EF4444,#DC2626)" : "linear-gradient(90deg,#2563EB,#7C3AED)",
                    }} />
                  </div>
                  <span style={{ fontFamily: "monospace", fontSize: 10, color: message.length > 140 ? "#FCA5A5" : g.muted }}>{message.length}/160</span>
                </div>
              </div>

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={sending || message.length > 160 || !message.trim()}
                style={{
                  width: "100%", padding: "14px", borderRadius: 11, border: "none",
                  fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: sending ? "not-allowed" : "pointer",
                  color: "white", transition: "all 0.15s",
                  background: sentSuccess ? "linear-gradient(135deg,#059669,#047857)" : pc.btnBg,
                  boxShadow: `0 0 30px ${pc.glow}`,
                  opacity: (sending || !message.trim()) && !sentSuccess ? 0.6 : 1,
                }}
              >
                {sentSuccess
                  ? "✓ Alert Sent Successfully!"
                  : sending
                  ? "Sending..."
                  : priority === "EMERGENCY"
                  ? `🚨 Send Emergency Broadcast`
                  : priority === "URGENT"
                  ? `⚠️ Send Urgent Alert`
                  : `⚡ Broadcast to ${selectedSection?.name || "All Students"}`
                }
              </button>

            </div>
          </GlassCard>
        </div>

        {/* ── RIGHT: PREVIEW + RECIPIENTS + RECENT ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* SMS Preview */}
          <GlassCard>
            <CardHead title="📱 SMS Preview" right="Live preview" />
            <div style={{ margin: "14px 18px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 16 }}>
              <div style={{ fontFamily: "monospace", fontSize: 9, color: g.muted, letterSpacing: "0.08em", marginBottom: 8 }}>
                FROM: +1 (866) 384-7549 · PAWS Alert
              </div>
              <div style={{ background: "rgba(37,99,235,0.18)", border: "1px solid rgba(37,99,235,0.25)", borderRadius: "12px 12px 12px 3px", padding: "12px 14px", maxWidth: "92%" }}>
                <div style={{ fontSize: 13, color: message ? "white" : g.dim, fontStyle: message ? "normal" : "italic", lineHeight: 1.55, wordBreak: "break-word" }}>
                  {message
                    ? <><span style={{ color: pc.color, fontWeight: 700 }}>{prefix}</span>{message}</>
                    : "Your message will appear here as students receive it..."
                  }
                </div>
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 9, color: g.muted, marginTop: 8 }}>
                {message
                  ? `${prefix.length + message.length} chars · ${segments} segment${segments > 1 ? "s" : ""} · Est. $${estCost}`
                  : "0 characters · 0 segments · Est. cost $0.00"
                }
              </div>
            </div>
          </GlassCard>

          {/* Recipients */}
          <GlassCard>
            <CardHead title="Recipients" right={section === "00000" ? `All ${sections.filter(s => s.code !== "00000").length} sections` : "1 section"} />
            <div style={{ padding: "4px 0 0" }}>
              {sections.filter(s => s.code !== "00000").map((s, i) => {
                const isSelected = section === "00000" || section === s.code;
                return (
                  <div key={s.code} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 18px", borderBottom: "1px solid rgba(255,255,255,0.05)", opacity: isSelected ? 1 : 0.3, transition: "opacity 0.2s" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: sectionDotColors[i % sectionDotColors.length], display: "inline-block", flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "white" }}>{s.code}</div>
                        <div style={{ fontSize: 10, color: g.muted }}>{s.name?.replace(`${s.code} — `, "") || ""}</div>
                      </div>
                    </div>
                    <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#93C5FD", background: "rgba(37,99,235,0.15)", border: "1px solid rgba(37,99,235,0.2)", padding: "2px 9px", borderRadius: 5 }}>
                      {s.count ?? "—"}
                    </span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", background: "rgba(37,99,235,0.08)", borderTop: "1px solid rgba(37,99,235,0.15)" }}>
              <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: g.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Total Recipients</span>
              <span style={{ fontSize: 22, fontWeight: 900, color: "#93C5FD", letterSpacing: "-0.03em" }}>{recipientCount.toLocaleString()}</span>
            </div>
          </GlassCard>

          {/* Recent Sends */}
          <GlassCard>
            <CardHead title="Recent Sends" right={<span onClick={() => setPage("Dashboard")} style={{ color: "#93C5FD", cursor: "pointer", fontSize: 11 }}>View all →</span>} />
            {recentLogs.length === 0 ? (
              <div style={{ padding: "24px 18px", textAlign: "center", color: g.muted, fontSize: 13 }}>No recent alerts</div>
            ) : recentLogs.map(log => {
              const iconBg = log.priority_level === "EMERGENCY" ? "rgba(239,68,68,0.15)" : log.priority_level === "URGENT" ? "rgba(245,158,11,0.15)" : "rgba(37,99,235,0.15)";
              const icon = log.priority_level === "EMERGENCY" ? "🚨" : log.priority_level === "URGENT" ? "⚠️" : "📢";
              return (
                <div key={log.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 18px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>{icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      [{log.priority_level}] {log.section_code} — {log.message_content}
                    </div>
                    <div style={{ fontFamily: "monospace", fontSize: 9, color: g.muted, marginTop: 2 }}>
                      {timeAgo(log.timestamp)} · {log.recipient_count} recipients · <Badge label={log.status} />
                    </div>
                  </div>
                </div>
              );
            })}
          </GlassCard>

        </div>
      </div>
    </PageShell>
  );
}

// ── Staff Manager ──────────────────────────────────────────────────────────
function StaffManager({ toast }) {
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({ name: "", phone_number: "", system_id: "", pin: "" });
  const [loading, setLoading] = useState(true);

  const fetchStaff = async () => { try { setStaff(await (await fetch(`${API}/staff/`)).json()); } catch {} finally { setLoading(false); } };
  useEffect(() => { fetchStaff(); }, []);

  const handleAdd = async () => {
    if (!form.name || !form.phone_number || !form.system_id || !form.pin) { toast("All fields required", "error"); return; }
    const res = await fetch(`${API}/staff/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { toast("Staff member added", "success"); setForm({ name: "", phone_number: "", system_id: "", pin: "" }); fetchStaff(); }
    else { const d = await res.json(); toast(d.detail || "Failed to add", "error"); }
  };

  const handleToggle = async (id) => { await fetch(`${API}/staff/${id}/toggle`, { method: "PATCH" }); fetchStaff(); };
  const handleDelete = async (id) => { if (!confirm("Delete this staff member?")) return; await fetch(`${API}/staff/${id}`, { method: "DELETE" }); fetchStaff(); };

  const inputStyle = { ...glassInput, marginBottom: 0 };

  return (
    <PageShell title="Staff" subtitle="Staff Management">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 16 }}>
        <GlassCard>
          <CardHead title="Add Staff Member" />
          <div style={{ padding: 20 }}>
            {[["Name", "name", "text"], ["Phone Number", "phone_number", "text"], ["System ID", "system_id", "text"], ["PIN", "pin", "password"]].map(([label, key, type]) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <FieldLabel>{label}</FieldLabel>
                <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={label} style={inputStyle} />
              </div>
            ))}
            <GlassBtn primary onClick={handleAdd}>+ Add Staff Member</GlassBtn>
          </div>
        </GlassCard>

        <GlassCard>
          <CardHead title="Staff Roster" right={`${staff.length} members`} />
          {loading ? <div style={{ padding: 40, textAlign: "center", color: g.muted }}>Loading...</div> : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["Name", "Phone", "System ID", "Status", "Actions"].map(h => <th key={h} style={{ fontFamily: "monospace", fontSize: 9, color: g.dim, padding: "10px 16px", textAlign: "left", letterSpacing: "0.1em", textTransform: "uppercase" }}>{h}</th>)}</tr></thead>
              <tbody>
                {staff.map(s => (
                  <tr key={s.id} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "11px 16px", fontWeight: 600, color: "white" }}>{s.name}</td>
                    <td style={{ padding: "11px 16px", fontSize: 12, color: g.muted, fontFamily: "monospace" }}>{s.phone_number}</td>
                    <td style={{ padding: "11px 16px", fontSize: 12, fontFamily: "monospace", color: "#93C5FD" }}>{s.system_id}</td>
                    <td style={{ padding: "11px 16px" }}><Badge label={s.is_active ? "active" : "inactive"} /></td>
                    <td style={{ padding: "11px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => handleToggle(s.id)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: g.muted, padding: "4px 10px", borderRadius: 5, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit" }}>{s.is_active ? "Deactivate" : "Activate"}</button>
                        <button onClick={() => handleDelete(s.id)} style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)", color: "#FCA5A5", padding: "4px 10px", borderRadius: 5, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit" }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </GlassCard>
      </div>
    </PageShell>
  );
}

// ── Students Page ──────────────────────────────────────────────────────────

// ── Sections Manager ───────────────────────────────────────────────────────
function SectionsPage({ toast }) {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ section_code: "", section_name: "" });
  const [saving, setSaving] = useState(false);

  const fetchSections = async () => {
    try { setSections(await (await fetch(`${API}/sections`)).json()); }
    catch {} finally { setLoading(false); }
  };
  useEffect(() => { fetchSections(); }, []);

  const handleAdd = async () => {
    if (!form.section_code || !form.section_name) { toast("Section code and name required", "error"); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API}/sections`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (res.ok) { toast(`Section ${data.section_code} created — join code ${data.join_code} sent to staff`, "success"); setForm({ section_code: "", section_name: "" }); fetchSections(); }
      else toast(data.detail || "Failed to create section", "error");
    } catch { toast("Could not reach backend", "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id, code) => {
    if (!confirm(`Delete section ${code}? This will also remove all student enrollments.`)) return;
    await fetch(`${API}/sections/${id}`, { method: "DELETE" });
    fetchSections();
    toast(`Section ${code} deleted`, "success");
  };

  const handleRegenCode = async (id, code) => {
    if (!confirm(`Regenerate join code for ${code}? The old code will stop working and staff will be texted the new one.`)) return;
    try {
      const res = await fetch(`${API}/sections/${id}/regenerate-code`, { method: "POST" });
      const data = await res.json();
      if (res.ok) { toast(`New code for ${code}: ${data.join_code} — sent to all staff`, "success"); fetchSections(); }
      else toast("Failed to regenerate code", "error");
    } catch { toast("Could not reach backend", "error"); }
  };

  const isExpired = (expiresStr) => expiresStr && new Date(expiresStr) < new Date();

  return (
    <PageShell title="Sections" subtitle="Manage Sections">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 16 }}>

        {/* Add Section */}
        <div>
          <GlassCard>
            <CardHead title="Add New Section" />
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 14 }}>
                <FieldLabel>Section Code *</FieldLabel>
                <GlassInput value={form.section_code} onChange={e => setForm(f => ({ ...f, section_code: e.target.value.toUpperCase() }))} placeholder="e.g. CS101" />
              </div>
              <div style={{ marginBottom: 20 }}>
                <FieldLabel>Section Name *</FieldLabel>
                <GlassInput value={form.section_name} onChange={e => setForm(f => ({ ...f, section_name: e.target.value }))} placeholder="e.g. Intro to Computer Science" />
              </div>
              <GlassBtn primary onClick={handleAdd}>{saving ? "Creating..." : "➕ Create Section"}</GlassBtn>
              <div style={{ marginTop: 14, background: "rgba(37,99,235,0.07)", border: "1px solid rgba(37,99,235,0.18)", borderRadius: 10, padding: "12px 14px" }}>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.6 }}>
                  ⚡ When a section is created, a <strong style={{ color: "#93C5FD" }}>6-character join code</strong> is automatically generated and texted to all registered staff. Students join by texting <strong style={{ color: "#93C5FD" }}>JOIN [CODE] [JOINCODE]</strong>.
                </p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Sections List */}
        <GlassCard>
          <CardHead title={`All Sections (${sections.length})`} right={`${sections.reduce((a,s) => a + (s.student_count || 0), 0)} total students`} />
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: g.muted }}>Loading...</div>
          ) : sections.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: g.muted }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📚</div>
              <div style={{ fontWeight: 600 }}>No sections yet</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Create your first section to get started</div>
            </div>
          ) : (
            <div>
              {sections.map(s => (
                <div key={s.id} style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: "white" }}>{s.section_code}</span>
                      <span style={{ fontSize: 12, color: g.muted }}>{s.section_name}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 5, background: isExpired(s.join_code_expires) ? "rgba(239,68,68,0.15)" : "rgba(37,99,235,0.15)", color: isExpired(s.join_code_expires) ? "#FCA5A5" : "#93C5FD", border: `1px solid ${isExpired(s.join_code_expires) ? "rgba(239,68,68,0.25)" : "rgba(37,99,235,0.25)"}` }}>
                        {isExpired(s.join_code_expires) ? "⚠ EXPIRED" : `🔑 ${s.join_code}`}
                      </span>
                      {s.join_code_expires && (
                        <span style={{ fontSize: 10, color: g.dim, fontFamily: "monospace" }}>
                          {isExpired(s.join_code_expires) ? "Code expired" : `exp. ${new Date(s.join_code_expires).toLocaleDateString()}`}
                        </span>
                      )}
                      <span style={{ fontFamily: "monospace", fontSize: 10, color: "#6EE7B7", background: "rgba(16,185,129,0.1)", padding: "1px 7px", borderRadius: 4 }}>
                        {s.student_count ?? 0} students
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => handleRegenCode(s.id, s.section_code)} style={{ background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.25)", color: "#93C5FD", padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: "inherit", fontWeight: 600 }}>🔄 New Code</button>
                    <button onClick={() => handleDelete(s.id, s.section_code)} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#FCA5A5", padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: "inherit", fontWeight: 600 }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </PageShell>
  );
}

function StudentsPage({ toast }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  const fetchStudents = async () => {
    try { setStudents(await (await fetch(`${API}/students?active_only=${!showAll}`)).json()); }
    catch {} finally { setLoading(false); }
  };
  useEffect(() => { fetchStudents(); }, [showAll]);

  const handleDeactivate = async (id) => { await fetch(`${API}/students/${id}/deactivate`, { method: "PATCH" }); fetchStudents(); toast("Student deactivated", "success"); };
  const handleDelete = async (id) => { if (!confirm("Remove this student?")) return; await fetch(`${API}/students/${id}`, { method: "DELETE" }); fetchStudents(); toast("Student removed", "success"); };

  const filtered = students.filter(s => !search || s.student_phone?.includes(search) || s.section?.section_code?.toLowerCase().includes(search.toLowerCase()) || s.student_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <PageShell title="Students" subtitle="Student Roster" actions={
      <div style={{ display: "flex", gap: 8 }}>
        <a href={`${API}/logs/export/students`} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)", padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>⬇ Export CSV</a>
        <GlassBtn onClick={() => setShowAll(a => !a)}>{showAll ? "Active Only" : "Show All"}</GlassBtn>
      </div>
    }>
      <GlassCard>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by phone, name, or section..." style={{ ...glassInput, width: "100%", maxWidth: 400 }} />
        </div>
        {loading ? <div style={{ padding: 40, textAlign: "center", color: g.muted }}>Loading...</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Phone", "Name", "Section", "Graduation", "Status", "Actions"].map(h => <th key={h} style={{ fontFamily: "monospace", fontSize: 9, color: g.dim, padding: "10px 16px", textAlign: "left", letterSpacing: "0.1em", textTransform: "uppercase" }}>{h}</th>)}</tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: g.muted }}>No students found</td></tr>}
              {filtered.map(s => (
                <tr key={s.id} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "11px 16px", fontFamily: "monospace", fontSize: 12, color: "white" }}>{s.student_phone}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13, color: g.muted }}>{s.student_name || "—"}</td>
                  <td style={{ padding: "11px 16px", fontWeight: 700, color: "#93C5FD" }}>{s.section?.section_code}</td>
                  <td style={{ padding: "11px 16px", fontSize: 12, color: g.muted }}>{s.graduation_date ? new Date(s.graduation_date).toLocaleDateString() : "—"}</td>
                  <td style={{ padding: "11px 16px" }}><Badge label={s.is_active ? "active" : "inactive"} /></td>
                  <td style={{ padding: "11px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {s.is_active && <button onClick={() => handleDeactivate(s.id)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: g.muted, padding: "4px 10px", borderRadius: 5, cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>Deactivate</button>}
                      <button onClick={() => handleDelete(s.id)} style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)", color: "#FCA5A5", padding: "4px 10px", borderRadius: 5, cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </GlassCard>
    </PageShell>
  );
}

// ── CSV Import ─────────────────────────────────────────────────────────────
function CSVImport({ toast }) {
  const [tab, setTab] = useState("manual"); // manual | students | staff
  // Manual add
  const [manualForm, setManualForm] = useState({ phone: "", section_code: "", name: "" });
  const [manualSaving, setManualSaving] = useState(false);
  // Student CSV
  const [studentFile, setStudentFile] = useState(null);
  const [studentUploading, setStudentUploading] = useState(false);
  const [studentResult, setStudentResult] = useState(null);
  // Staff CSV
  const [staffFile, setStaffFile] = useState(null);
  const [staffUploading, setStaffUploading] = useState(false);
  const [staffResult, setStaffResult] = useState(null);

  const handleManualAdd = async () => {
    if (!manualForm.phone || !manualForm.section_code) { toast("Phone and section code required", "error"); return; }
    setManualSaving(true);
    try {
      const res = await fetch(`${API}/students/manual`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(manualForm) });
      const data = await res.json();
      if (res.ok) { toast("Student added successfully", "success"); setManualForm({ phone: "", section_code: "", name: "" }); }
      else toast(data.detail || "Failed to add student", "error");
    } catch { toast("Could not reach backend", "error"); }
    finally { setManualSaving(false); }
  };

  const handleStudentUpload = async () => {
    if (!studentFile) { toast("Please select a CSV file", "error"); return; }
    setStudentUploading(true); setStudentResult(null);
    const form = new FormData(); form.append("file", studentFile);
    try {
      const res = await fetch(`${API}/import/csv`, { method: "POST", body: form });
      const data = await res.json();
      if (res.ok) { setStudentResult(data); toast("Students imported", "success"); }
      else toast(data.detail || "Import failed", "error");
    } catch { toast("Could not reach backend", "error"); }
    finally { setStudentUploading(false); }
  };

  const handleStaffUpload = async () => {
    if (!staffFile) { toast("Please select a CSV file", "error"); return; }
    setStaffUploading(true); setStaffResult(null);
    const form = new FormData(); form.append("file", staffFile);
    try {
      const res = await fetch(`${API}/import/staff-csv`, { method: "POST", body: form });
      const data = await res.json();
      if (res.ok) { setStaffResult(data); toast("Staff imported", "success"); }
      else toast(data.detail || "Import failed", "error");
    } catch { toast("Could not reach backend", "error"); }
    finally { setStaffUploading(false); }
  };

  const tabStyle = (t) => ({
    padding: "8px 18px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700,
    fontFamily: "inherit", border: "1px solid",
    background: tab === t ? "rgba(37,99,235,0.2)" : "rgba(255,255,255,0.04)",
    borderColor: tab === t ? "rgba(37,99,235,0.5)" : "rgba(255,255,255,0.1)",
    color: tab === t ? "#93C5FD" : g.muted,
  });

  const ResultCards = ({ result }) => result ? (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        {[{ label: "Imported", value: result.imported, color: "#6EE7B7" }, { label: "Skipped", value: result.skipped, color: "#FCD34D" }, { label: "Errors", value: result.errors?.length || 0, color: "#FCA5A5" }].map(s => (
          <div key={s.label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: 14, textAlign: "center", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: g.muted }}>{s.label}</div>
          </div>
        ))}
      </div>
      {result.errors?.length > 0 && result.errors.map((e, i) => <div key={i} style={{ fontSize: 12, color: "#FCA5A5", marginBottom: 4 }}>⚠ {e}</div>)}
    </div>
  ) : null;

  return (
    <PageShell title="Import" subtitle="Add People">
      <div style={{ maxWidth: 640 }}>
        {/* Tab switcher */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button style={tabStyle("manual")} onClick={() => setTab("manual")}>✏️ Manual Add</button>
          <button style={tabStyle("students")} onClick={() => setTab("students")}>🎓 Student CSV</button>
          <button style={tabStyle("staff")} onClick={() => setTab("staff")}>👤 Staff CSV</button>
        </div>

        {/* Manual Add */}
        {tab === "manual" && (
          <GlassCard>
            <CardHead title="Add Student Manually" right="No CSV needed" />
            <div style={{ padding: 22 }}>
              <div style={{ marginBottom: 14 }}>
                <FieldLabel>Phone Number *</FieldLabel>
                <GlassInput value={manualForm.phone} onChange={e => setManualForm(f => ({ ...f, phone: e.target.value }))} placeholder="+18655551234 or 8655551234" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <FieldLabel>Section Code *</FieldLabel>
                <GlassInput value={manualForm.section_code} onChange={e => setManualForm(f => ({ ...f, section_code: e.target.value.toUpperCase() }))} placeholder="e.g. CS101" />
              </div>
              <div style={{ marginBottom: 20 }}>
                <FieldLabel>Student Name (optional)</FieldLabel>
                <GlassInput value={manualForm.name} onChange={e => setManualForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Doe" />
              </div>
              <GlassBtn primary onClick={handleManualAdd}>{manualSaving ? "Adding..." : "➕ Add Student"}</GlassBtn>
              <p style={{ fontSize: 12, color: g.dim, marginTop: 12, marginBottom: 0 }}>
                💡 Students can also self-enroll by texting <strong style={{ color: "#93C5FD" }}>JOIN [CODE] [JOINCODE]</strong> to your number.
              </p>
            </div>
          </GlassCard>
        )}

        {/* Student CSV */}
        {tab === "students" && (
          <GlassCard>
            <CardHead title="Import Students via CSV" />
            <div style={{ padding: 22 }}>
              <div style={{ border: "2px dashed rgba(37,99,235,0.3)", borderRadius: 12, padding: 28, textAlign: "center", marginBottom: 16, background: "rgba(37,99,235,0.04)" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
                <div style={{ fontSize: 14, color: g.muted, marginBottom: 12 }}>Select your student CSV file</div>
                <input type="file" accept=".csv" onChange={e => setStudentFile(e.target.files[0])} style={{ color: g.muted, fontSize: 13 }} />
              </div>
              {studentFile && <div style={{ background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#93C5FD" }}>📄 {studentFile.name}</div>}
              <GlassBtn primary onClick={handleStudentUpload}>{studentUploading ? "Uploading..." : "⬆ Import Students"}</GlassBtn>
              <ResultCards result={studentResult} />
              <div style={{ background: "rgba(0,0,0,0.25)", borderRadius: 8, padding: 14, fontFamily: "monospace", fontSize: 12, color: "#93C5FD", marginTop: 16 }}>
                Phone,SectionCode,Name,GraduationDate<br />
                +18655551234,CS101,,2026-12-31<br />
                +18655555678,MATH201,Jane Doe,2027-05-15
              </div>
            </div>
          </GlassCard>
        )}

        {/* Staff CSV */}
        {tab === "staff" && (
          <GlassCard>
            <CardHead title="Import Staff via CSV" />
            <div style={{ padding: 22 }}>
              <div style={{ border: "2px dashed rgba(124,58,237,0.3)", borderRadius: 12, padding: 28, textAlign: "center", marginBottom: 16, background: "rgba(124,58,237,0.04)" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>👤</div>
                <div style={{ fontSize: 14, color: g.muted, marginBottom: 12 }}>Select your staff CSV file</div>
                <input type="file" accept=".csv" onChange={e => setStaffFile(e.target.files[0])} style={{ color: g.muted, fontSize: 13 }} />
              </div>
              {staffFile && <div style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#C4B5FD" }}>📄 {staffFile.name}</div>}
              <GlassBtn primary onClick={handleStaffUpload}>{staffUploading ? "Uploading..." : "⬆ Import Staff"}</GlassBtn>
              <ResultCards result={staffResult} />
              <div style={{ background: "rgba(0,0,0,0.25)", borderRadius: 8, padding: 14, fontFamily: "monospace", fontSize: 12, color: "#C4B5FD", marginTop: 16 }}>
                Name,Phone,SystemID,PIN<br />
                John Smith,+18655551234,jsmith01,1234<br />
                Jane Doe,+18655555678,jdoe02,5678
              </div>
              <p style={{ fontSize: 12, color: g.dim, marginTop: 10, marginBottom: 0 }}>⚠ PINs are hashed immediately — they are never stored in plain text.</p>
            </div>
          </GlassCard>
        )}
      </div>
    </PageShell>
  );
}

// ── Templates ──────────────────────────────────────────────────────────────
function TemplatesPage({ toast }) {
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState({ name: "", message: "", section_code: "", priority_level: "NORMAL" });
  const [saving, setSaving] = useState(false);

  const fetchTemplates = async () => { try { setTemplates(await (await fetch(`${API}/alerts/templates`)).json()); } catch {} };
  useEffect(() => { fetchTemplates(); }, []);

  const handleSave = async () => {
    if (!form.name.trim() || !form.message.trim()) { toast("Name and message required", "error"); return; }
    setSaving(true);
    try {
      await fetch(`${API}/alerts/templates`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setForm({ name: "", message: "", section_code: "", priority_level: "NORMAL" });
      fetchTemplates(); toast("Template saved", "success");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => { if (!confirm("Delete this template?")) return; await fetch(`${API}/alerts/templates/${id}`, { method: "DELETE" }); fetchTemplates(); toast("Template deleted", "success"); };

  const prioColors = { NORMAL: "#93C5FD", URGENT: "#FCD34D", EMERGENCY: "#FCA5A5" };

  return (
    <PageShell title="Templates" subtitle="Alert Templates">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 16 }}>
        <GlassCard>
          <CardHead title="New Template" />
          <div style={{ padding: 20 }}>
            {[["Template Name", "name"], ["Section Code", "section_code"]].map(([label, key]) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <FieldLabel>{label}</FieldLabel>
                <GlassInput value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={label} />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <FieldLabel>Priority</FieldLabel>
              <div style={{ display: "flex", gap: 6 }}>
                {["NORMAL", "URGENT", "EMERGENCY"].map(p => (
                  <button key={p} onClick={() => setForm(f => ({ ...f, priority_level: p }))} style={{ flex: 1, padding: "8px", borderRadius: 7, cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "inherit", border: `1px solid ${form.priority_level === p ? prioColors[p] + "80" : "rgba(255,255,255,0.1)"}`, background: form.priority_level === p ? prioColors[p] + "20" : "rgba(255,255,255,0.04)", color: form.priority_level === p ? prioColors[p] : g.muted }}>{p}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 18 }}>
              <FieldLabel>Message <span style={{ float: "right" }}>{form.message.length}/160</span></FieldLabel>
              <GlassTextarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Template message..." rows={3} />
            </div>
            <GlassBtn primary onClick={handleSave}>{saving ? "Saving..." : "+ Save Template"}</GlassBtn>
          </div>
        </GlassCard>

        <GlassCard>
          <CardHead title="Saved Templates" right={`${templates.length} templates`} />
          {templates.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: g.muted }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
              <div>No templates yet</div>
            </div>
          ) : (
            <div style={{ padding: 12 }}>
              {templates.map(t => (
                <div key={t.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 14, marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "white" }}>{t.name}</span>
                      <Badge label={t.priority_level} />
                    </div>
                    <button onClick={() => handleDelete(t.id)} style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)", color: "#FCA5A5", padding: "3px 9px", borderRadius: 5, cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>Delete</button>
                  </div>
                  <p style={{ fontSize: 13, color: g.muted, margin: 0 }}>{t.message}</p>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </PageShell>
  );
}

// ── Schedule ───────────────────────────────────────────────────────────────
function SchedulePage({ toast }) {
  const [scheduled, setScheduled] = useState([]);
  const [sections, setSections] = useState([]);
  const [form, setForm] = useState({ message: "", section_code: "00000", priority_level: "NORMAL", scheduled_for: "" });
  const [saving, setSaving] = useState(false);

  const fetchScheduled = async () => { try { setScheduled(await (await fetch(`${API}/scheduled/`)).json()); } catch {} };

  useEffect(() => {
    fetchScheduled();
    fetch(`${API}/alerts/sections-list`).then(r => r.json()).then(setSections).catch(() => {});
    const i = setInterval(fetchScheduled, 30000);
    return () => clearInterval(i);
  }, []);

  const handleSchedule = async () => {
    if (!form.message.trim()) { toast("Message required", "error"); return; }
    if (!form.scheduled_for) { toast("Please select date and time", "error"); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API}/scheduled/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, scheduled_for: new Date(form.scheduled_for).toISOString() }) });
      const data = await res.json();
      if (!res.ok) toast(data.detail || "Failed to schedule", "error");
      else { toast(`Scheduled for ${data.scheduled_for}`, "success"); setForm({ message: "", section_code: "00000", priority_level: "NORMAL", scheduled_for: "" }); fetchScheduled(); }
    } catch { toast("Could not reach backend", "error"); }
    finally { setSaving(false); }
  };

  const handleCancel = async (id) => { if (!confirm("Cancel this alert?")) return; await fetch(`${API}/scheduled/${id}`, { method: "DELETE" }); fetchScheduled(); toast("Alert cancelled", "success"); };

  const prioColors = { NORMAL: "#93C5FD", URGENT: "#FCD34D", EMERGENCY: "#FCA5A5" };
  const pending = scheduled.filter(a => a.status === "PENDING");
  const past = scheduled.filter(a => a.status !== "PENDING");

  return (
    <PageShell title="Schedule" subtitle="Schedule Alerts">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 16 }}>
        <GlassCard>
          <CardHead title="New Scheduled Alert" />
          <div style={{ padding: 20 }}>
            <div style={{ marginBottom: 14 }}>
              <FieldLabel>Send To</FieldLabel>
              <GlassSelect value={form.section_code} onChange={e => setForm(f => ({ ...f, section_code: e.target.value }))}>
                {sections.map(s => <option key={s.code} value={s.code} style={{ background: "#1a1a2e" }}>{s.name}</option>)}
              </GlassSelect>
            </div>
            <div style={{ marginBottom: 14 }}>
              <FieldLabel>Priority</FieldLabel>
              <div style={{ display: "flex", gap: 6 }}>
                {["NORMAL", "URGENT", "EMERGENCY"].map(p => (
                  <button key={p} onClick={() => setForm(f => ({ ...f, priority_level: p }))} style={{ flex: 1, padding: "8px", borderRadius: 7, cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "inherit", border: `1px solid ${form.priority_level === p ? prioColors[p] + "80" : "rgba(255,255,255,0.1)"}`, background: form.priority_level === p ? prioColors[p] + "20" : "rgba(255,255,255,0.04)", color: form.priority_level === p ? prioColors[p] : g.muted }}>{p}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <FieldLabel>Date & Time</FieldLabel>
              <input type="datetime-local" value={form.scheduled_for} onChange={e => setForm(f => ({ ...f, scheduled_for: e.target.value }))} min={new Date().toISOString().slice(0, 16)} style={{ ...glassInput }} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <FieldLabel>Message <span style={{ float: "right" }}>{form.message.length}/160</span></FieldLabel>
              <GlassTextarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Scheduled message..." rows={3} />
            </div>
            <GlassBtn primary onClick={handleSchedule}>{saving ? "Scheduling..." : "🕐 Schedule Alert"}</GlassBtn>
          </div>
        </GlassCard>

        <div>
          {pending.length > 0 && (
            <GlassCard style={{ marginBottom: 14 }}>
              <CardHead title={`⏳ Upcoming (${pending.length})`} />
              <div style={{ padding: 12 }}>
                {pending.map(a => (
                  <div key={a.id} style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)", borderRadius: 10, padding: 14, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, color: "#93C5FD" }}>{a.section_code}</span>
                        <Badge label={a.priority_level} />
                        <span style={{ fontSize: 11, color: g.muted }}>🕐 {new Date(a.scheduled_for).toLocaleString()}</span>
                      </div>
                      <p style={{ fontSize: 13, color: g.muted, margin: 0 }}>{a.message}</p>
                    </div>
                    <button onClick={() => handleCancel(a.id)} style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)", color: "#FCA5A5", padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: "inherit", fontWeight: 600, marginLeft: 12, whiteSpace: "nowrap" }}>Cancel</button>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
          {past.length > 0 && (
            <GlassCard>
              <CardHead title="History" />
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Scheduled", "Section", "Status", "Recipients"].map(h => <th key={h} style={{ fontFamily: "monospace", fontSize: 9, color: g.dim, padding: "10px 16px", textAlign: "left", letterSpacing: "0.1em", textTransform: "uppercase" }}>{h}</th>)}</tr></thead>
                <tbody>
                  {past.map(a => (
                    <tr key={a.id} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "10px 16px", fontSize: 12, color: g.muted }}>{new Date(a.scheduled_for).toLocaleString()}</td>
                      <td style={{ padding: "10px 16px", fontWeight: 700, color: "#93C5FD" }}>{a.section_code}</td>
                      <td style={{ padding: "10px 16px" }}><Badge label={a.status} /></td>
                      <td style={{ padding: "10px 16px", fontSize: 13, color: g.muted }}>{a.recipient_count || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </GlassCard>
          )}
          {pending.length === 0 && past.length === 0 && (
            <GlassCard>
              <div style={{ padding: 48, textAlign: "center", color: g.muted }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🕐</div>
                <div style={{ fontWeight: 600 }}>No scheduled alerts</div>
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </PageShell>
  );
}

// ── Statistics ─────────────────────────────────────────────────────────────
function StatisticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [Recharts, setRecharts] = useState(null);

  useEffect(() => {
    import("recharts").then(m => setRecharts(m)).catch(() => {});
    fetch(`${API}/logs/stats/charts`).then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => { setError("Could not load statistics"); setLoading(false); });
  }, []);

  if (loading || !Recharts) return <PageShell title="Statistics"><div style={{ padding: 48, textAlign: "center", color: g.muted }}><div style={{ fontSize: 32 }}>📊</div><div style={{ marginTop: 8 }}>Loading...</div></div></PageShell>;
  if (error) return <PageShell title="Statistics"><div style={{ padding: 48, textAlign: "center", color: "#FCA5A5" }}>{error}</div></PageShell>;

  const { BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = Recharts;
  const COLORS = [g.blue, g.gold, g.green, g.purple, g.red, "#F59E0B", "#06B6D4", "#EC4899"];
  const s = data.summary;
  const chartDays = data.alerts_by_day.slice(-14);

  const tooltipStyle = { background: "rgba(10,20,40,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "white", fontSize: 12 };

  return (
    <PageShell title="Statistics" subtitle="Analytics" actions={
      <GlassBtn onClick={() => { setLoading(true); fetch(`${API}/logs/stats/charts`).then(r => r.json()).then(d => { setData(d); setLoading(false); }); }}>↻ Refresh</GlassBtn>
    }>
      {/* Summary */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { icon: "📡", label: "Total Alerts", value: s.total_alerts, color: "#93C5FD" },
          { icon: "📱", label: "SMS Sent", value: s.total_sms, color: "#6EE7B7" },
          { icon: "✅", label: "Success Rate", value: `${s.success_rate}%`, color: "#6EE7B7" },
          { icon: "🎓", label: "Active Students", value: s.active_students, color: "#FCD34D" },
          { icon: "📚", label: "Sections", value: s.total_sections, color: "#C4B5FD" },
        ].map(c => (
          <div key={c.label} style={{ ...glassCard, padding: 18, flex: 1, minWidth: 130 }}>
            <div style={{ fontSize: 20, marginBottom: 10 }}>{c.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: c.color, letterSpacing: "-0.04em" }}>{c.value}</div>
            <div style={{ fontSize: 11, color: g.muted, marginTop: 3 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <GlassCard>
          <CardHead title="📈 Alert Volume — Last 14 Days" />
          <div style={{ padding: 16 }}>
            {chartDays.every(d => d.alerts === 0) ? <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: g.muted, fontSize: 13 }}>No alert data yet</div> : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartDays} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: g.muted }} />
                  <YAxis tick={{ fontSize: 10, fill: g.muted }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="alerts" name="Alerts" fill={g.blue} radius={[4,4,0,0]} />
                  <Bar dataKey="sms" name="SMS" fill={g.gold} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassCard>
        <GlassCard>
          <CardHead title="📬 Delivery Success Rate" />
          <div style={{ padding: 16 }}>
            {data.delivery_rate.every(d => d.rate === null) ? <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: g.muted, fontSize: 13 }}>No receipt data yet</div> : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={data.delivery_rate.slice(-14)} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={g.green} stopOpacity={0.25}/><stop offset="95%" stopColor={g.green} stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: g.muted }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: g.muted }} unit="%" />
                  <Tooltip contentStyle={tooltipStyle} formatter={v => v !== null ? `${v}%` : "No data"} />
                  <Area type="monotone" dataKey="rate" name="Success %" stroke={g.green} fill="url(#sg)" strokeWidth={2} dot={false} connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 14 }}>
        <GlassCard>
          <CardHead title="📚 Most Active Sections" />
          <div style={{ padding: 16 }}>
            {data.alerts_by_section.length === 0 ? <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: g.muted, fontSize: 13 }}>No section data yet</div> : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.alerts_by_section} layout="vertical" margin={{ top: 0, right: 16, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: g.muted }} allowDecimals={false} />
                  <YAxis type="category" dataKey="section" tick={{ fontSize: 10, fill: g.muted }} width={60} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="alerts" name="Alerts" radius={[0,4,4,0]}>{data.alerts_by_section.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassCard>
        <GlassCard>
          <CardHead title="🚨 Priority Breakdown" />
          <div style={{ padding: 16 }}>
            {data.alerts_by_priority.length === 0 ? <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: g.muted, fontSize: 13 }}>No data yet</div> : (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={data.alerts_by_priority} dataKey="count" nameKey="priority" cx="50%" cy="50%" outerRadius={60} innerRadius={35}>
                      {data.alerts_by_priority.map((e, i) => <Cell key={i} fill={e.priority === "EMERGENCY" ? g.red : e.priority === "URGENT" ? g.gold : g.blue} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                  {data.alerts_by_priority.map(p => (
                    <div key={p.priority} style={{ fontSize: 10, color: g.muted, display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", display: "inline-block", background: p.priority === "EMERGENCY" ? g.red : p.priority === "URGENT" ? g.gold : g.blue }} />
                      {p.priority} ({p.count})
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Charts Row 3 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <GlassCard>
          <CardHead title="🕐 Peak Alert Hours" />
          <div style={{ padding: 16 }}>
            {data.alerts_by_hour.every(h => h.alerts === 0) ? <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: g.muted, fontSize: 13 }}>No hourly data yet</div> : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.alerts_by_hour} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="hour" tick={{ fontSize: 9, fill: g.muted }} interval={3} />
                  <YAxis tick={{ fontSize: 10, fill: g.muted }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="alerts" name="Alerts" fill={g.gold} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassCard>
        <GlassCard>
          <CardHead title="🎓 Students per Section" />
          <div style={{ padding: 16 }}>
            {data.section_enrollment.length === 0 ? <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: g.muted, fontSize: 13 }}>No enrolled students yet</div> : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.section_enrollment} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="section" tick={{ fontSize: 10, fill: g.muted }} />
                  <YAxis tick={{ fontSize: 10, fill: g.muted }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="students" name="Students" radius={[4,4,0,0]}>{data.section_enrollment.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassCard>
      </div>
    </PageShell>
  );
}

// ── Audit Log ──────────────────────────────────────────────────────────────
function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("paws_token");
    fetch(`${API}/auth/audit-logs`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { setLogs(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const actionColor = (action) => {
    if (action.includes("DELETE") || action.includes("FAILED")) return { bg: "rgba(239,68,68,0.15)", color: "#FCA5A5", border: "rgba(239,68,68,0.2)" };
    if (action.includes("CREATE") || action.includes("LOGIN_SUCCESS")) return { bg: "rgba(16,185,129,0.15)", color: "#6EE7B7", border: "rgba(16,185,129,0.2)" };
    if (action.includes("TOGGLE")) return { bg: "rgba(245,158,11,0.15)", color: "#FCD34D", border: "rgba(245,158,11,0.2)" };
    return { bg: "rgba(37,99,235,0.15)", color: "#93C5FD", border: "rgba(37,99,235,0.2)" };
  };

  return (
    <PageShell title="Audit Log" subtitle="System Audit Log">
      <GlassCard>
        <CardHead title="All Actions" right={`${logs.length} entries`} />
        {loading ? <div style={{ padding: 40, textAlign: "center", color: g.muted }}>Loading...</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Timestamp", "Action", "Details", "IP Address"].map(h => <th key={h} style={{ fontFamily: "monospace", fontSize: 9, color: g.dim, padding: "10px 18px", textAlign: "left", letterSpacing: "0.1em", textTransform: "uppercase" }}>{h}</th>)}</tr></thead>
            <tbody>
              {logs.length === 0 && <tr><td colSpan={4} style={{ padding: 32, textAlign: "center", color: g.muted }}>No audit logs yet</td></tr>}
              {logs.map(log => {
                const c = actionColor(log.action);
                return (
                  <tr key={log.id} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "10px 18px", fontSize: 11, color: g.muted, fontFamily: "monospace", whiteSpace: "nowrap" }}>{log.timestamp}</td>
                    <td style={{ padding: "10px 18px" }}>
                      <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}`, padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, fontFamily: "monospace" }}>{log.action}</span>
                    </td>
                    <td style={{ padding: "10px 18px", fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{log.details}</td>
                    <td style={{ padding: "10px 18px", fontSize: 11, color: g.muted, fontFamily: "monospace" }}>{log.ip_address}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </GlassCard>
    </PageShell>
  );
}

// ── Login Screen ───────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(""); setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      const data = await res.json();
      if (!res.ok) setError("Invalid username or password");
      else { localStorage.setItem("paws_token", data.access_token); onLogin(); }
    } catch { setError("Could not reach server"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #030712 0%, #0A1628 40%, #0D0A2E 70%, #060D1F 100%)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
      {/* Orbs */}
      <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)", top: -150, left: -100, pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)", bottom: -100, right: -80, pointerEvents: "none" }} />

      <div style={{ ...glassCard, width: "100%", maxWidth: 400, padding: 40, position: "relative" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em", color: "white", marginBottom: 4 }}>
            PAWS<span style={{ color: g.gold }}> Alert</span>
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 10, color: g.muted, letterSpacing: "0.1em" }}>PELLISSIPPI STATE · SECURE LOGIN</div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <FieldLabel>Username</FieldLabel>
          <GlassInput value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" />
        </div>
        <div style={{ marginBottom: 20 }}>
          <FieldLabel>Password</FieldLabel>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder="Enter password" style={{ ...glassInput }} />
        </div>

        {error && <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#FCA5A5", marginBottom: 16 }}>⚠ {error}</div>}

        <button onClick={handleLogin} disabled={loading} style={{ width: "100%", background: "linear-gradient(135deg, #2563EB, #7C3AED)", border: "none", color: "white", borderRadius: 10, padding: 13, fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, fontFamily: "inherit", boxShadow: "0 0 30px rgba(37,99,235,0.3)" }}>
          {loading ? "Signing in..." : "Sign In →"}
        </button>
      </div>
    </div>
  );
}

// ── Root App ───────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("Dashboard");
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem("paws_token"));
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => setToast({ message, type });

  const handleLogout = () => { localStorage.removeItem("paws_token"); setLoggedIn(false); };

  const pages = {
    Dashboard: <Dashboard setPage={setPage} />,
    "Send Alert": <SendAlert toast={showToast} setPage={setPage} />,
    Schedule: <SchedulePage toast={showToast} />,
    Templates: <TemplatesPage toast={showToast} />,
    Staff: <StaffManager toast={showToast} />,
    Sections: <SectionsPage toast={showToast} />,
    Students: <StudentsPage toast={showToast} />,
    Import: <CSVImport toast={showToast} />,
    Statistics: <StatisticsPage />,
    "Audit Log": <AuditLogPage />,
  };

  if (!loggedIn) return <LoginScreen onLogin={() => setLoggedIn(true)} />;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        input, select, textarea, button { font-family: 'Outfit', 'Segoe UI', system-ui, sans-serif; }
        select option { background: #0d1117; color: white; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }
        @keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh", background: "linear-gradient(135deg, #030712 0%, #0A1628 40%, #0D0A2E 70%, #060D1F 100%)", fontFamily: "'Outfit', 'Segoe UI', system-ui, sans-serif", color: "white" }}>
        <Sidebar page={page} setPage={setPage} onLogout={handleLogout} />
        <div style={{ overflow: "auto" }}>
          {pages[page]}
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
