import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '@/utils/database';
import { ScoringCriteria } from '@/models/ScoringCriteria';
import { authenticateToken } from '@/utils/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  await connectToDatabase();

  if (req.method === 'GET') {
    try {
      const criteria = await ScoringCriteria.find().sort({ score: 1 });
      res.status(200).json(criteria);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching scoring criteria' });
    }
  } else if (req.method === 'POST') {
    try {
      await ScoringCriteria.deleteMany({}); // Clear existing criteria
      await ScoringCriteria.insertMany(req.body);
      res.status(201).json({ message: 'Scoring criteria updated successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error updating scoring criteria' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}

export default authenticateToken(handler);
