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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = verifyToken(req, res);
  if (!user) return;

  const caseId = req.query.caseId;

  // GET /api/chats?caseId=:id — List chats for a case
  if (req.method === 'GET' && caseId) {
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      return res.json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST /api/chats — Save a new chat message
  if (req.method === 'POST') {
    try {
      const { case_id, role, content } = req.body;
      
      const { data, error } = await supabase
        .from('chats')
        .insert({
          case_id,
          user_id: user.userId,
          role,
          content,
        })
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
