import { NextApiRequest, NextApiResponse } from 'next'
import { connectToDatabase } from '@/utils/database'
import { Process } from '@/models/Process'
import { authenticateToken } from '@/utils/auth'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  await connectToDatabase()

  if (req.method === 'GET') {
    try {
      const processes = await Process.find().sort({ id: 1 })
      res.status(200).json(processes)
    } catch (error) {
      res.status(500).json({ message: 'Error fetching processes' })
    }
  } else if (req.method === 'POST') {
    try {
      const newProcess = new Process(req.body)
      await newProcess.save()
      res.status(201).json(newProcess)
    } catch (error) {
      res.status(500).json({ message: 'Error creating process' })
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' })
  }
}

export default authenticateToken(handler)
