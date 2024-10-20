// models/ImpactAnalysis.js
import mongoose from 'mongoose';

const ImpactAnalysisSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  businessProcess: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessProcess', required: true },
  processName: { type: String, required: true },
  clientFacingAvailability: String,
  additionalAvailability: String,
  criticalityRating: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
  lossOfRevenue: { type: Number, required: true },
  lossOfProductivity: { type: Number, required: true },
  increasedOperatingCosts: { type: Number, required: true },
  financialPenalties: { type: Number, required: true },
  impactOnCustomers: { type: String, required: true },
  impactOnStaff: { type: String, required: true },
  impactOnPartners: { type: String, required: true },
  complianceImpact: { type: String, required: true },
  healthSafetyRisk: { type: String, required: true },
  revenueScore: { type: Number, required: true },
  productivityScore: { type: Number, required: true },
  operatingCostsScore: { type: Number, required: true },
  financialPenaltiesScore: { type: Number, required: true },
  customersScore: { type: Number, required: true },
  staffScore: { type: Number, required: true },
  partnersScore: { type: Number, required: true },
  complianceScore: { type: Number, required: true },
  healthSafetyScore: { type: Number, required: true },
  totalCostOfDowntime: { type: Number, required: true },
  totalImpactScore: { type: Number, required: true },
  overallScore: { type: Number, required: true },
  criticalityTier: { type: String, required: true },
}, { timestamps: true });

export default mongoose.models.ImpactAnalysis || mongoose.model('ImpactAnalysis', ImpactAnalysisSchema);
