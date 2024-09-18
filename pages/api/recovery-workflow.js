// pages/api/recovery-workflow.js
import { getSession } from '@auth0/nextjs-auth0';
import connectDB from '../../config/database';
import RecoveryWorkflow from '../../models/RecoveryWorkflow';
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
        const { businessProcessId, ...workflowData } = req.body;
        const recoveryWorkflow = new RecoveryWorkflow({
          ...workflowData,
          userId: session.user.sub,
          businessProcessId
        });
        await recoveryWorkflow.save();

        await BusinessProcess.findByIdAndUpdate(businessProcessId, {
          recoveryWorkflow: recoveryWorkflow._id
        });

        res.status(201).json({ success: true, data: recoveryWorkflow });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
      break;

    case 'GET':
      try {
        const { businessProcessId } = req.query;
        const workflow = await RecoveryWorkflow.findOne({ businessProcessId, userId: session.user.sub });
        res.status(200).json({ success: true, data: workflow });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
      break;

    default:
      res.status(405).json({ success: false, error: 'Method not allowed' });
      break;
  }
}
