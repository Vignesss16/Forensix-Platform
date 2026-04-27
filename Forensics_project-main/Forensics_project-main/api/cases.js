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
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = verifyToken(req, res);
  if (!user) return;

  const id = req.query.id;

  // GET /api/cases — list cases the officer owns OR is an accepted member of
  if (req.method === 'GET' && !id) {
    try {
      // Admins see everything
      if (user.role === 'admin') {
        const { data, error } = await supabase
          .from('cases')
          .select('*, members:case_members(id, officer_id, role, status, invited_at, accepted_at, officer:officer_id(user_id, email))')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return res.json(data);
      }

      // Officers: fetch all case_ids they have accepted access to
      const { data: memberships, error: mErr } = await supabase
        .from('case_members')
        .select('case_id')
        .eq('officer_id', user.userId)
        .eq('status', 'accepted');
      if (mErr) throw mErr;

      const accessibleCaseIds = memberships.map(m => m.case_id);

      // Get those cases + members for each
      const { data, error } = await supabase
        .from('cases')
        .select('*, members:case_members(id, officer_id, role, status, invited_at, accepted_at, officer:officer_id(user_id, email))')
        .in('id', accessibleCaseIds.length > 0 ? accessibleCaseIds : ['00000000-0000-0000-0000-000000000000'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // GET /api/cases?id=:id — single case
  if (req.method === 'GET' && id) {
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('id', id)
        .single();
      if (error || !data) return res.status(404).json({ error: 'Case not found' });
      return res.json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST /api/cases — create
  if (req.method === 'POST') {
    try {
      const { title, description, priority, status, tags, notes } = req.body;
      let caseNumber = req.body.caseNumber;
      if (!caseNumber) caseNumber = 'CASE-' + Date.now().toString().slice(-6);

      const { data, error } = await supabase
        .from('cases')
        .insert({
          case_number: caseNumber,
          title,
          description,
          priority: priority || 'medium',
          status: status || 'active',
          tags: tags || [],
          notes: notes || [],
          created_by: user.userId,
        })
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // PATCH /api/cases?id=:id — update
  if (req.method === 'PATCH' && id) {
    try {
      const { data, error } = await supabase
        .from('cases')
        .update(req.body)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return res.json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // DELETE /api/cases?id=:id — delete
  if (req.method === 'DELETE' && id) {
    try {
      const { error } = await supabase
        .from('cases')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
