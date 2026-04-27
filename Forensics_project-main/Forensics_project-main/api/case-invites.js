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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = verifyToken(req, res);
  if (!user) return;

  const membershipId = req.query.id;

  // ── GET /api/case-invites — get pending invites FOR this officer ─────────────
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('case_members')
        .select(`
          id, case_id, role, status, invited_at,
          case:case_id(id, title, case_number, priority, status),
          inviter:invited_by(user_id, email)
        `)
        .eq('officer_id', user.userId)
        .eq('status', 'pending')
        .order('invited_at', { ascending: false });

      if (error) throw error;
      return res.json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST /api/case-invites — send an invite ──────────────────────────────────
  // Body: { case_id, target_officer_ref }  (target_officer_ref = "OFF111")
  if (req.method === 'POST') {
    try {
      const { case_id, target_officer_ref } = req.body;
      if (!case_id || !target_officer_ref) {
        return res.status(400).json({ error: 'case_id and target_officer_ref are required' });
      }

      // Verify the caller owns this case (is the 'owner' in case_members)
      const { data: ownership, error: owErr } = await supabase
        .from('case_members')
        .select('id')
        .eq('case_id', case_id)
        .eq('officer_id', user.userId)
        .eq('role', 'owner')
        .single();

      if (owErr || !ownership) {
        return res.status(403).json({ error: 'Only the case owner can send invites' });
      }

      // Find the target officer by their user_id string (e.g. "OFF111")
      const { data: targetUser, error: tuErr } = await supabase
        .from('users')
        .select('id, user_id, email')
        .eq('user_id', target_officer_ref.toUpperCase())
        .single();

      if (tuErr || !targetUser) {
        return res.status(404).json({ error: `Officer "${target_officer_ref}" not found` });
      }

      if (targetUser.id === user.userId) {
        return res.status(400).json({ error: 'You cannot invite yourself' });
      }

      // Create the pending membership
      const { data, error } = await supabase
        .from('case_members')
        .insert({
          case_id,
          officer_id: targetUser.id,
          role: 'collaborator',
          status: 'pending',
          invited_by: user.userId,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return res.status(409).json({ error: 'This officer has already been invited or has access' });
        }
        throw error;
      }

      return res.status(201).json({ 
        success: true, 
        message: `Invite sent to ${targetUser.user_id}`,
        membership: data 
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── PATCH /api/case-invites?id=:id — accept or decline ──────────────────────
  // Body: { action: 'accept' | 'decline' }
  if (req.method === 'PATCH' && membershipId) {
    try {
      const { action } = req.body;
      if (!['accept', 'decline'].includes(action)) {
        return res.status(400).json({ error: 'action must be "accept" or "decline"' });
      }

      // Make sure this invite belongs to the calling officer
      const { data: membership, error: mErr } = await supabase
        .from('case_members')
        .select('id, officer_id, status')
        .eq('id', membershipId)
        .single();

      if (mErr || !membership) return res.status(404).json({ error: 'Invite not found' });
      if (membership.officer_id !== user.userId) {
        return res.status(403).json({ error: 'You can only respond to your own invites' });
      }
      if (membership.status !== 'pending') {
        return res.status(409).json({ error: 'This invite has already been responded to' });
      }

      const newStatus = action === 'accept' ? 'accepted' : 'declined';
      const updatePayload = {
        status: newStatus,
        ...(action === 'accept' && { accepted_at: new Date().toISOString() }),
      };

      const { data, error } = await supabase
        .from('case_members')
        .update(updatePayload)
        .eq('id', membershipId)
        .select()
        .single();

      if (error) throw error;
      return res.json({ success: true, status: newStatus, membership: data });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── DELETE /api/case-invites?id=:id — revoke access (owner only) ─────────────
  if (req.method === 'DELETE' && membershipId) {
    try {
      // Get the membership to verify caller is the case owner
      const { data: membership, error: mErr } = await supabase
        .from('case_members')
        .select('id, case_id, role, officer_id')
        .eq('id', membershipId)
        .single();

      if (mErr || !membership) return res.status(404).json({ error: 'Membership not found' });
      if (membership.role === 'owner') {
        return res.status(400).json({ error: 'Cannot remove the case owner' });
      }

      // Check calling officer is the owner of this case
      const { data: ownership } = await supabase
        .from('case_members')
        .select('id')
        .eq('case_id', membership.case_id)
        .eq('officer_id', user.userId)
        .eq('role', 'owner')
        .single();

      if (!ownership) {
        return res.status(403).json({ error: 'Only the case owner can revoke access' });
      }

      const { error } = await supabase
        .from('case_members')
        .delete()
        .eq('id', membershipId);

      if (error) throw error;
      return res.json({ success: true, message: 'Access revoked successfully' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
