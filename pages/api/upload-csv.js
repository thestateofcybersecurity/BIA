// pages/api/upload-csv.js
import { getSession } from '@auth0/nextjs-auth0';
import connectDB from '../../config/database';
import BusinessProcess from '../../models/BusinessProcess';
import multer from 'multer';
import { parse } from 'csv-parse';

export const config = {
  api: {
    bodyParser: false,
  },
};

const upload = multer({ storage: multer.memoryStorage() });

export default async function handler(req, res) {
  try {
    const session = await getSession(req, res);
    if (!session) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    await connectDB();

    upload.single('csv')(req, res, async (err) => {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({ error: 'Error uploading file: ' + err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const csvData = req.file.buffer.toString();

      parse(csvData, {
        columns: true,
        skip_empty_lines: true
      }, async (error, records) => {
        if (error) {
          console.error('CSV parsing error:', error);
          return res.status(400).json({ error: 'Error parsing CSV: ' + error.message });
        }

        try {
          const processes = records.map(record => ({
            userId: session.user.sub,
            processName: record.processName,
            description: record.description,
            owner: record.owner,
            dependencies: {
              people: record.people ? record.people.split(',').map(item => item.trim()) : [],
              itApplications: record.itApplications ? record.itApplications.split(',').map(item => item.trim()) : [],
              devices: record.devices ? record.devices.split(',').map(item => item.trim()) : [],
              facilityLocation: record.facilityLocation ? record.facilityLocation.split(',').map(item => item.trim()) : [],
              suppliers: record.suppliers ? record.suppliers.split(',').map(item => item.trim()) : []
            }
          }));

          await BusinessProcess.insertMany(processes);
          res.status(200).json({ message: 'CSV processed successfully' });
        } catch (error) {
          console.error('Error saving processes:', error);
          res.status(400).json({ error: 'Error saving processes from CSV: ' + error.message });
        }
      });
    });
  } catch (error) {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'An unexpected error occurred: ' + error.message });
  }
}
