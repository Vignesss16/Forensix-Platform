import { useState, useEffect } from "react";
import { authenticate } from "../auth";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&family=Exo+2:wght@300;400;600&display=swap');

  :root {
    --bg: #080c10; --surface: #0d1520; --surface2: #111d2e;
    --border: #1e3a5a; --border-glow: #1a6fa8;
    --accent: #0ea5e9; --accent2: #f59e0b;
    --officer: #0ea5e9; --admin: #f59e0b;
    --text: #c8d8e8; --text-dim: #5a7a96;
    --error: #ef4444; --success: #22c55e;
    --grid: rgba(14,165,233,0.04);
  }
  .login-body { background:var(--bg); color:var(--text); font-family:'Exo 2',sans-serif;
    min-height:100vh; display:flex; align-items:center; justify-content:center;
    overflow:hidden; position:relative; }
  .grid-bg { position:fixed; inset:0; z-index:0;
    background-image: linear-gradient(var(--grid) 1px,transparent 1px),
      linear-gradient(90deg,var(--grid) 1px,transparent 1px);
    background-size:40px 40px; animation:gridScroll 20s linear infinite; }
  @keyframes gridScroll { 0%{background-position:0 0} 100%{background-position:40px 40px} }
  .scan-line { position:fixed; width:100%; height:2px;
    background:linear-gradient(90deg,transparent,var(--accent),transparent);
    opacity:.15; animation:scan 6s ease-in-out infinite; z-index:1; }
  @keyframes scan { 0%{top:-2px} 100%{top:100%} }
  .blob { position:fixed; border-radius:50%; filter:blur(100px); pointer-events:none; z-index:0; }
  .blob-1 { width:600px; height:600px; background:rgba(14,165,233,.06); top:-200px; left:-200px; }
  .blob-2 { width:400px; height:400px; background:rgba(245,158,11,.05); bottom:-100px; right:-100px; }
  .lc { position:relative; z-index:10; width:100%; max-width:480px; padding:20px;
    animation:fadeIn .8s ease forwards; }
  @keyframes fadeIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  .lh { text-align:center; margin-bottom:36px; }
  .logo-line { display:flex; align-items:center; justify-content:center; gap:14px; margin-bottom:6px; }
  .logo-icon { width:42px; height:42px; border:2px solid var(--accent); border-radius:6px;
    display:flex; align-items:center; justify-content:center;
    box-shadow:0 0 20px rgba(14,165,233,.3),inset 0 0 12px rgba(14,165,233,.1); }
  .logo-icon svg { width:22px; height:22px; color:var(--accent); }
  .logo-text { font-family:'Rajdhani',sans-serif; font-size:2.4rem; font-weight:700;
    letter-spacing:.15em; color:#fff; text-shadow:0 0 30px rgba(14,165,233,.4); }
  .logo-sub { font-family:'Share Tech Mono',monospace; font-size:.7rem;
    letter-spacing:.3em; color:var(--text-dim); text-transform:uppercase; }
  .status-bar { display:flex; align-items:center; justify-content:center; gap:8px; margin-top:14px; }
  .status-dot { width:7px; height:7px; border-radius:50%; background:var(--success);
    box-shadow:0 0 8px var(--success); animation:pulse 2s ease infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
  .status-text { font-family:'Share Tech Mono',monospace; font-size:.68rem;
    color:var(--text-dim); letter-spacing:.1em; }
  .card { background:var(--surface); border:1px solid var(--border); border-radius:8px;
    padding:32px; position:relative;
    box-shadow:0 0 60px rgba(0,0,0,.6),0 0 0 1px rgba(14,165,233,.05); }
  .card::before { content:''; position:absolute; top:0; left:20px; right:20px; height:1px;
    background:linear-gradient(90deg,transparent,var(--accent),transparent); opacity:.4; }
  .corner { position:absolute; width:14px; height:14px; }
  .c-tl{top:-1px;left:-1px;border-top:2px solid var(--accent);border-left:2px solid var(--accent);}
  .c-tr{top:-1px;right:-1px;border-top:2px solid var(--accent);border-right:2px solid var(--accent);}
  .c-bl{bottom:-1px;left:-1px;border-bottom:2px solid var(--accent);border-left:2px solid var(--accent);}
  .c-br{bottom:-1px;right:-1px;border-bottom:2px solid var(--accent);border-right:2px solid var(--accent);}
  .role-label { font-family:'Share Tech Mono',monospace; font-size:.65rem;
    letter-spacing:.25em; color:var(--text-dim); text-transform:uppercase; margin-bottom:10px; }
  .role-tabs { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:28px; }
  .role-tab { padding:12px; background:var(--surface2); border:1px solid var(--border);
    border-radius:5px; cursor:pointer; text-align:center; transition:all .2s ease; }
  .role-tab:hover { border-color:var(--border-glow); }
  .rt-officer { border-color:var(--officer)!important; background:rgba(14,165,233,.08)!important;
    box-shadow:0 0 20px rgba(14,165,233,.15),inset 0 0 20px rgba(14,165,233,.05); }
  .rt-admin   { border-color:var(--admin)!important; background:rgba(245,158,11,.08)!important;
    box-shadow:0 0 20px rgba(245,158,11,.15),inset 0 0 20px rgba(245,158,11,.05); }
  .role-icon { font-size:1.3rem; margin-bottom:4px; }
  .role-name { font-family:'Rajdhani',sans-serif; font-weight:600; font-size:.85rem;
    letter-spacing:.12em; text-transform:uppercase; color:var(--text-dim); transition:color .2s; }
  .rt-officer .role-name { color:var(--officer); }
  .rt-admin   .role-name { color:var(--admin); }
  .role-badge { font-family:'Share Tech Mono',monospace; font-size:.58rem;
    letter-spacing:.1em; color:var(--text-dim); margin-top:2px; }
  .rt-officer .role-badge { color:rgba(14,165,233,.7); }
  .rt-admin   .role-badge { color:rgba(245,158,11,.7); }
  .field { margin-bottom:18px; }
  .field label { display:block; font-family:'Share Tech Mono',monospace; font-size:.65rem;
    letter-spacing:.25em; color:var(--text-dim); text-transform:uppercase; margin-bottom:8px; }
  .input-wrap { position:relative; display:flex; align-items:center; }
  .input-icon { position:absolute; left:14px; width:16px; height:16px;
    color:var(--text-dim); pointer-events:none; }
  .input-wrap input { width:100%; background:var(--surface2); border:1px solid var(--border);
    border-radius:5px; padding:12px 14px 12px 42px; color:var(--text);
    font-family:'Share Tech Mono',monospace; font-size:.85rem; letter-spacing:.05em;
    outline:none; transition:all .2s ease; }
  .input-wrap input::placeholder { color:var(--text-dim); opacity:.5; }
  .input-wrap input:focus { border-color:var(--accent);
    box-shadow:0 0 0 3px rgba(14,165,233,.1); background:#0f1e30; }
  .eye-btn { position:absolute; right:12px; background:none; border:none;
    cursor:pointer; padding:4px; color:var(--text-dim); transition:color .2s; }
  .eye-btn:hover { color:var(--accent); }
  .error-msg { font-family:'Share Tech Mono',monospace; font-size:.68rem; color:var(--error);
    letter-spacing:.05em; margin-top:14px; padding:8px 12px;
    background:rgba(239,68,68,.1); border:1px solid rgba(239,68,68,.3); border-radius:4px;
    animation:shake .3s ease; }
  @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 60%{transform:translateX(6px)} }
  .submit-btn { width:100%; margin-top:24px; padding:14px; background:transparent;
    border:1px solid var(--accent); border-radius:5px; color:var(--accent);
    font-family:'Rajdhani',sans-serif; font-size:.95rem; font-weight:600;
    letter-spacing:.2em; text-transform:uppercase; cursor:pointer;
    position:relative; overflow:hidden; transition:all .25s ease; }
  .submit-btn::before { content:''; position:absolute; inset:0; background:var(--accent);
    transform:translateX(-101%); transition:transform .25s ease; z-index:0; }
  .submit-btn:hover::before { transform:translateX(0); }
  .submit-btn:hover { color:#000; box-shadow:0 0 30px rgba(14,165,233,.3); }
  .submit-btn span { position:relative; z-index:1; }
  .btn-admin { border-color:var(--admin)!important; color:var(--admin)!important; }
  .btn-admin::before { background:var(--admin)!important; }
  .btn-admin:hover { box-shadow:0 0 30px rgba(245,158,11,.3)!important; }
  .submit-btn:disabled { opacity:.6; cursor:not-allowed; pointer-events:none; }
  .card-footer { margin-top:20px; display:flex; align-items:center; justify-content:space-between; }
  .footer-link { font-family:'Share Tech Mono',monospace; font-size:.63rem;
    letter-spacing:.1em; color:var(--text-dim); text-decoration:none; transition:color .2s; }
  .footer-link:hover { color:var(--accent); }
  .fdivider { width:1px; height:12px; background:var(--border); }
  .clock { font-family:'Share Tech Mono',monospace; font-size:.63rem;
    color:var(--text-dim); letter-spacing:.1em; text-align:center; margin-top:20px; }
`;

export default function Login({ onLogin }) {
  const [role, setRole] = useState("officer");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const d = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
      const t = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
      setClock(`${d} · ${t} IST`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const handleSubmit = async () => {
    setError("");
    if (!userId.trim() || !password) { setError("Please enter your credentials."); return; }
    setLoading(true);
    const result = await authenticate(role, userId.trim(), password);
    setLoading(false);
    if (result.success) {
      onLogin(result.role, result.id);
    } else {
      setError(result.error);
    }
  };

  const handleKey = (e) => { if (e.key === "Enter") handleSubmit(); };

  return (
    <>
      <style>{styles}</style>
      <div className="login-body">
        <div className="grid-bg" />
        <div className="scan-line" />
        <div className="blob blob-1" />
        <div className="blob blob-2" />

        <div className="lc">
          {/* Header */}
          <div className="lh">
            <div className="logo-line">
              <div className="logo-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div className="logo-text">CHANAKYA</div>
            </div>
            <div className="logo-sub">Secure Investigation System</div>
            <div className="status-bar">
              <div className="status-dot" />
              <div className="status-text">SYSTEM ONLINE · ENCRYPTED · AUTH REQUIRED</div>
            </div>
          </div>

          {/* Card */}
          <div className="card">
            <div className="corner c-tl"/><div className="corner c-tr"/>
            <div className="corner c-bl"/><div className="corner c-br"/>

            {/* Role selector */}
            <div className="role-label">Select Access Level</div>
            <div className="role-tabs">
              <div className={`role-tab ${role === "officer" ? "rt-officer" : ""}`} onClick={() => { setRole("officer"); setError(""); }}>
                <div className="role-icon">🔵</div>
                <div className="role-name">Officer</div>
                <div className="role-badge">FIELD ACCESS</div>
              </div>
              <div className={`role-tab ${role === "admin" ? "rt-admin" : ""}`} onClick={() => { setRole("admin"); setError(""); }}>
                <div className="role-icon">🟡</div>
                <div className="role-name">Admin</div>
                <div className="role-badge">FULL ACCESS</div>
              </div>
            </div>

            {/* Badge ID */}
            <div className="field">
              <label>Badge / User ID</label>
              <div className="input-wrap">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
                </svg>
                <input type="text" placeholder="Enter your badge number"
                  value={userId} onChange={e => setUserId(e.target.value)} onKeyDown={handleKey}
                  autoComplete="off" spellCheck="false" />
              </div>
            </div>

            {/* Password */}
            <div className="field">
              <label>Password</label>
              <div className="input-wrap">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input type={showPw ? "text" : "password"} placeholder="Enter your password"
                  value={password} onChange={e => setPassword(e.target.value)} onKeyDown={handleKey} />
                <button className="eye-btn" onClick={() => setShowPw(v => !v)} type="button">
                  {showPw
                    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            {error && <div className="error-msg">⚠ {error}</div>}

            <button className={`submit-btn ${role === "admin" ? "btn-admin" : ""}`}
              onClick={handleSubmit} disabled={loading}>
              <span>{loading ? "VERIFYING..." : "AUTHENTICATE"}</span>
            </button>

            <div className="card-footer">
              <a href="#" className="footer-link">Forgot Password?</a>
              <div className="fdivider"/>
              <a href="#" className="footer-link">Contact Admin</a>
              <div className="fdivider"/>
              <a href="#" className="footer-link">Help</a>
            </div>
          </div>

          <div className="clock">{clock}</div>
        </div>
      </div>
    </>
  );
}
