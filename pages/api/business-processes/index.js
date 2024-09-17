// pages/api/business-processes/index.js
import { getSession } from '@auth0/nextjs-auth0';
import dbConnect from '../../../lib/dbConnect';
import BusinessProcess from '../../../models/BusinessProcess';

export default async function handler(req, res) {
  const session = await getSession(req, res);
  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  await dbConnect();

  switch (req.method) {
    case 'GET':
      try {
        const processes = await BusinessProcess.find({ userId: session.user.sub });
        res.status(200).json(processes);
      } catch (error) {
        res.status(400).json({ error: 'Error fetching business processes' });
      }
      break;
    
    case 'POST':
      try {
        const process = new BusinessProcess({
          ...req.body,
          userId: session.user.sub
        });
        await process.save();
        res.status(201).json(process);
      } catch (error) {
        res.status(400).json({ error: 'Error creating business process' });
      }
      break;

    default:
      res.status(405).json({ error: 'Method not allowed' });
  }
}
