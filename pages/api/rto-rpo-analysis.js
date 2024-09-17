// pages/api/rto-rpo-analysis.js
import { getSession } from '@auth0/nextjs-auth0';
import connectDB from '../../config/database';
import RTORPOAnalysis from '../../models/RTORPOAnalysis';
import BusinessProcess from '../../models/BusinessProcess';

export default async function handler(req, res) {
  const session = await getSession(req, res);
  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  await connectDB();

  switch (req.method) {
    case 'GET':
      try {
        const analyses = await RTORPOAnalysis.find({ userId: session.user.sub }).populate('businessProcessId');
        res.status(200).json(analyses);
      } catch (error) {
        res.status(400).json({ error: 'Error fetching RTO/RPO analyses' });
      }
      break;

    case 'POST':
      try {
        const { businessProcessId, type, metric, acceptableTime, achievableTime } = req.body;

        // Check if an analysis already exists for this process, type, and metric
        let analysis = await RTORPOAnalysis.findOne({
          userId: session.user.sub,
          businessProcessId,
          type,
          metric
        });

        if (analysis) {
          // Update existing analysis
          analysis.acceptableTime = acceptableTime;
          analysis.achievableTime = achievableTime;
        } else {
          // Create new analysis
          analysis = new RTORPOAnalysis({
            userId: session.user.sub,
            businessProcessId,
            type,
            metric,
            acceptableTime,
            achievableTime
          });
        }

        await analysis.save();

        res.status(201).json(analysis);
      } catch (error) {
        res.status(400).json({ error: 'Error saving RTO/RPO analysis' });
      }
      break;

    default:
      res.status(405).json({ error: 'Method not allowed' });
  }
}
