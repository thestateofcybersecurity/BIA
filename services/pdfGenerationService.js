// services/pdfGenerationService.js
import PDFDocument from 'pdfkit';

export async function generateBCPPDF(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      let pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });

    // Add content to the PDF
    doc.fontSize(18).text('Business Continuity Plan', { align: 'center' });
    doc.moveDown();

    // Document Information
    doc.fontSize(14).text('Document Information');
    doc.moveDown();
    doc.fontSize(12).text(`Version #: 1.0`);
    doc.text(`Version Date: ${new Date().toLocaleDateString()}`);
    doc.moveDown();

    // Business Processes
    doc.fontSize(14).text('Business Processes and Dependencies');
    doc.moveDown();
    data.businessProcesses.forEach(process => {
      doc.fontSize(12).text(`Process Name: ${process.processName}`);
      doc.text(`Owner: ${process.owner}`);
      doc.text(`Dependencies: ${JSON.stringify(process.dependencies)}`);
      doc.moveDown();
    });

    // Impact Analyses
    doc.addPage();
    doc.fontSize(14).text('Business Impact Analysis (BIA)');
    doc.moveDown();
    data.impactAnalyses.forEach(analysis => {
      doc.fontSize(12).text(`Process: ${analysis.processName}`);
      doc.text(`Criticality Rating: ${analysis.criticalityRating}`);
      doc.text(`Overall Score: ${analysis.overallScore}`);
      doc.moveDown();
    });

    // RTO/RPO Analysis
    doc.addPage();
    doc.fontSize(14).text('RTO and RPO Summary');
    doc.moveDown();
    data.rtoRpoAnalyses.forEach(analysis => {
      doc.fontSize(12).text(`Process: ${analysis.processName}`);
      doc.text(`RTO: ${analysis.rto}`);
      doc.text(`RPO: ${analysis.rpo}`);
      doc.moveDown();
    });

    // Recovery Workflows
    doc.addPage();
    doc.fontSize(14).text('Business Recovery Procedures');
    doc.moveDown();
    data.recoveryWorkflows.forEach(workflow => {
      doc.fontSize(12).text(`Process: ${workflow.processName}`);
      doc.text(`Recovery Steps: ${workflow.recoverySteps}`);
      doc.moveDown();
    });

    // Maturity Scorecard
    if (data.maturityScorecard) {
      doc.addPage();
      doc.fontSize(14).text('BC Maturity Assessment');
      doc.moveDown();
      doc.fontSize(12).text(`Overall Maturity Score: ${data.maturityScorecard.overallMaturityScore}`);
      // Add more details from the maturity scorecard as needed
    }

    doc.end();
  });
}
