import mongoose from 'mongoose'

const ProcessSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  processFunction: { type: String, required: true },
  description: String,
  processOwner: String,
  peoplePrimary: String,
  peopleAlternatives: String,
  itPrimary: String,
  itAlternatives: String,
  devicesPrimary: String,
  devicesAlternatives: String,
  facilityPrimary: String,
  facilityAlternatives: String,
  suppliersPrimary: String,
  suppliersAlternatives: String,
  additionalPrimary: String,
  additionalAlternatives: String,
})

export const Process = mongoose.models.Process || mongoose.model('Process', ProcessSchema)
