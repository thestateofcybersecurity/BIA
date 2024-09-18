import mongoose from 'mongoose';

const RecoveryWorkflowSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  businessProcessId: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessProcess', required: true },
  recoverySteps: [{
    stepNumber: Number,
    description: String,
    responsibleTeam: String,
    dependencies: {
      people: [String],
      itApplications: [String],
      devices: [String],
      facilities: [String],
      suppliers: [String]
    },
    alternateStaff: [String],
    estimatedCompletionTime: Number,
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.models.RecoveryWorkflow || mongoose.model('RecoveryWorkflow', RecoveryWorkflowSchema);
