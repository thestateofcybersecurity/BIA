import mongoose from 'mongoose';

const BusinessProcessSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  processName: { type: String, required: true },
  description: String,
  owner: String,
  dependencies: {
    people: String,
    itApplications: String,
    devices: String,
    facilityLocation: String,
    suppliers: String
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.models.BusinessProcess || mongoose.model('BusinessProcess', BusinessProcessSchema);
