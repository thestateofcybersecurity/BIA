import { NextApiResponse } from 'next'
import { connectToDatabase } from '@/utils/database'
import { ImpactAnalysis } from '@/models/ImpactAnalysis'
import { Vulnerability } from '@/models/Vulnerability'
import { Recovery } from '@/models/Recovery'
import { authenticateToken } from '@/utils/auth'

interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    userId: string
  }
}

export default authenticateToken(async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    await connectToDatabase()

    const userId = req.user?.userId

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const impactAnalysis = await ImpactAnalysis.find({ userId }).sort({ createdAt: -1 }).limit(1)
    const vulnerabilities = await Vulnerability.find({ userId }).sort({ vulnerabilityScore: -1 })
    const recovery = await Recovery.find({ userId }).sort({ createdAt: -1 }).limit(1)

    const findings = {
      impactAnalysis,
      vulnerabilities,
      recovery
    }

    res.status(200).json(findings)
  } catch (error) {
    console.error('Export findings error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})
