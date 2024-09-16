import { checkJwt } from './auth';
import connectDB from '../../config/database';
import BusinessProcess from '../../models/BusinessProcess';
import ImpactAnalysis from '../../models/ImpactAnalysis';
import RTORPOAnalysis from '../../models/RTORPOAnalysis';

connectDB();

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      await checkJwt(req, res);
      const { path } = req.query;
      let Model;
      switch (path) {
        case 'businessProcess':
          Model = BusinessProcess;
          break;
        case 'impactAnalysis':
          Model = ImpactAnalysis;
          break;
        case 'rto-rpo-analysis':
          Model = RTORPOAnalysis;
          break;
        default:
          return res.status(404).json({ error: 'Invalid path' });
      }
      const newItem = new Model(req.body);
      await newItem.save();
      res.status(201).json(newItem);
    } catch (error) {
      res.status(500).json({ error: 'Error saving data' });
    }
  } else if (req.method === 'GET' && req.query.path === 'rto-rpo-analysis') {
    try {
      await checkJwt(req, res);
      const { userId } = req.query;
      const analysis = await RTORPOAnalysis.find({ userId });
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching RTO/RPO analysis' });
    }
  } else {
    res.setHeader('Allow', ['POST', 'GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
