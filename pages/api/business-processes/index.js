// pages/api/business-processes/index.js
import { getSession } from '@auth0/nextjs-auth0';
import connectDB from '../../../config/database';
import BusinessProcess from '../../../models/BusinessProcess';

import { getSession } from '@auth0/nextjs-auth0';
  await connectDB();

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
