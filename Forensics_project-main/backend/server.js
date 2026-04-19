const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:8080'],
  credentials: true,
}));
app.use(express.json({ limit: '50mb' })); // 50mb for large UFDR files

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'FORENSIX backend running (Supabase)' });
});

// Routes
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/cases',    require('./routes/cases'));
app.use('/api/uploads',  require('./routes/uploads'));
app.use('/api/searches', require('./routes/searches'));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 FORENSIX server running on http://localhost:${PORT}`);
  console.log(`✅ Connected to Supabase: ${process.env.SUPABASE_URL}`);
});