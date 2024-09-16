import mongoose from 'mongoose';

const RTORPOAnalysisSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  process: { type: String, required: true },
  type: { type: String, enum: ['recovery', 'repatriation'], required: true },
  metric: { type: String, enum: ['rto', 'rpo'], required: true },
  acceptable: Number,
  achievable: Number,
  gap: Number,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.models.RTORPOAnalysis || mongoose.model('RTORPOAnalysis', RTORPOAnalysisSchema);
