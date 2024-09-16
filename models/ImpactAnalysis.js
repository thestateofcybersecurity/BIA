// models/ImpactAnalysis.js
const mongoose = require('mongoose');

const ImpactAnalysisSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  processName: { type: String, required: true },
  clientFacingAvailability: String,
  additionalAvailability: String,
  criticalityRating: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
  costOfDowntime: Number,
  impactOnGoodwill: String,
  impactOnCompliance: String,
  impactOnSafety: String,
  lossOfRevenue: Number,
  lossOfProductivity: Number,
  increasedOperatingCosts: Number,
  financialPenalties: Number,
  impactOnCustomers: String,
  impactOnStaff: String,
  impactOnPartners: String,
  complianceRisks: String,
  healthSafetyRisks: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ImpactAnalysis', ImpactAnalysisSchema);
