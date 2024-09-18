// pages/api/business-process.js
import { getSession } from '@auth0/nextjs-auth0';
import connectDB from '../../config/database';
import BusinessProcess from '../../models/BusinessProcess';

export default async function handler(req, res) {
  const session = await getSession(req, res);
  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  await connectDB();

  switch (req.method) {
    case 'POST':
      try {
        const businessProcess = new BusinessProcess({
          ...req.body,
          userId: session.user.sub
        });
        await businessProcess.save();
        res.status(201).json({ success: true, data: businessProcess });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
      break;

    case 'GET':
      try {
        const businessProcesses = await BusinessProcess.find({ userId: session.user.sub });
        res.status(200).json({ success: true, data: businessProcesses });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
      break;

    case 'PUT':
      try {
        const { id } = req.query;
        const updatedProcess = await BusinessProcess.findByIdAndUpdate(
          id,
          { ...req.body, updatedAt: Date.now() },
          { new: true, runValidators: true }
        );
        if (!updatedProcess) {
          return res.status(404).json({ success: false, error: 'Business process not found' });
        }
        res.status(200).json({ success: true, data: updatedProcess });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
      break;

    default:
      res.status(405).json({ success: false, error: 'Method not allowed' });
      break;
  }
}
