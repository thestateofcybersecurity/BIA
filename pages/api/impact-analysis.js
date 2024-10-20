// pages/api/impact-analysis.js
import { getSession } from '@auth0/nextjs-auth0';
import connectDB from '../../config/database';
import ImpactAnalysis from '../../models/ImpactAnalysis';
import BusinessProcess from '../../models/BusinessProcess';

export default async function handler(req, res) {
  const session = await getSession(req, res);
  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  await connectDB();

  if (req.method === 'POST') {
    if (req.query.bulkUpload) {
      try {
        const { data } = req.body;
        const uploadedAnalyses = [];
        const errors = [];

        for (const row of data) {
          try {
            const businessProcess = await BusinessProcess.findOne({
              processName: row.processName,
              userId: session.user.sub,
            });

            if (!businessProcess) {
              errors.push(`Business process not found for: ${row.processName}`);
              continue;
            }

            const impactAnalysis = new ImpactAnalysis({
              ...row,
              userId: session.user.sub,
              businessProcess: businessProcess._id,
            });

            await impactAnalysis.save();
            uploadedAnalyses.push(impactAnalysis);

            await BusinessProcess.findByIdAndUpdate(businessProcess._id, {
              impactAnalysisCompleted: true,
              impactAnalysis: impactAnalysis._id,
            });
          } catch (error) {
            errors.push(`Error processing ${row.processName}: ${error.message}`);
          }
        }

        res.status(201).json({ 
          uploadedCount: uploadedAnalyses.length,
          errors: errors.length > 0 ? errors : undefined
        });
      } catch (error) {
        console.error('Error bulk uploading impact analyses:', error);
        res.status(400).json({ error: error.message });
      }
    } else {
      try {
        const { businessProcessId, ...impactData } = req.body;
        const impactAnalysis = new ImpactAnalysis({
          ...impactData,
          userId: session.user.sub,
          businessProcess: businessProcessId
        });
        await impactAnalysis.save();

        await BusinessProcess.findByIdAndUpdate(businessProcessId, { 
          impactAnalysisCompleted: true,
          impactAnalysis: impactAnalysis._id
        });

        res.status(201).json(impactAnalysis);
      } catch (error) {
        console.error('Error creating impact analysis:', error);
        res.status(400).json({ error: error.message });
      }
    }
  } else if (req.method === 'GET') {
    try {
      const { completed } = req.query;
      let query = { userId: session.user.sub };
      if (completed === 'true') {
        query.impactAnalysisCompleted = true;
      }
      const analyses = await ImpactAnalysis.find(query).populate('businessProcess');
      res.status(200).json(analyses);
    } catch (error) {
      console.error('Error fetching impact analyses:', error);
      res.status(400).json({ error: error.message });
    }
  } else if (req.method === 'PUT') {
    try {
      const { id } = req.query;
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
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
