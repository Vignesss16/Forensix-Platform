// Admin Dashboard
import { useState } from "react";
import { registerUser } from "../lib/api";

const styles = `
  .admin-panel {
    min-height: 100vh;
    background: var(--bg, #080c10);
    color: var(--text, #c8d8e8);
    font-family: 'Exo 2', sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 100px;
    padding-bottom: 40px;
  }
  .form-card {
    background: var(--surface, #0d1520);
    border: 1px solid var(--border, #1e3a5a);
    border-radius: 8px;
    padding: 32px;
    width: 100%;
    max-width: 450px;
    box-shadow: 0 0 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(245,158,11,0.05);
    position: relative;
    animation: slideUp 0.6s ease forwards;
  }
  @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  .f-header {
    text-align: center;
    margin-bottom: 30px;
  }
  .f-title {
    font-family: 'Rajdhani', sans-serif;
    font-size: 1.8rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--admin, #f59e0b);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }
  .f-field {
    margin-bottom: 20px;
  }
  .f-label {
    display: block;
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.7rem;
    letter-spacing: 0.2em;
    color: var(--text-dim, #5a7a96);
    text-transform: uppercase;
    margin-bottom: 8px;
  }
  .f-input {
    width: 100%;
    background: var(--surface2, #111d2e);
    border: 1px solid var(--border, #1e3a5a);
    border-radius: 5px;
    padding: 12px 14px;
    color: var(--text, #c8d8e8);
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.85rem;
    outline: none;
    transition: all 0.2s;
  }
  .f-input:focus {
    border-color: var(--admin, #f59e0b);
    box-shadow: 0 0 0 3px rgba(245,158,11,0.1);
  }
  .f-select {
    appearance: none;
    cursor: pointer;
  }
  .f-btn {
    width: 100%;
    padding: 14px;
    margin-top: 10px;
    border: 1px solid var(--admin, #f59e0b);
    background: transparent;
    color: var(--admin, #f59e0b);
    font-family: 'Rajdhani', sans-serif;
    font-size: 1rem;
    font-weight: 600;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    border-radius: 5px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .f-btn:hover:not(:disabled) {
    background: var(--admin, #f59e0b);
    color: #000;
    box-shadow: 0 0 20px rgba(245,158,11,0.3);
  }
  .f-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .msg {
    margin-top: 16px;
    padding: 12px;
    border-radius: 4px;
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.75rem;
    text-align: center;
  }
  .msg.error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #ef4444; }
  .msg.success { background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3); color: #22c55e; }
`;

export default function AdminDashboard({ user, onLogout }) {
  const [formData, setFormData] = useState({ userId: '', email: '', password: '', role: 'officer' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleRegister = async (e) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      if (!formData.userId || !formData.email || !formData.password) {
        throw new Error("All fields are required");
      }
      const data = await registerUser(formData);
      setMsg({ type: 'success', text: `User ${data.userId} registered successfully.` });
      setFormData({ userId: '', email: '', password: '', role: 'officer' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message || "Registration failed" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="admin-panel">
        
        {/* Top bar */}
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, padding: "14px 24px", background: "#0d1520", borderBottom: "1px solid #1e3a5a", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 100 }}>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "1.2rem", fontWeight: 700, letterSpacing: "0.15em", color: "#fff" }}>
            🟡 ADMIN PORTAL
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "0.7rem", color: "#5a7a96" }}>
              ID: {user.id}
            </span>
            <button onClick={onLogout} style={{ background: "transparent", border: "1px solid #1e3a5a", borderRadius: "4px", padding: "6px 14px", color: "#5a7a96", fontFamily: "'Share Tech Mono', monospace", fontSize: "0.65rem", letterSpacing: "0.1em", cursor: "pointer" }}
              onMouseEnter={e => { e.target.style.borderColor = "#f59e0b"; e.target.style.color = "#f59e0b"; }}
              onMouseLeave={e => { e.target.style.borderColor = "#1e3a5a"; e.target.style.color = "#5a7a96"; }}
            >
              LOGOUT
            </button>
          </div>
        </div>

        <div className="form-card">
          <div className="f-header">
            <div className="f-title">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5c-2.2 0-4 1.8-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
              USER PROVISIONING
            </div>
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "0.75rem", color: "#5a7a96", marginTop: "8px" }}>
              Securely issue new operative credentials
            </div>
          </div>

          <form onSubmit={handleRegister}>
            <div className="f-field">
              <label className="f-label">Role / Clearance</label>
              <select className="f-input f-select" name="role" value={formData.role} onChange={handleChange}>
                <option value="officer">Field Officer (Standard Access)</option>
                <option value="admin">System Admin (Full Access)</option>
              </select>
            </div>
            
            <div className="f-field">
              <label className="f-label">Badge ID / Call Sign</label>
              <input className="f-input" type="text" name="userId" placeholder="e.g. OFF042" value={formData.userId} onChange={handleChange} autoComplete="off" />
            </div>

            <div className="f-field">
              <label className="f-label">Official Email</label>
              <input className="f-input" type="email" name="email" placeholder="officer@forensix.gov" value={formData.email} onChange={handleChange} autoComplete="off" />
            </div>

            <div className="f-field">
              <label className="f-label">Initial Passcode</label>
              <input className="f-input" type="text" name="password" placeholder="System generated or manual" value={formData.password} onChange={handleChange} autoComplete="off" />
            </div>

            {msg && <div className={`msg ${msg.type}`}>{msg.text}</div>}

            <button type="submit" className="f-btn" disabled={loading}>
              {loading ? "PROVISIONING..." : "AUTHORIZE NEW USER"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
