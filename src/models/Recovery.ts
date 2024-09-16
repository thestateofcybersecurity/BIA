import mongoose from 'mongoose'

const RecoverySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  expectedRTO: {
    type: Number,
    required: true,
  },
  actualRTO: {
    type: Number,
    required: true,
  },
  rtoGap: {
    type: Number,
    required: true,
  },
  expectedRPO: {
    type: Number,
    required: true,
  },
  actualRPO: {
    type: Number,
    required: true,
  },
  rpoGap: {
    type: Number,
    required: true,
  },
}, { timestamps: true })

export const Recovery = mongoose.models.Recovery || mongoose.model('Recovery', RecoverySchema)
