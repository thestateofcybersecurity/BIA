import mongoose from 'mongoose'

const ScoringCriteriaSchema = new mongoose.Schema({
  score: { type: Number, required: true },
  levelOfImpact: { type: String, required: true },
  lossOfRevenue: { type: Number, required: true },
  lossOfProductivity: { type: Number, required: true },
  increasedOperatingCosts: { type: Number, required: true },
  financialPenalties: { type: Number, required: true },
  impactOnCustomers: { type: String, required: true },
  impactOnInternalStaff: { type: String, required: true },
  impactOnBusinessPartners: { type: String, required: true },
  compliance: { type: String, required: true },
  healthOrSafetyRisk: { type: String, required: true },
  likelihoodOfIncident: { type: String, required: true },
  impactOfIncident: { type: String, required: true },
})

export const ScoringCriteria = mongoose.models.ScoringCriteria || mongoose.model('ScoringCriteria', ScoringCriteriaSchema)
