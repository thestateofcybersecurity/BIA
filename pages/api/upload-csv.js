// pages/api/upload-csv.js
import { getSession } from '@auth0/nextjs-auth0';
import dbConnect from '../../lib/dbConnect';
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
  const session = await getSession(req, res);
  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  await dbConnect();

  upload.single('csv')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: 'Error uploading file' });
    }

    const csvData = req.file.buffer.toString();

    parse(csvData, {
      columns: true,
      skip_empty_lines: true
    }, async (error, records) => {
      if (error) {
        return res.status(400).json({ error: 'Error parsing CSV' });
      }

      try {
        const processes = records.map(record => ({
          userId: session.user.sub,
          processName: record.processName,
          description: record.description,
          owner: record.owner,
          dependencies: {
            people: record.people,
            itApplications: record.itApplications,
            devices: record.devices,
            facilityLocation: record.facilityLocation,
            suppliers: record.suppliers
          }
        }));

        await BusinessProcess.insertMany(processes);
        res.status(200).json({ message: 'CSV processed successfully' });
      } catch (error) {
        res.status(400).json({ error: 'Error saving processes from CSV' });
      }
    });
  });
}
