// pages/api/impact-analysis/[id].js
import { getSession } from '@auth0/nextjs-auth0';
import connectDB from '../../../config/database';
import ImpactAnalysis from '../../../models/ImpactAnalysis';

export default async function handler(req, res) {
  const session = await getSession(req, res);
  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  await connectDB();

  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      const updatedAnalysis = await ImpactAnalysis.findByIdAndUpdate(
        id,
        { ...req.body, updatedAt: Date.now() },
        { new: true, runValidators: true }
      );
      if (!updatedAnalysis) {
        return res.status(404).json({ error: 'Impact analysis not found' });
      }
      res.status(200).json(updatedAnalysis);
    } catch (error) {
      console.error('Error updating impact analysis:', error);
      res.status(400).json({ error: error.message });
    }
  } else if (req.method === 'GET') {
    try {
      const analysis = await ImpactAnalysis.findById(id);
      if (!analysis) {
        return res.status(404).json({ error: 'Impact analysis not found' });
      }
      res.status(200).json(analysis);
    } catch (error) {
      console.error('Error fetching impact analysis:', error);
      res.status(400).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
