// pages/api/business-processes/[id].js
import { useAuth0 } from '@auth0/auth0-react';
import connectDB from '../../../config/database';
import BusinessProcess from '../../../models/BusinessProcess';

export default async function handler(req, res) {
const { user, getAccessTokenSilently } = useAuth0();
  
  const { id } = req.query;
  await connectDB();

  switch (req.method) {
    case 'PUT':
      try {
        const updatedProcess = await BusinessProcess.findOneAndUpdate(
          { _id: id, userId: session.user.sub },
          req.body,
          { new: true, runValidators: true }
        );
        if (!updatedProcess) {
          return res.status(404).json({ error: 'Process not found' });
        }
      res.status(200).json(updatedProcess);
      } catch (error) {
        res.status(400).json({ error: 'Error updating business process' });
      }
      break;

    case 'DELETE':
      try {
        const deletedProcess = await BusinessProcess.findOneAndDelete({ _id: id, userId: session.user.sub });
        if (!deletedProcess) {
          return res.status(404).json({ error: 'Process not found' });
        }
        res.status(200).json({ message: 'Process deleted successfully' });
      } catch (error) {
        res.status(400).json({ error: 'Error deleting business process' });
      }
      break;

    default:
      res.status(405).json({ error: 'Method not allowed' });
  }
}
