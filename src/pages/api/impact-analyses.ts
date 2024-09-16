import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '@/utils/database';
import { ImpactAnalysis } from '@/models/ImpactAnalysis';
import { authenticateToken } from '@/utils/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  await connectToDatabase();

  if (req.method === 'GET') {
    try {
      const analyses = await ImpactAnalysis.find();
      res.status(200).json(analyses);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching impact analyses' });
    }
  } else if (req.method === 'POST') {
    try {
      const newAnalysis = new ImpactAnalysis(req.body);
      await newAnalysis.save();
      res.status(201).json(newAnalysis);
    } catch (error) {
      res.status(500).json({ message: 'Error creating impact analysis' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { id } = req.query;
      const updatedAnalysis = await ImpactAnalysis.findByIdAndUpdate(id, req.body, { new: true });
      if (updatedAnalysis) {
        res.status(200).json(updatedAnalysis);
      } else {
        res.status(404).json({ message: 'Impact analysis not found' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error updating impact analysis' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}

export default authenticateToken(handler);
