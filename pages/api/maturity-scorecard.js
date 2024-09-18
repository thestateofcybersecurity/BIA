// pages/api/maturity-scorecard.js
import { getSession } from '@auth0/nextjs-auth0';
import connectDB from '../../config/database';
import MaturityScorecard from '../../models/MaturityScorecard';

export default async function handler(req, res) {
  const session = await getSession(req, res);
  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  await connectDB();

  switch (req.method) {
    case 'POST':
      try {
        const scorecard = new MaturityScorecard({
          ...req.body,
          userId: session.user.sub
        });
        await scorecard.save();
        res.status(201).json({ success: true, data: scorecard });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
      break;

    case 'GET':
      try {
        const scorecard = await MaturityScorecard.findOne({ userId: session.user.sub });
        res.status(200).json({ success: true, data: scorecard });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
      break;

    default:
      res.status(405).json({ success: false, error: 'Method not allowed' });
      break;
  }
}
