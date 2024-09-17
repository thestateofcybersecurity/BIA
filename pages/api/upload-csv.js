// pages/api/upload-csv.js
import { useAuth0 } from '@auth0/auth0-react';
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
const { user, getAccessTokenSilently } = useAuth0();

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
