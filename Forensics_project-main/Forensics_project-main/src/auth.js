export async function authenticate(role, id, password) {
  try {
    const res = await fetch('/api/auth?path=login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.error || 'Login failed' };
    }

    localStorage.setItem('chanakya_token', data.token);
    localStorage.setItem('chanakya_user', JSON.stringify({
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
  localStorage.removeItem('chanakya_token');
  localStorage.removeItem('chanakya_user');
  localStorage.removeItem('forensix_token'); // Clear legacy if exists
  localStorage.removeItem('forensix_user');
}