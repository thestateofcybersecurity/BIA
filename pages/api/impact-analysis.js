import connectDB from '../../config/database';
import ImpactAnalysis from '../../models/ImpactAnalysis';
import { getSession } from '@auth0/nextjs-auth0';

export default async function handler(req, res) {
  const { user } = await getSession(req, res);

  await dbConnect();

  switch (req.method) {
    case 'POST':
      try {
        const impactAnalysis = await ImpactAnalysis.create({
          userId: user.sub,
          ...req.body
        });
        res.status(201).json({ success: true, data: impactAnalysis });
      } catch (error) {
        res.status(400).json({ success: false });
      }
      break;
    case 'GET':
      try {
        const impactAnalyses = await ImpactAnalysis.find({ userId: user.sub });
        res.status(200).json({ success: true, data: impactAnalyses });
      } catch (error) {
        res.status(400).json({ success: false });
      }
      break;
    default:
      res.status(400).json({ success: false });
      break;
  }
}
