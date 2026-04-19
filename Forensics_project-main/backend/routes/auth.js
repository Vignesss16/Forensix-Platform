const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const supabase = require('../supabase');

// ── REGISTER ──────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { userId, email, password, role } = req.body;

    if (!userId || !email || !password) {
      return res.status(400).json({ error: 'userId, email and password are required' });
    }

    // Check if user already exists
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

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_ref: userId,
      action: 'REGISTER',
      details: { email, role: user.role },
    });

    res.status(201).json({ message: 'User registered successfully', userId: user.user_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── LOGIN ─────────────────────────────────────────────
router.post('/login', async (req, res) => {
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

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_ref: user.user_id,
      action: 'LOGIN',
      details: { role: user.role },
    });

    res.json({ token, role: user.role, userId: user.user_id, email: user.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;