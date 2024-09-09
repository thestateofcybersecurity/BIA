import { NextApiRequest, NextApiResponse } from 'next'
import { connectToDatabase } from '@/utils/database'
import { Recovery } from '@/models/Recovery'
import { authenticateToken } from '@/utils/auth'

export default authenticateToken(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    await connectToDatabase()

    const { expectedRTO, actualRTO, expectedRPO, actualRPO } = req.body
    const userId = req.user.userId

    const rtoGap = Number(actualRTO) - Number(expectedRTO)
    const rpoGap = Number(actualRPO) - Number(expectedRPO)

    const recovery = new Recovery({
      userId,
      expectedRTO,
      actualRTO,
      rtoGap,
      expectedRPO,
      actualRPO,
      rpoGap
    })

    await recovery.save()

    res.status(201).json({ message: 'Recovery objectives saved successfully', rtoGap, rpoGap })
  } catch (error) {
    console.error('Save recovery objectives error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})
