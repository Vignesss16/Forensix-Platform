import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (!process.env.SUPABASE_URL) {
    return res.status(500).json({ error: 'Supabase URL missing in env' });
  }
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  // ── CORS ────────────────────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const path = req.query.path || '';

  // ── POST /api/auth/register ──────────────────────────────────────────────────
  if (req.method === 'POST' && path === 'register') {
    try {
      const { userId, email, password, role } = req.body;

      if (!userId || !email || !password) {
        return res.status(400).json({ error: 'userId, email and password are required' });
      }

      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .or(`email.eq.${email},user_id.eq.${userId}`)
        .single();

      if (existing) {
        return res.status(400).json({ error: 'User with this email or ID already exists' });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const { data: user, error } = await supabase
        .from('users')
        .insert({ user_id: userId, email, password_hash: passwordHash, role: role || 'officer' })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_ref: userId,
        action: 'REGISTER',
        details: { email, role: user.role },
      });

      return res.status(201).json({ message: 'User registered successfully', userId: user.user_id });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST /api/auth/login ─────────────────────────────────────────────────────
  if (req.method === 'POST' && path === 'login') {
    try {
      const { userId, password } = req.body;

      if (!userId || !password) {
        return res.status(400).json({ error: 'userId and password are required' });
      }

      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { userId: user.id, userRef: user.user_id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_ref: user.user_id,
        action: 'LOGIN',
        details: { role: user.role },
      });

      return res.json({ token, role: user.role, userId: user.user_id, email: user.email });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
