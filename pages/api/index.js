// api/index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { checkJwt } = require('./auth');
const connectDB = require('../../config/database');
const BusinessProcess = require('../../models/BusinessProcess');
const ImpactAnalysis = require('../../models/ImpactAnalysis');
const RTORPOAnalysis = require('../../models/RTORPOAnalysis');

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Connect to MongoDB
connectDB();

// Routes
app.post('/api/businessProcess', checkJwt, async (req, res) => {
  try {
    const newBusinessProcess = new BusinessProcess(req.body);
    await newBusinessProcess.save();
    res.status(201).json(newBusinessProcess);
  } catch (error) {
    res.status(500).json({ error: 'Error saving business process' });
  }
});

app.post('/api/impactAnalysis', checkJwt, async (req, res) => {
  try {
    const newImpactAnalysis = new ImpactAnalysis(req.body);
    await newImpactAnalysis.save();
    res.status(201).json(newImpactAnalysis);
  } catch (error) {
    res.status(500).json({ error: 'Error saving impact analysis' });
  }
});

app.post('/api/rto-rpo-analysis', checkJwt, async (req, res) => {
  try {
    const newRTORPOAnalysis = new RTORPOAnalysis(req.body);
    await newRTORPOAnalysis.save();
    res.status(201).json(newRTORPOAnalysis);
  } catch (error) {
    res.status(500).json({ error: 'Error saving RTO/RPO analysis' });
  }
});

app.get('/api/rto-rpo-analysis', checkJwt, async (req, res) => {
  try {
    const { userId } = req.query;
    const analysis = await RTORPOAnalysis.find({ userId });
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching RTO/RPO analysis' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

module.exports = app;
