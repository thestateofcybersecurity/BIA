// services/pdfGenerationService.js
import PDFDocument from 'pdfkit';
import moment from 'moment';

export async function generateBCPPDF(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margins: { top: 50, left: 50, right: 50, bottom: 50 } });
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      let pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });

    // Title and Document Information
    doc.fontSize(18).text('Business Continuity Plan', { align: 'center' }).moveDown();
    doc.fontSize(14).text('Document Information').moveDown();
    doc.fontSize(12).text(`Version #: 1.0`);
    doc.text(`Version Date: ${moment().format('MM/DD/YYYY')}`);
    doc.moveDown();

    // Business Processes
    doc.addPage();
    doc.fontSize(14).text('Business Processes and Dependencies').moveDown();
    data.businessProcesses.forEach(process => {
      doc.fontSize(12).text(`Process Name: ${process.processName}`);
      doc.text(`Owner: ${process.owner}`);
      doc.text(`Dependencies: ${JSON.stringify(process.dependencies)}`);
      doc.moveDown();
    });

    // Business Impact Analysis
    doc.addPage();
    doc.fontSize(14).text('Business Impact Analysis (BIA)').moveDown();
    data.impactAnalyses.forEach(analysis => {
      doc.fontSize(12).text(`Process: ${analysis.processName}`);
      doc.text(`Criticality Rating: ${analysis.criticalityRating}`);
      doc.text(`Overall Score: ${analysis.overallScore}`);
      doc.moveDown();
    });

    // RTO/RPO Analysis
    doc.addPage();
    doc.fontSize(14).text('RTO and RPO Summary').moveDown();
    data.rtoRpoAnalyses.forEach(analysis => {
      doc.fontSize(12).text(`Process: ${analysis.processName}`);
      doc.text(`RTO: ${analysis.rto}`);
      doc.text(`RPO: ${analysis.rpo}`);
      doc.moveDown();
    });

    // Business Recovery Procedures
    doc.addPage();
    doc.fontSize(14).text('Business Recovery Procedures').moveDown();
    data.recoveryWorkflows.forEach(workflow => {
      doc.fontSize(12).text(`Process: ${workflow.processName}`);
      doc.text(`Recovery Steps: ${workflow.recoverySteps}`);
      doc.moveDown();
    });

    // Maturity Scorecard (if available)
    if (data.maturityScorecard) {
      doc.addPage();
      doc.fontSize(14).text('BC Maturity Assessment').moveDown();
      doc.fontSize(12).text(`Overall Maturity Score: ${data.maturityScorecard.overallMaturityScore}`);
    }

    // Close document
    doc.end();
  });
}
