import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

function verifyToken(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return null;
  }
  try {
    const token = authHeader.split(' ')[1];
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return null;
  }
}

export default async function handler(req, res) {
  if (!process.env.SUPABASE_URL) return res.status(500).json({ error: 'Missing Supabase Config' });
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = verifyToken(req, res);
  if (!user) return;

  // ── GET /api/officers?q=OFF111 — search officers by their user_id ─────────────
  if (req.method === 'GET') {
    try {
      const q = (req.query.q || '').trim().toUpperCase();
      if (!q || q.length < 2) {
        return res.status(400).json({ error: 'Query must be at least 2 characters' });
      }

      const { data, error } = await supabase
        .from('users')
        .select('id, user_id, email, role')
        .ilike('user_id', `%${q}%`)
        .neq('id', user.userId)   // exclude yourself
        .eq('role', 'officer')    // only officers, not admins
        .limit(10);

      if (error) throw error;
      return res.json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
