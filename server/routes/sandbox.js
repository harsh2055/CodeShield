// server/routes/sandbox.js
const express = require('express');
const router = express.Router();
const { executeCodeBackend } = require('../utils/sandbox');

router.post('/execute', async (req, res) => {
  const { language, code } = req.body;
  
  if (!language || !code) {
    return res.status(400).json({ error: 'Language and code are required' });
  }

  try {
    const data = await executeCodeBackend(language, code);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Sandbox execution provider failed to process the request.' });
  }
});

module.exports = router;
