import { NextApiRequest, NextApiResponse } from 'next'
import { connectToDatabase } from '@/utils/database'
import { Vulnerability } from '@/models/Vulnerability'
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

    const vulnerabilities = await Vulnerability.find({ userId })
      .sort({ vulnerabilityScore: -1 })
      .limit(10)
      .select('processName vulnerabilityScore -_id')

    res.status(200).json({ vulnerabilities })
  } catch (error) {
    console.error('Get rankings error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})
