import { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'

interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    userId: string
  }
}

export function authenticateToken(handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>) {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (token == null) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    try {
      const user = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
      req.user = user
      return handler(req, res)
    } catch (error) {
      return res.status(403).json({ message: 'Forbidden' })
    }
  }
}
