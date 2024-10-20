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

    // Document Information and Title
    doc.fontSize(20).text('Business Continuity Plan', { align: 'center' }).moveDown();
    doc.fontSize(14).text('Version #: 1.0', { align: 'right' });
    doc.text(`Version Date: ${moment().format('MMMM Do YYYY')}`, { align: 'right' });
    doc.moveDown();

    // Table of Contents
    doc.addPage();
    doc.fontSize(16).text('Table of Contents', { underline: true });
    doc.fontSize(12)
      .text('1. Introduction and Scope', { indent: 20 })
      .text('2. Business Continuity Requirements', { indent: 20 })
      .text('3. RTO and RPO Summary', { indent: 20 })
      .text('4. Risk Assessment', { indent: 20 })
      .text('5. Alternate Business Locations', { indent: 20 })
      .text('6. IT Resiliency and Disaster Recovery', { indent: 20 })
      .text('7. Incident Response Procedures', { indent: 20 })
      .text('8. Communications During a Disaster', { indent: 20 })
      .text('9. BC Awareness and Training', { indent: 20 })
      .text('10. Testing and Maintenance', { indent: 20 })
      .text('11. Summary', { indent: 20 });

    // Section 1: Introduction and Scope
    doc.addPage();
    doc.fontSize(16).text('1. Introduction and Scope', { underline: true });
    doc.fontSize(12).text('This document outlines our Business Continuity Plan (BCP), ensuring recovery from business disruptions...');
    // Insert other introduction and scope content...
    doc.moveDown();

    // Section 2: Business Continuity Requirements
    doc.fontSize(16).text('2. Business Continuity Requirements', { underline: true }).moveDown();
    doc.fontSize(14).text('2.1 Business Processes and Dependencies').moveDown();
    data.businessProcesses.forEach(process => {
      doc.fontSize(12).text(`Process Name: ${process.processName}`);
      doc.text(`Owner: ${process.owner}`);
      doc.text(`Dependencies: ${JSON.stringify(process.dependencies, null, 2)}`);
      doc.moveDown();
    });

    // Section 3: RTO and RPO Summary
    doc.addPage();
    doc.fontSize(16).text('3. RTO and RPO Summary', { underline: true }).moveDown();
    doc.fontSize(14).text('3.1 RTO and RPO for Critical Business Processes').moveDown();
    data.rtoRpoAnalyses.forEach(analysis => {
      doc.fontSize(12).text(`Process: ${analysis.processName}`);
      doc.text(`RTO: ${analysis.rto} | RPO: ${analysis.rpo}`);
      doc.moveDown();
    });

    // Section 4: Risk Assessment
    doc.addPage();
    doc.fontSize(16).text('4. Risk Assessment', { underline: true }).moveDown();
    doc.fontSize(12).text('Details on the risk assessment based on geographic, personnel, and technological risks...').moveDown();

    // Section 5: Alternate Business Locations
    doc.addPage();
    doc.fontSize(16).text('5. Alternate Business Locations', { underline: true }).moveDown();
    doc.fontSize(12).text('Primary: Location A, Secondary: Location B').moveDown();

    // Section 6: IT Resiliency and Disaster Recovery
    doc.addPage();
    doc.fontSize(16).text('6. IT Resiliency and Disaster Recovery', { underline: true }).moveDown();
    doc.fontSize(12).text('Details on IT Resiliency...').moveDown();

    // Section 7: Incident Response Procedures
    doc.addPage();
    doc.fontSize(16).text('7. Incident Response Procedures', { underline: true }).moveDown();
    doc.fontSize(12).text('The incident response team is responsible for...').moveDown();

    // Section 8: Communications During a Disaster
    doc.addPage();
    doc.fontSize(16).text('8. Communications During a Disaster', { underline: true }).moveDown();
    doc.fontSize(12).text('Communication protocols during a disaster include phone systems and email backups...').moveDown();

    // Section 9: BC Awareness and Training
    doc.addPage();
    doc.fontSize(16).text('9. BC Awareness and Training', { underline: true }).moveDown();
    doc.fontSize(12).text('Details on training for the business continuity team...').moveDown();

    // Section 10: Testing and Maintenance
    doc.addPage();
    doc.fontSize(16).text('10. Testing and Maintenance', { underline: true }).moveDown();
    doc.fontSize(12).text('Annual review and testing procedures...').moveDown();

    // Section 11: Summary
    doc.addPage();
    doc.fontSize(16).text('11. Summary', { underline: true }).moveDown();
    doc.fontSize(12).text('Our Business Continuity Plan aims to ensure...').moveDown();

    // Finalize the PDF document
    doc.end();
  });
}
