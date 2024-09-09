import { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'

export function authenticateToken(handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (token == null) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    try {
      const user = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
      ;(req as any).user = user
      return handler(req, res)
    } catch (error) {
      return res.status(403).json({ message: 'Forbidden' })
    }
  }
}
