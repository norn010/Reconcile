const express = require('express');
const cors = require('cors');
const path = require('path');
const reconcileRoutes = require('./routes/reconcileRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', reconcileRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Maximum size is 50MB.' });
  }
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Reconciliation server running on http://localhost:${PORT}`);
  console.log(`API endpoints:`);
  console.log(`  POST /api/upload       - Upload Excel file`);
  console.log(`  GET  /api/reconcile    - Run reconciliation`);
  console.log(`  POST /api/merge        - Merge two customers`);
  console.log(`  GET  /api/export       - Export results to Excel`);
  console.log(`  GET  /api/transactions - Get loaded transactions`);
});
