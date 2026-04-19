const router   = require('express').Router();
const supabase = require('../supabase');
const { verifyToken } = require('../middleware/auth');

// GET all saved searches for user
router.get('/', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', req.user.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST save a search
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, query, filters, resultsCount } = req.body;

    const { data, error } = await supabase
      .from('saved_searches')
      .insert({
        user_id: req.user.userId,
        name,
        query,
        filters,
        results_count: resultsCount || 0,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a saved search
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('saved_searches')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.userId);

    if (error) throw error;
    res.json({ message: 'Search deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;