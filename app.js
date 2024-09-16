const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// User model
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const User = mongoose.model('User', UserSchema);

// Impact Analysis model
const ImpactAnalysisSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  financialImpact: { type: Number, required: true },
  reputationImpact: { type: Number, required: true },
  operationalImpact: { type: Number, required: true },
  downtimeHours: { type: Number, required: true },
  costPerHour: { type: Number, required: true },
  totalImpact: { type: Number, required: true },
});

const ImpactAnalysis = mongoose.model('ImpactAnalysis', ImpactAnalysisSchema);

// Vulnerability model
const VulnerabilitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  processName: { type: String, required: true },
  likelihood: { type: Number, required: true },
  impact: { type: Number, required: true },
  vulnerabilityScore: { type: Number, required: true },
});

const Vulnerability = mongoose.model('Vulnerability', VulnerabilitySchema);

// Recovery model
const RecoverySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expectedRTO: { type: Number, required: true },
  actualRTO: { type: Number, required: true },
  rtoGap: { type: Number, required: true },
  expectedRPO: { type: Number, required: true },
  actualRPO: { type: Number, required: true },
  rpoGap: { type: Number, required: true },
});

const Recovery = mongoose.model('Recovery', RecoverySchema);

// Authentication middleware
const authenticate = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Registration endpoint
app.post('/api/register', 
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email, password } = req.body;
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({ email, password: hashedPassword });
      await user.save();

      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
});

// Login endpoint
app.post('/api/login', 
  body('email').isEmail().normalizeEmail(),
  body('password').exists(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.json({ token });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
});

// Save impact analysis endpoint
app.post('/api/save-impact', authenticate, async (req, res) => {
  try {
    const { financialImpact, reputationImpact, operationalImpact, downtimeHours, costPerHour } = req.body;
    
    const downtimeCost = downtimeHours * costPerHour;
    const totalImpact = financialImpact + (reputationImpact * 1000) + (operationalImpact * 500) + downtimeCost;

    const impactAnalysis = new ImpactAnalysis({
      userId: req.userId,
      financialImpact,
      reputationImpact,
      operationalImpact,
      downtimeHours,
      costPerHour,
      totalImpact
    });

    await impactAnalysis.save();
    res.status(201).json({ message: 'Impact analysis saved successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Save vulnerability endpoint
app.post('/api/save-vulnerability', authenticate, async (req, res) => {
  try {
    const { processName, likelihood, impact } = req.body;
    const vulnerabilityScore = likelihood * impact;

    const vulnerability = new Vulnerability({
      userId: req.userId,
      processName,
      likelihood,
      impact,
      vulnerabilityScore
    });

    await vulnerability.save();
    res.status(201).json({ message: 'Vulnerability saved successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Save recovery data endpoint
app.post('/api/save-recovery', authenticate, async (req, res) => {
  try {
    const { expectedRTO, actualRTO, expectedRPO, actualRPO } = req.body;
    
    const rtoGap = actualRTO - expectedRTO;
    const rpoGap = actualRPO - expectedRPO;

    const recovery = new Recovery({
      userId: req.userId,
      expectedRTO,
      actualRTO,
      rtoGap,
      expectedRPO,
      actualRPO,
      rpoGap
    });

    await recovery.save();
    res.status(201).json({ message: 'Recovery data saved successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get vulnerability rankings endpoint
app.get('/api/get-rankings', authenticate, async (req, res) => {
  try {
    const vulnerabilities = await Vulnerability.find({ userId: req.userId })
      .sort({ vulnerabilityScore: -1 })
      .limit(10);
    res.json({ vulnerabilities });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Export findings endpoint
app.get('/api/export-findings', authenticate, async (req, res) => {
  try {
    const impactAnalysis = await ImpactAnalysis.find({ userId: req.userId });
    const vulnerabilities = await Vulnerability.find({ userId: req.userId });
    const recovery = await Recovery.find({ userId: req.userId });

    const findings = {
      impactAnalysis,
      vulnerabilities,
      recovery
    };

    res.json(findings);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
