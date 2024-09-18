// models/MaturityScorecard.js
import mongoose from 'mongoose';

const MaturityScorecardSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  processDocumentation: { type: String, required: true },
  testingFrequency: { type: String, required: true },
  incidentResponse: { type: String, required: true },
  complianceReadiness: { type: String, required: true },
  teamTraining: { type: String, required: true },
  overallMaturityScore: { type: Number },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.models.MaturityScorecard || mongoose.model('MaturityScorecard', MaturityScorecardSchema);
