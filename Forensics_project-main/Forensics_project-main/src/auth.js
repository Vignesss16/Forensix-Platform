export async function authenticate(role, id, password) {
  try {
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.error || 'Login failed' };
    }

    localStorage.setItem('forensix_token', data.token);
    localStorage.setItem('forensix_user', JSON.stringify({
      role:  data.role,
      id:    data.userId,
      email: data.email,
    }));

    return { success: true, role: data.role, id: data.userId };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export function logout() {
  localStorage.removeItem('forensix_token');
  localStorage.removeItem('forensix_user');
}