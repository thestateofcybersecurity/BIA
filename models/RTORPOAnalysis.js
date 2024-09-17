// models/RTORPOAnalysis.js
import mongoose from 'mongoose';

const RTORPOAnalysisSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  businessProcessId: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessProcess', required: true },
  processName: { type: String, required: true },
  type: { type: String, enum: ['recovery', 'repatriation'], required: true },
  metric: { type: String, enum: ['rto', 'rpo'], required: true },
  acceptableTime: { type: Number, required: true },
  achievableTime: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.models.RTORPOAnalysis || mongoose.model('RTORPOAnalysis', RTORPOAnalysisSchema);
