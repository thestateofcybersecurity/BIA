// pages/api/bcp-data.js
import { getSession } from '@auth0/nextjs-auth0';
import connectDB from '../../config/database';
import BusinessProcess from '../../models/BusinessProcess';
import ImpactAnalysis from '../../models/ImpactAnalysis';
import RecoveryWorkflow from '../../models/RecoveryWorkflow';
import RTORPOAnalysis from '../../models/RTORPOAnalysis';
import MaturityScorecard from '../../models/MaturityScorecard';

export default async function handler(req, res) {
  const session = await getSession(req, res);
  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  await connectDB();

  if (req.method === 'GET') {
    try {
      const businessProcesses = await BusinessProcess.find({ userId: session.user.sub });
      const impactAnalyses = await ImpactAnalysis.find({ userId: session.user.sub });
      const recoveryWorkflows = await RecoveryWorkflow.find({ userId: session.user.sub });
      const rtoRpoAnalyses = await RTORPOAnalysis.find({ userId: session.user.sub });
      const maturityScorecard = await MaturityScorecard.findOne({ userId: session.user.sub });

      res.status(200).json({
        businessProcesses,
        impactAnalyses,
        recoveryWorkflows,
        rtoRpoAnalyses,
        maturityScorecard
      });
    } catch (error) {
      console.error('Error fetching BCP data:', error);
      res.status(500).json({ error: 'Error fetching BCP data' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
