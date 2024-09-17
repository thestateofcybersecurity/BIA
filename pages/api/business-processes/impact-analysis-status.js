// pages/api/business-processes/impact-analysis-status.js
import { getSession } from '@auth0/nextjs-auth0';
import connectDB from '../../../config/database';
import BusinessProcess from '../../../models/BusinessProcess';

export default async function handler(req, res) {
  const session = await getSession(req, res);
  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  await connectDB();

  try {
    const processes = await BusinessProcess.find({ userId: session.user.sub });
    const allCompleted = processes.every(process => process.impactAnalysisCompleted);
    res.status(200).json({ allCompleted });
  } catch (error) {
    res.status(400).json({ error: 'Error checking impact analysis status' });
  }
}
