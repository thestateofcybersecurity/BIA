// pages/api/generate-bcp.js
import { getSession } from '@auth0/nextjs-auth0';
import { generateBCPPDF } from '../../services/pdfGenerationService';
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
      // Fetch BCP data
      const businessProcesses = await BusinessProcess.find({ userId: session.user.sub });
      const impactAnalyses = await ImpactAnalysis.find({ userId: session.user.sub });
      const recoveryWorkflows = await RecoveryWorkflow.find({ userId: session.user.sub });
      const rtoRpoAnalyses = await RTORPOAnalysis.find({ userId: session.user.sub });
      const maturityScorecard = await MaturityScorecard.findOne({ userId: session.user.sub });

      const bcpData = {
        businessProcesses,
        impactAnalyses,
        recoveryWorkflows,
        rtoRpoAnalyses,
        maturityScorecard
      };

      // Generate PDF
      const pdfBuffer = await generateBCPPDF(bcpData);

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=BusinessContinuityPlan.pdf');

      // Send the PDF
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating BCP:', error);
      res.status(500).json({ error: 'Error generating BCP' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
