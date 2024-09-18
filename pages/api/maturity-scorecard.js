// pages/api/maturity-scorecard.js
import { getSession } from '@auth0/nextjs-auth0';
import connectDB from '../../config/database';
import MaturityScorecard from '../../models/MaturityScorecard';

export default async function handler(req, res) {
  const session = await getSession(req, res);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }

  await connectDB();

  switch (req.method) {
    case 'POST':
      try {
        const existingScorecard = await MaturityScorecard.findOne({ userId: session.user.sub });
        
        if (existingScorecard) {
          // Update existing scorecard
          const updatedScorecard = await MaturityScorecard.findOneAndUpdate(
            { userId: session.user.sub },
            { ...req.body, updatedAt: Date.now() },
            { new: true, runValidators: true }
          );
          res.status(200).json({ success: true, data: updatedScorecard });
        } else {
          // Create new scorecard
          const newScorecard = new MaturityScorecard({
            ...req.body,
            userId: session.user.sub
          });
          await newScorecard.save();
          res.status(201).json({ success: true, data: newScorecard });
        }
      } catch (error) {
        console.error('Error saving maturity scorecard:', error);
        res.status(400).json({ success: false, error: error.message, details: error });
      }
      break;

    case 'GET':
      try {
        const scorecard = await MaturityScorecard.findOne({ userId: session.user.sub });
        if (!scorecard) {
          return res.status(404).json({ success: false, error: 'Scorecard not found' });
        }
        res.status(200).json({ success: true, data: scorecard });
      } catch (error) {
        console.error('Error fetching maturity scorecard:', error);
        res.status(400).json({ success: false, error: error.message });
      }
      break;

    default:
      res.status(405).json({ success: false, error: 'Method not allowed' });
      break;
  }
}
