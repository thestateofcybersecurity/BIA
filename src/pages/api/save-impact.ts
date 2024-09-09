import { NextApiRequest, NextApiResponse } from 'next'
import { connectToDatabase } from '@/utils/database'
import { ImpactAnalysis } from '@/models/ImpactAnalysis'
import { authenticateToken } from '@/utils/auth'

export default authenticateToken(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    await connectToDatabase()

    const { financialImpact, reputationImpact, operationalImpact, downtimeHours, costPerHour } = req.body
    const userId = req.user.userId

    const downtimeCost = Number(downtimeHours) * Number(costPerHour)
    const totalImpact = Number(financialImpact) + (Number(reputationImpact) * 1000) + (Number(operationalImpact) * 500) + downtimeCost

    const impactAnalysis = new ImpactAnalysis({
      userId,
      financialImpact,
      reputationImpact,
      operationalImpact,
      downtimeHours,
      costPerHour,
      totalImpact
    })

    await impactAnalysis.save()

    res.status(201).json({ message: 'Impact analysis saved successfully', totalImpact })
  } catch (error) {
    console.error('Save impact error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})
