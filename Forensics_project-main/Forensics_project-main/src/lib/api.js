const BASE_URL = '/api';
// Get token from localStorage
const getToken = () => localStorage.getItem('forensix_token');

// Central fetch function — adds JWT header automatically
const apiFetch = async (endpoint, options = {}) => {
  const token = getToken();
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const res = await fetch(`${BASE_URL}${endpoint}`, config);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
};

// ── AUTH ──────────────────────────────────────────────
export const registerUser = (userData) =>
  apiFetch('/auth?path=register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });

export const loginUser = (credentials) =>
  apiFetch('/auth?path=login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });

// ── CASES ─────────────────────────────────────────────
export const getCases = () => apiFetch('/cases');

export const createCase = (caseData) =>
  apiFetch('/cases', {
    method: 'POST',
    body: JSON.stringify(caseData),
  });

export const updateCase = (id, caseData) =>
  apiFetch(`/cases?id=${id}`, {
    method: 'PATCH',
    body: JSON.stringify(caseData),
  });

export const deleteCase = (id) =>
  apiFetch(`/cases?id=${id}`, { method: 'DELETE' });

// ── CHATS ─────────────────────────────────────────────
export const getChats = (caseId) => apiFetch(`/chats?caseId=${caseId}`);

export const saveChat = (caseId, role, content) =>
  apiFetch('/chats', {
    method: 'POST',
    body: JSON.stringify({ case_id: caseId, role, content }),
  });

// ── UPLOADS ───────────────────────────────────────────
export const saveUpload = (uploadData) =>
  apiFetch('/uploads', {
    method: 'POST',
    body: JSON.stringify(uploadData),
  });

export const getUploads = () => apiFetch('/uploads');

export const getUploadById = (id) => apiFetch(`/uploads?id=${id}`);

// ── SAVED SEARCHES ────────────────────────────────────
export const getSavedSearches = () => apiFetch('/searches');

export const saveSearch = (searchData) =>
  apiFetch('/searches', {
    method: 'POST',
    body: JSON.stringify(searchData),
  });

export const deleteSavedSearch = (id) =>
  apiFetch(`/searches?id=${id}`, { method: 'DELETE' });