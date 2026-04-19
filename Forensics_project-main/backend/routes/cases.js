const router   = require('express').Router();
const supabase = require('../supabase');
const { verifyToken } = require('../middleware/auth');

// GET all cases
router.get('/', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single case
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Case not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create case
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, description, priority, status, tags, notes } = req.body;
    let caseNumber = req.body.caseNumber;
    if (!caseNumber) {
      caseNumber = 'CASE-' + Date.now().toString().slice(-6);
    }

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
        created_by: req.user.userId,
      })
      .select()
      .single();

    if (error) throw error;
    // Map id to _id for backward compatibility with frontend if necessary, or let frontend use data.id
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH update case
router.patch('/:id', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cases')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;