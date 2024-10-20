// pages/api/generate-bcp.js
import { getSession } from '@auth0/nextjs-auth0';
import { generateBCPPDF } from '../../services/pdfGenerationService';

export default async function handler(req, res) {
  const session = await getSession(req, res);
  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (req.method === 'GET') {
    try {
      // Fetch BCP data
      const bcpDataResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/bcp-data`, {
        headers: {
          Cookie: req.headers.cookie // Forward the session cookie
        }
      });
      const bcpData = await bcpDataResponse.json();

      // Generate PDF
      const pdfBuffer = await generateBCPPDF(bcpData);

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=BusinessContinuityPlan.pdf');

      // Send the PDF
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating BCP:', error);
      res.status(500).json({ error: 'Error generating BCP' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
