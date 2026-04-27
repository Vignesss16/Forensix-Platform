const BASE_URL = '/api';
// Get token from localStorage
const getToken = () => localStorage.getItem('chanakya_token');

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

// ── JOINT OPERATIONS (CASE INVITES) ───────────────────────────────────────────

// Get all pending invites for the logged-in officer
export const getPendingInvites = () => apiFetch('/case-invites');

// Owner sends an invite: target_officer_ref = "OFF111"
export const sendCaseInvite = (case_id, target_officer_ref) =>
  apiFetch('/case-invites', {
    method: 'POST',
    body: JSON.stringify({ case_id, target_officer_ref }),
  });

// Officer accepts or declines an invite
export const respondToInvite = (membershipId, action) =>
  apiFetch(`/case-invites?id=${membershipId}`, {
    method: 'PATCH',
    body: JSON.stringify({ action }),  // action: 'accept' | 'decline'
  });

// Owner revokes a collaborator's access
export const revokeAccess = (membershipId) =>
  apiFetch(`/case-invites?id=${membershipId}`, { method: 'DELETE' });

// Search officers by their user_id (e.g. "OFF111")
export const searchOfficers = (query) =>
  apiFetch(`/officers?q=${encodeURIComponent(query)}`);