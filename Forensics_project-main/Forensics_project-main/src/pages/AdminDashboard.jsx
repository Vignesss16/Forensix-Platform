// Admin Dashboard
// Replace this placeholder with your actual admin UI

export default function AdminDashboard({ user, onLogout }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#080c10",
      color: "#c8d8e8",
      fontFamily: "'Exo 2', sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "16px"
    }}>
      {/* Top bar */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0,
        padding: "14px 24px",
        background: "#0d1520",
        borderBottom: "1px solid #1e3a5a",
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "1.2rem", fontWeight: 700, letterSpacing: "0.15em", color: "#fff" }}>
          🟡 ADMIN PORTAL
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "0.7rem", color: "#5a7a96" }}>
            ID: {user.id}
          </span>
          <button onClick={onLogout} style={{
            background: "transparent", border: "1px solid #1e3a5a",
            borderRadius: "4px", padding: "6px 14px",
            color: "#5a7a96", fontFamily: "'Share Tech Mono', monospace",
            fontSize: "0.65rem", letterSpacing: "0.1em", cursor: "pointer"
          }}
            onMouseEnter={e => { e.target.style.borderColor = "#f59e0b"; e.target.style.color = "#f59e0b"; }}
            onMouseLeave={e => { e.target.style.borderColor = "#1e3a5a"; e.target.style.color = "#5a7a96"; }}
          >
            LOGOUT
          </button>
        </div>
      </div>

      {/* Placeholder content */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "12px" }}>🟡</div>
        <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "1.8rem", fontWeight: 700, letterSpacing: "0.15em", color: "#f59e0b" }}>
          ADMIN DASHBOARD
        </div>
        <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "0.75rem", color: "#5a7a96", marginTop: "8px" }}>
          Welcome, {user.id} — Full system access granted
        </div>
      </div>
    </div>
  );
}
