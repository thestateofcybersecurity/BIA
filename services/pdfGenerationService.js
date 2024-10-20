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
    doc.fontSize(20).text('Business Continuity Plan', { align: 'center' }).moveDown();
    doc.fontSize(14).text('Version #: 1.0', { align: 'right' });
    doc.text(`Version Date: ${moment().format('MMMM Do YYYY')}`, { align: 'right' });
    doc.moveDown(2);

    // Table of Contents
    doc.fontSize(16).text('Table of Contents', { underline: true }).moveDown();
    const tocItems = [
      '1. Introduction and Scope', '2. Business Continuity Requirements',
      '3. RTO and RPO Summary', '4. Risk Assessment', '5. Alternate Business Locations',
      '6. IT Resiliency and Disaster Recovery', '7. Incident Response Procedures',
      '8. Communications During a Disaster', '9. BC Awareness and Training',
      '10. Testing and Maintenance', '11. Summary'
    ];
    tocItems.forEach((item, index) => doc.fontSize(12).text(`${item}`, { indent: 20 }));

    // Section 1: Introduction and Scope
    doc.addPage().fontSize(16).text('1. Introduction and Scope', { underline: true }).moveDown();
    doc.fontSize(12).text('This document outlines our Business Continuity Plan (BCP), ensuring recovery from business disruptions...');
    doc.moveDown();

    // Section 2: Business Continuity Requirements
    doc.fontSize(16).text('2. Business Continuity Requirements', { underline: true }).moveDown();
    doc.fontSize(14).text('2.1 Business Processes and Dependencies').moveDown();

    // Process Data Loop
    data.businessProcesses.forEach(process => {
      doc.fontSize(12).font('Helvetica-Bold').text(`Process Name: ${process.processName}`);
      doc.font('Helvetica').text(`Owner: ${process.owner}`);

      // Dependencies (Formatted in Human Readable way)
      const dependencyTypes = ['people', 'itApplications', 'devices', 'facilityLocation', 'suppliers'];
      dependencyTypes.forEach(type => {
        if (process.dependencies[type] && process.dependencies[type].length > 0) {
          doc.font('Helvetica-Bold').text(`${capitalizeFirstLetter(type)}:`);
          process.dependencies[type].forEach(item => {
            doc.font('Helvetica').text(`- ${item}`, { indent: 20 });
          });
        }
      });
      doc.moveDown();
    });

    // Section 3: RTO and RPO Summary
    doc.addPage().fontSize(16).text('3. RTO and RPO Summary', { underline: true }).moveDown();
    doc.fontSize(14).text('3.1 RTO and RPO for Critical Business Processes').moveDown();
    data.rtoRpoAnalyses.forEach(analysis => {
      doc.fontSize(12).font('Helvetica-Bold').text(`Process: ${analysis.processName}`);
      doc.font('Helvetica').text(`RTO: ${analysis.rto} | RPO: ${analysis.rpo}`).moveDown();
    });

    // Section 4: Risk Assessment
    doc.addPage().fontSize(16).text('4. Risk Assessment', { underline: true }).moveDown();
    doc.fontSize(12).text('Details on the risk assessment based on geographic, personnel, and technological risks...').moveDown();

    // Additional Sections (Follow similar formatting as above)
    addSection(doc, '5. Alternate Business Locations', 'Primary: Location A, Secondary: Location B');
    addSection(doc, '6. IT Resiliency and Disaster Recovery', 'Details on IT Resiliency...');
    addSection(doc, '7. Incident Response Procedures', 'The incident response team is responsible for...');
    addSection(doc, '8. Communications During a Disaster', 'Communication protocols during a disaster...');
    addSection(doc, '9. BC Awareness and Training', 'Details on training for the business continuity team...');
    addSection(doc, '10. Testing and Maintenance', 'Annual review and testing procedures...');
    addSection(doc, '11. Summary', 'Our Business Continuity Plan aims to ensure...');

    // Finalize the PDF
    doc.end();
  });
}

// Helper function to add sections
function addSection(doc, title, content) {
  doc.addPage().fontSize(16).text(title, { underline: true }).moveDown();
  doc.fontSize(12).text(content).moveDown();
}

// Capitalizes the first letter of a word
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
