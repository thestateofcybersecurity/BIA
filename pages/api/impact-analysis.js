// pages/api/impact-analysis.js
import connectDB from '../../config/database';
import { useAuth0 } from '@auth0/auth0-react';
import ImpactAnalysis from '../../models/ImpactAnalysis';
import BusinessProcess from '../../models/BusinessProcess';

export default async function handler(req, res) {
const { user, getAccessTokenSilently } = useAuth0();

  await connectDB();

  switch (req.method) {
    case 'POST':
      try {
        const { businessProcessId, ...impactData } = req.body;
        const impactAnalysis = new ImpactAnalysis({
          ...impactData,
          userId: session.user.sub,
          businessProcessId
        });
        await impactAnalysis.save();

        // Update the business process to mark impact analysis as completed
        await BusinessProcess.findByIdAndUpdate(businessProcessId, { impactAnalysisCompleted: true });

        res.status(201).json(impactAnalysis);
      } catch (error) {
        res.status(400).json({ error: 'Error creating impact analysis' });
      }
      break;

    case 'GET':
      try {
        const analyses = await ImpactAnalysis.find({ userId: session.user.sub }).populate('businessProcessId');
        res.status(200).json(analyses);
      } catch (error) {
        res.status(400).json({ error: 'Error fetching impact analyses' });
      }
      break;

    default:
      res.status(405).json({ error: 'Method not allowed' });
  }
}
