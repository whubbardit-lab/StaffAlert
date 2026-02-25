import { useState, useEffect, useCallback } from "react";

const API = "http://localhost:8000/api";

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
function Navbar({ page, setPage }) {
  const tabs = ["Dashboard", "Staff", "Students", "Import"];
  return (
    <nav style={{
      background: theme.blue, color: theme.white,
      display: "flex", alignItems: "center",
      padding: "0 24px", height: 60,
      boxShadow: "0 2px 12px rgba(0,0,0,0.25)"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 40 }}>
        <div style={{
          background: theme.gold, borderRadius: 6,
          width: 32, height: 32, display: "flex",
          alignItems: "center", justifyContent: "center",
          fontWeight: 900, color: theme.blue, fontSize: 16
        }}>S</div>
        <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em" }}>
          Staff<span style={{ color: theme.gold }}>Alert</span>
        </span>
      </div>

      <div style={{ display: "flex", gap: 4 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setPage(t)} style={{
            background: page === t ? theme.gold : "transparent",
            color: page === t ? theme.blue : "rgba(255,255,255,0.75)",
            border: "none", padding: "6px 18px",
            borderRadius: 6, cursor: "pointer",
            fontWeight: page === t ? 700 : 500,
            fontSize: 14, transition: "all 0.15s"
          }}>{t}</button>
        ))}
      </div>

      <div style={{ marginLeft: "auto", fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
        Pellissippi State College
      </div>
    </nav>
  );
}

// ── Dashboard Page ─────────────────────────────────────────────────────────
function Dashboard() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

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
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: theme.blue, margin: 0 }}>
          Live Alert Feed
        </h1>
        <p style={{ color: theme.gray, margin: "4px 0 0", fontSize: 14 }}>
          Auto-refreshes every 15 seconds
        </p>
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
                <tr key={log.id} style={{
                  borderTop: `1px solid ${theme.grayLight}`,
                  background: i % 2 === 0 ? theme.white : "#FAFAFA"
                }}>
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

// ── Root App ────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("Dashboard");

  const pages = {
    Dashboard: <Dashboard />,
    Staff: <StaffManager />,
    Students: <StudentsPage />,
    Import: <CSVImport />,
  };

  return (
    <div style={{ minHeight: "100vh", background: theme.surface, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <Navbar page={page} setPage={setPage} />
      <main style={{ maxWidth: 1200, margin: "0 auto" }}>
        {pages[page]}
      </main>
    </div>
  );
}
