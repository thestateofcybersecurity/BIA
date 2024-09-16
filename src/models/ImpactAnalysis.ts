import mongoose from 'mongoose'

const ImpactAnalysisSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  financialImpact: {
    type: Number,
    required: true,
  },
  reputationImpact: {
    type: Number,
    required: true,
  },
  operationalImpact: {
    type: Number,
    required: true,
  },
  downtimeHours: {
    type: Number,
    required: true,
  },
  costPerHour: {
    type: Number,
    required: true,
  },
  totalImpact: {
    type: Number,
    required: true,
  },
}, { timestamps: true })

export const ImpactAnalysis = mongoose.models.ImpactAnalysis || mongoose.model('ImpactAnalysis', ImpactAnalysisSchema)
