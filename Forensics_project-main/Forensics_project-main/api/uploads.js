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

  const id = req.query.id;

  // POST /api/uploads — create upload record
  if (req.method === 'POST') {
    try {
      const { fileName, fileType, fileSize, ufdrData, deviceInfo, caseId } = req.body;

      const { data, error } = await supabase
        .from('uploads')
        .insert({
          case_id: caseId || null,
          uploaded_by: user.userId,
          file_name: fileName,
          file_type: fileType,
          file_size: fileSize,
          ufdr_data: ufdrData,
          device_info: deviceInfo,
          upload_status: 'complete',
        })
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // GET /api/uploads — list all (optionally filtered by caseId)
  if (req.method === 'GET' && !id) {
    try {
      // ONLY select metadata, do NOT select ufdr_data here or Vercel will crash!
      let query = supabase
        .from('uploads')
        .select('id, case_id, uploaded_by, file_name, file_type, file_size, upload_status, created_at')
        .order('created_at', { ascending: false });

      if (req.query.caseId) {
        query = query.eq('case_id', req.query.caseId);
      }

      const { data, error } = await query;


      if (error) throw error;
      return res.json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // GET /api/uploads?id=:id — single upload
  if (req.method === 'GET' && id) {
    try {
      const { data, error } = await supabase
        .from('uploads')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) return res.status(404).json({ error: 'Upload not found' });
      return res.json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
