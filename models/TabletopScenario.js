// models/TabletopScenario.js
import mongoose from 'mongoose';

const TabletopScenarioSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  attackVector: String,
  businessImpact: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.models.TabletopScenario || mongoose.model('TabletopScenario', TabletopScenarioSchema);
