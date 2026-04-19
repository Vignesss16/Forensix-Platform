const router   = require('express').Router();
const supabase = require('../supabase');
const { verifyToken } = require('../middleware/auth');

// POST upload UFDR data
router.post('/', verifyToken, async (req, res) => {
  try {
    const { fileName, fileType, fileSize, ufdrData, deviceInfo, caseId } = req.body;

    const { data, error } = await supabase
      .from('uploads')
      .insert({
        case_id: caseId || null,
        uploaded_by: req.user.userId,
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
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all uploads
router.get('/', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('uploads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single upload (by id)
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('uploads')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Upload not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;