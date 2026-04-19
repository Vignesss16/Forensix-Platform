import { useState } from "react";
import Login from "./pages/Login";
import OfficerDashboard from "./pages/OfficerDashboard";
import AdminDashboard from "./pages/AdminDashboard";


export default function App() {
  const [user, setUser] = useState(null); // { role: 'officer' | 'admin', id: string }

  const handleLogin = (role, id) => {
    setUser({ role, id });
  };

  const handleLogout = () => {
    setUser(null);
  };

  // Not logged in → show Login
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Logged in as officer
  if (user.role === "officer") {
    return <OfficerDashboard user={user} onLogout={handleLogout} />;
  }

  // Logged in as admin
  if (user.role === "admin") {
    return <AdminDashboard user={user} onLogout={handleLogout} />;
  }
}