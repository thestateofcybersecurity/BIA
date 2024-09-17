// pages/api/business-processes/impact-analysis-status.js
import { useAuth0 } from '@auth0/auth0-react';
import connectDB from '../../../config/database';
import BusinessProcess from '../../../models/BusinessProcess';

export default async function handler(req, res) {
const { user, getAccessTokenSilently } = useAuth0();

  await connectDB();

  try {
    const processes = await BusinessProcess.find({ userId: session.user.sub });
    const allCompleted = processes.every(process => process.impactAnalysisCompleted);
    res.status(200).json({ allCompleted });
  } catch (error) {
    res.status(400).json({ error: 'Error checking impact analysis status' });
  }
}
