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
    doc.addPage()
      .fontSize(16).text('1. Introduction and Scope', { underline: true }).moveDown();
    
    doc.fontSize(12)
      .text('A business continuity plan (BCP) is a collection of documents and information that outlines how an organization will recover from a business disruption. This document is a summary of our organization’s BCP components, from analysis to recovery procedures.', { align: 'justify' })
      .moveDown();
    
    doc.text('Specifically, this document is organized into the following categories:', { align: 'justify' }).moveDown();
    
    // Bullet points for the categories
    doc.font('Helvetica-Bold')
      .text('• Business continuity requirements:', { continued: true }).font('Helvetica')
      .text(' This includes a summary of business processes, business impact analysis (BIA), and risk assessment.', { align: 'justify' }).moveDown();
    
    // Sub-bullets for Business Continuity Implementation
    doc.font('Helvetica-Bold').text('• Business continuity implementation:', { continued: true }).font('Helvetica')
      .text(' This includes a summary of:', { align: 'justify' }).moveDown();
    
    // Indented sub-items
    const subItems = [
      'Alternate business locations',
      'IT resiliency and disaster recovery',
      'Incident response procedures',
      'Communications during a disaster',
      'BC awareness and training'
    ];
    subItems.forEach(item => {
      doc.text(`o ${item}`, { indent: 20 });
    });
    
    doc.moveDown();
    
    // Last bullet point
    doc.font('Helvetica-Bold').text('• Testing and maintenance:', { continued: true }).font('Helvetica')
      .text(' This includes a summary of our BCP testing and maintenance strategy.', { align: 'justify' }).moveDown();
    
    // --- New Scope Section 1.2 ---
    doc.moveDown().fontSize(16).text('1.2 Scope', { underline: true }).moveDown();
    
    doc.fontSize(12).text('Our BCP establishes the procedures for recovering from an incident that significantly disrupts business processes and requires the use of alternate people, processes (or process inputs, including suppliers), technology, and/or facilities.', { align: 'justify' }).moveDown();
    
    doc.text('Business disruptions can be caused by a range of incidents, from isolated issues (e.g. flu epidemic impacts key staff in a specific department, or specific key IT system issues) to more destructive events such as a fire or power outage that impacts a business facility. Depending on the nature of the event, recovery can include leveraging one or more of the following:', { align: 'justify' }).moveDown();
    
    // Bullet points for scope
    doc.font('Helvetica-Bold')
      .text('• Alternatives for individual dependencies:', { continued: true }).font('Helvetica')
      .text(' (e.g. alternate staff for key roles).', { align: 'justify' }).moveDown();
    doc.font('Helvetica-Bold')
      .text('• Interim/workaround processes:', { continued: true }).font('Helvetica')
      .text(' (e.g. if email is down, relying on other means of communication).', { align: 'justify' }).moveDown();
    doc.font('Helvetica-Bold')
      .text('• Alternate facilities:', { continued: true }).font('Helvetica')
      .text(' (e.g. if a business location is damaged or is inaccessible).', { align: 'justify' }).moveDown();
    doc.font('Helvetica-Bold')
      .text('• IT disaster recovery planning:', { continued: true }).font('Helvetica')
      .text(' to resume IT services (e.g. if the issue is a data center or enterprise application failure), combined with invoking business process workarounds while normal IT services are unavailable.', { align: 'justify' }).moveDown();
    
    // Subsection 1.2.1 In-scope
    doc.fontSize(14).text('1.2.1 In-scope', { underline: true }).moveDown();
    doc.fontSize(12).text('This BCP applies to our corporate headquarters and warehouse operations in Newark, NJ.', { align: 'justify' }).moveDown();
    doc.fontSize(12).text('Note: Although some of the content in this plan also applies to our other locations, a separate BCP is being created for each location to provide additional detail for their specific requirements, workarounds, and alternate-facility options.', { align: 'justify' }).moveDown();
    
    // Subsection 1.2.2 Out-of-scope
    doc.fontSize(14).text('1.2.2 Out-of-scope', { underline: true }).moveDown();
    doc.fontSize(12).text('The following is out of scope:', { align: 'justify' }).moveDown();
    
    // Bullet points for out-of-scope
    doc.font('Helvetica-Bold')
      .text('• Recovery of other business locations:', { continued: true }).font('Helvetica')
      .text(' as noted above, a separate BCP is being created for branch offices.', { align: 'justify' }).moveDown();
    doc.font('Helvetica-Bold')
      .text('• IT disaster recovery:', { continued: true }).font('Helvetica')
      .text(' this will be captured in a separate disaster recovery plan (DRP).', { align: 'justify' }).moveDown();
    doc.font('Helvetica-Bold')
      .text('• Emergency response planning:', { continued: true }).font('Helvetica')
      .text(' such as evacuation procedures in the event of a fire (this will be captured in a separate crisis management plan (CMP)).', { align: 'justify' }).moveDown();

    // Section 2: Business Continuity Requirements
    doc.addPage()
      .fontSize(16).text('2. Business Continuity Requirements', { underline: true }).moveDown();
    
    // Section 2.1 Business Processes and Dependencies
    doc.fontSize(14).text('2.1 Business Processes and Dependencies').moveDown();
    
    // Loop through business processes and display their details
    data.businessProcesses.forEach(process => {
      doc.fontSize(12).font('Helvetica-Bold').text(`Process Name: ${process.processName}`);
      doc.font('Helvetica').text(`Owner: ${process.owner}`);
      doc.text(`Dependencies: ${process.dependencies.join(', ')}`);  // Assuming dependencies are listed as an array
      doc.moveDown();
    });
    
    // Section 2.2 Business Impact Analysis (BIA)
    doc.addPage().fontSize(14).text('2.2 Business Impact Analysis (BIA)').moveDown();
    
    doc.fontSize(12).text('A BIA has been completed to determine the criticality, recovery time objectives (RTOs), and recovery point objectives (RPOs) for business processes. The BIA has been reviewed and approved by the executive team.').moveDown();
    
    doc.text('This section provides a summary of the BIA results. See the BCP – Reference Workbook for the location of the full BIA.').moveDown();
    
    // Section 2.2.1 Impact of Downtime Criteria
    doc.fontSize(14).text('2.2.1 Impact of Downtime Criteria').moveDown();
    
    // Financial Impact
    doc.font('Helvetica-Bold').text('2.2.1.1 Financial Impact').moveDown();
    doc.font('Helvetica').text('• Loss of revenue: Based on average daily total revenue.');
    doc.text('• Loss of productivity: Based on average daily total salary (salary was used as a proxy for measuring productivity).');
    doc.text('• Increased operating costs: Based on costs such as overtime and increased operational requirements (e.g., to shift warehouse functions to another location).');
    doc.text('• Financial penalties: Based on penalties stated in contractual agreements that might be incurred as a result of a business disruption.').moveDown();
    
    // Goodwill Impact
    doc.font('Helvetica-Bold').text('2.2.1.2 Goodwill Impact').moveDown();
    doc.font('Helvetica').text('• Impact on customers: Based on the number of customers impacted (e.g., delays in service) and the resulting reputational damage.');
    doc.text('• Impact on internal staff: Based on the number of staff impacted (e.g., frustration at the need to use workarounds or delays in getting their work done).');
    doc.text('• Impact on business partners: Based on the number of business partners impacted (e.g., frustration at the need to use other services, unable to get data in a timely manner, and other delays in their business operations).').moveDown();
    
    // Compliance Impact
    doc.font('Helvetica-Bold').text('2.2.1.3 Compliance Impact').moveDown();
    doc.font('Helvetica').text('• Impact on legal/regulatory compliance: Based on the potential failure to meet compliance requirements due to a business disruption.').moveDown();
    
    // Section 2.2.2 Tier 1, 2, and 3 Business Processes
    doc.addPage().fontSize(14).text('2.2.2 Tier 1, 2, and 3 Business Processes').moveDown();
    
    doc.text('The BIA was used to prioritize business processes into three tiers, where tier 1 is the highest priority. Below is a summary list of tier 1, 2, and 3 business processes.').moveDown();
    
    // Section 2.2.2.1 Tier 1 (Mission Critical)
    doc.font('Helvetica-Bold').text('2.2.2.1 Tier 1 (Mission Critical)').moveDown();
    
    // Filter and display Tier 1 business processes
    data.businessProcesses.filter(process => process.tier === 1).forEach(process => {
      doc.font('Helvetica-Bold').text(`• ${process.processName} (${process.department})`).moveDown();
    });
    
    // Section 2.2.2.2 Tier 2
    doc.font('Helvetica-Bold').text('2.2.2.2 Tier 2').moveDown();
    
    // Filter and display Tier 2 business processes
    data.businessProcesses.filter(process => process.tier === 2).forEach(process => {
      doc.font('Helvetica-Bold').text(`• ${process.processName} (${process.department})`).moveDown();
    });
    
    // Section 2.2.2.3 Tier 3
    doc.font('Helvetica-Bold').text('2.2.2.3 Tier 3').moveDown();
    
    // Filter and display Tier 3 business processes
    data.businessProcesses.filter(process => process.tier === 3).forEach(process => {
      doc.font('Helvetica-Bold').text(`• ${process.processName} (${process.department})`).moveDown();
    });
    
    // End of Section 2
    doc.moveDown();

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
    doc.addPage()
      .fontSize(16).text('3. RTO and RPO Summary for Tier 1, 2, and 3 Business Processes', { underline: true }).moveDown();
    
    // Section 3.1 RTO and RPO Definitions
    doc.fontSize(14).text('3.1 RTO and RPO Definitions').moveDown();
    doc.fontSize(12).text('• A recovery time objective (RTO) is the objective for the maximum amount of time to resume business processes following an outage.', { align: 'justify' }).moveDown();
    doc.text('• A recovery point objective (RPO) is the objective for the maximum amount of data loss due to an outage (e.g., if it’s necessary to restore from backups or activate standby systems).', { align: 'justify' }).moveDown();
    
    // Section 3.2 Acceptable vs. Currently Achievable RTOs/RPOs
    doc.fontSize(14).text('3.2 Acceptable vs. Currently Achievable RTOs/RPOs').moveDown();
    doc.fontSize(12).text('• Acceptable RTOs/RPOs do not mean ideal (i.e., zero downtime and zero data loss), but rather what stakeholders have determined are appropriate and acceptable targets based on criticality.', { align: 'justify' }).moveDown();
    doc.text('• Current achievable RTOs/RPOs indicate the recovery times that we can commit to, based on current capabilities.', { align: 'justify' }).moveDown();
    
    // Section 3.3 RTO/RPO Summary for Business Process Recovery
    doc.fontSize(14).text('3.3 RTO/RPO Summary for Business Process Recovery').moveDown();
    doc.text('Note: These RTO/RPO values are based on business process recovery with acceptable levels of functionality. This can include running business processes with acceptable alternatives such as alternate facilities, alternate personnel, alternate technology (e.g., DR site), and alternate process inputs.', { align: 'justify' }).moveDown();
    
    // Create a table for RTO and RPO summary for Tier 1, 2, and 3
    doc.fontSize(12).text('RTO and RPO Summary Table').moveDown();
    createRtoRpoTable(doc, [
      { tier: 'Tier 1', acceptableRto: '4:00', acceptableRpo: '1:00', currentRto: '8:00', currentRpo: '1:00' },
      { tier: 'Tier 2', acceptableRto: '24:00', acceptableRpo: '4:00', currentRto: '24:00', currentRpo: '24:00' },
      { tier: 'Tier 3', acceptableRto: '48:00', acceptableRpo: '24:00', currentRto: '48:00', currentRpo: '24:00' }
    ]);
    
    // Function to create RTO/RPO table
    function createRtoRpoTable(doc, rows) {
      const tableTop = doc.y;
      const itemSpacing = 25;
      const columnSpacing = 120;
    
      doc.font('Helvetica-Bold');
      // Table headers
      doc.text('Business Process Tier', 50, tableTop);
      doc.text('Acceptable RTO (hh:mm)', 200, tableTop);
      doc.text('Acceptable RPO (hh:mm)', 320, tableTop);
      doc.text('Current Achievable RTO (hh:mm)', 440, tableTop);
      doc.text('Current Achievable RPO (hh:mm)', 580, tableTop);
    
      doc.font('Helvetica');
      rows.forEach((row, i) => {
        const y = tableTop + itemSpacing + i * itemSpacing;
        doc.text(row.tier, 50, y);
        doc.text(row.acceptableRto, 200, y);
        doc.text(row.acceptableRpo, 320, y);
        doc.text(row.currentRto, 440, y);
        doc.text(row.currentRpo, 580, y);
      });
    }
    
    // Section footer
    doc.moveDown();

    // Section 4: Risk Assessment
    doc.addPage()
      .fontSize(16).text('4. Risk Assessment', { underline: true }).moveDown();
    
    // Introduction to Risk Assessment
    doc.fontSize(12).text('Our corporate headquarters is located in an area that could be subjected to weather-related hazards (e.g., snowstorms and floods) that result in facility closures. In addition, we recognize that business disruptions can be caused by a wide range of incidents from hardware/software failures to key staff unavailability.', { align: 'justify' }).moveDown();
    
    // Mitigation Strategies
    doc.text('To mitigate the risk of business disruptions, we have done the following:', { align: 'justify' }).moveDown();
    
    // Bullet Points for Risk Mitigation Measures
    doc.font('Helvetica-Bold')
      .text('• Identified alternate staff for key roles:', { continued: true }).font('Helvetica')
      .text(' In addition, business processes are fully documented, enabling our organization to expand the pool of staff who can take on key roles if needed.', { align: 'justify' }).moveDown();
    
    doc.font('Helvetica-Bold')
      .text('• Identified alternate business locations and assets:', { continued: true }).font('Helvetica')
      .text(' Workstations, office equipment, and other resources that would be required to resume business processes within acceptable RTOs.', { align: 'justify' }).moveDown();
    
    doc.font('Helvetica-Bold')
      .text('• Documented workarounds for business processes:', { continued: true }).font('Helvetica')
      .text(' For example, procedures to shift warehouse operations from Newark to Trenton if necessary.', { align: 'justify' }).moveDown();
    
    doc.font('Helvetica-Bold')
      .text('• Implemented an IT disaster recovery solution:', { continued: true }).font('Helvetica')
      .text(' This includes redundancy at our primary data center to mitigate isolated hardware/software failures and minimize downtime due to IT issues. The Trenton location will serve as a geographically remote recovery option with a test/dev data center that can be brought online if needed.', { align: 'justify' }).moveDown();
    
    // End of Risk Assessment Section
    doc.moveDown();

    // Section 5: Alternate Business Locations
    doc.addPage()
      .fontSize(16).text('5. Alternate Business Locations', { underline: true }).moveDown();
    
    // Section 5.1 Summary of Primary and Alternate Business Locations
    doc.fontSize(14).text('5.1 Summary of Primary and Alternate Business Locations (i.e., BC sites)').moveDown();
    
    // Add some introductory text
    doc.fontSize(12).text('Below is the summary of our primary business locations and their corresponding alternate locations or work-from-home options:').moveDown();
    
    // Create a table with primary and alternate locations
    createLocationTable(doc, [
      { primary: 'Location 1', alternate: 'Location 2', workFromHome: 'TBD' },
      { primary: 'Location 1', alternate: 'Location 2', workFromHome: 'TBD' },
      { primary: 'Location 1', alternate: 'Location 2', workFromHome: 'TBD' }
    ]);
    
    // Function to create the table for locations
    function createLocationTable(doc, rows) {
      const tableTop = doc.y;
      const itemSpacing = 25;
      const columnSpacing = 180;
    
      // Table headers
      doc.font('Helvetica-Bold');
      doc.text('Primary Location', 50, tableTop);
      doc.text('BC Site (Alternate Facility)', 200, tableTop);
      doc.text('Work-from-home', 400, tableTop);
    
      doc.font('Helvetica');
      rows.forEach((row, i) => {
        const y = tableTop + itemSpacing + i * itemSpacing;
        doc.text(row.primary, 50, y);
        doc.text(row.alternate, 200, y);
        doc.text(row.workFromHome, 400, y);
      });
    }
    
    // Add spacing at the end of the section
    doc.moveDown();

    // Section 6: IT Resiliency and Disaster Recovery
    doc.addPage()
      .fontSize(16).text('6. IT Resiliency and Disaster Recovery', { underline: true }).moveDown();
    
    // Introduction
    doc.fontSize(12).text('Below is a summary of IT resiliency and recovery capabilities. For more details, refer to our Disaster Recovery Plan (DRP).').moveDown();
    
    // Section 6.1 Primary Data Center and DR Site Locations
    doc.fontSize(14).text('6.1 Primary Data Center and DR Site Locations').moveDown();
    
    // Create a table for data center and DR site locations
    createDataCenterTable(doc, [
      { production: 'Location 1', drSite: 'Location 2' }
    ]);
    
    // Function to create a table for Data Centers and DR Sites
    function createDataCenterTable(doc, rows) {
      const tableTop = doc.y;
      const itemSpacing = 25;
      const columnSpacing = 180;
    
      // Table headers
      doc.font('Helvetica-Bold');
      doc.text('Production Data Centers', 50, tableTop);
      doc.text('DR Site', 250, tableTop);
    
      doc.font('Helvetica');
      rows.forEach((row, i) => {
        const y = tableTop + itemSpacing + i * itemSpacing;
        doc.text(row.production, 50, y);
        doc.text(row.drSite, 250, y);
      });
    }
    
    // Section 6.2 Network
    doc.moveDown().fontSize(14).text('6.2 Network').moveDown();
    
    // Bullet points for network details
    doc.font('Helvetica')
      .text('• Redundant links with multiple carriers.', { align: 'justify' })
      .text('• Full self-healing mesh network.', { align: 'justify' })
      .text('• VPN appliance at corporate headquarters and branch offices.', { align: 'justify' }).moveDown();
    
    // Section 6.3 Phone Systems
    doc.fontSize(14).text('6.3 Phone Systems').moveDown();
    
    // Bullet points for phone systems details
    doc.font('Helvetica')
      .text('• Phone system is split between Newark and Trenton.', { align: 'justify' })
      .text('• Phone circuits are configured to overflow to Trenton in the event that the circuits in Newark are offline.', { align: 'justify' })
      .text('• Trenton phone system will continue to operate if Newark is offline.', { align: 'justify' }).moveDown();
    
    // Section 6.4 Facility Cooling, Temperature, and Humidity Sensors
    doc.fontSize(14).text('6.4 Facility Cooling, Temperature, and Humidity Sensors').moveDown();
    
    // Bullet points for facility cooling details
    doc.font('Helvetica')
      .text('• Temperature and humidity sensors will alert the alarm monitoring company.', { align: 'justify' })
      .text('• Cooling system is a dual-loop, two-stage system with dual compressors for redundancy.', { align: 'justify' }).moveDown();
    
    // Section 6.5 Facility Physical Security
    doc.fontSize(14).text('6.5 Facility Physical Security').moveDown();
    
    // Bullet points for physical security details
    doc.font('Helvetica')
      .text('• Security cameras installed throughout the facility.', { align: 'justify' })
      .text('• Doors are controlled via automation and keycard access.', { align: 'justify' }).moveDown();
    
    // Add spacing at the end of the section
    doc.moveDown();

    // Section 7: Incident Response Procedures
    doc.addPage()
      .fontSize(16).text('7. Incident Response Procedures', { underline: true }).moveDown();
    
    // Introduction to Incident Response Procedures
    doc.fontSize(12).text('If a disaster occurs, and there is a health and safety risk (e.g., the disaster is a fire), the first priority is to ensure that all employees are safe. After this, recovery consists of the following steps:', { align: 'justify' }).moveDown();
    
    // Bullet points for the steps in recovery
    doc.font('Helvetica')
      .text('• Notification, assessment, and disaster declaration', { align: 'justify' })
      .text('• Business recovery procedures', { align: 'justify' }).moveDown();
    
    // Section 7.1 Notification, Assessment, and Disaster Declaration
    doc.fontSize(14).text('7.1 Notification, Assessment, and Disaster Declaration').moveDown();
    
    // Paragraph introducing the notification process
    doc.fontSize(12).text('The Crisis Management Team (CMT) is notified of potential business disruptions, and they in turn will coordinate assessment and whether to declare a disaster.', { align: 'justify' }).moveDown();
    
    // Bullet points for decision-making process
    doc.font('Helvetica-Bold').text('The decision to declare a disaster and invoke the BCP will be based on:', { align: 'justify' }).moveDown();
    
    doc.font('Helvetica')
      .text('• Expected duration based on damage assessment and whether that exceeds the RTO.', { align: 'justify' })
      .text('• An evaluation of the time required to execute business recovery procedures vs. waiting for the issue to be resolved (e.g., if the assessment has determined the issue will be resolved within an hour, invoking workarounds may be more disruptive than helpful).', { align: 'justify' })
      .text('• Business impact (e.g., are tier 1 business processes impacted?).', { align: 'justify' }).moveDown();
    
    doc.text('The high-level plan is outlined in the BCP – Recovery Workflow document (see the excerpt below) and details are captured in the BCP – Notification Assessment Declaration Plan.', { align: 'justify' }).moveDown();
    
    // Section 7.2 Business Recovery Procedures
    doc.fontSize(14).text('7.2 Business Recovery Procedures').moveDown();
    
    // Introductory paragraph for Business Recovery Procedures
    doc.fontSize(12).text('Business recovery procedures consist of:', { align: 'justify' }).moveDown();
    
    // Bullet points for business recovery workflows and workarounds
    doc.font('Helvetica')
      .text('• Recovery Workflows that outline recovery workflows and timelines for tier 1, 2, and 3 business processes.', { align: 'justify' })
      .text('• Workarounds and recovery checklists for each department that provides additional instructions.', { align: 'justify' })
      .text('• Supporting documentation that includes roles and contact information (e.g., the BCP – Reference Workbook).', { align: 'justify' }).moveDown();
    
    // Reference to the BCP – Reference Workbook
    doc.fontSize(12).text('Refer to the BCP – Reference Workbook for a list of all relevant documentation: [Insert Link]', { align: 'justify' }).moveDown();
    
    // End of Section 7
    doc.moveDown();

    // Section 8: Communications During a Disaster
    doc.addPage()
      .fontSize(16).text('8. Communications During a Disaster', { underline: true }).moveDown();
    
    doc.fontSize(12).text('Communications are executed as follows:', { align: 'justify' }).moveDown();
    
    // Bullet points for communications
    doc.font('Helvetica')
      .text('• As part of the initial notification process outlined above, the CMT Leader notifies the CMT and other staff as needed.', { align: 'justify' })
      .text('• Communication is conducted by cell phone if the phone system is down. All managers and members of recovery teams maintain contact information for other managers and team members on their business phones and have access to a formal contact list as a backup if required.', { align: 'justify' }).moveDown();
    
    // Add spacing at the end of the section
    doc.moveDown();  
  
    // Section 9: BC Awareness and Training
    doc.addPage()
      .fontSize(16).text('9. BC Awareness and Training', { underline: true }).moveDown();
    
    doc.fontSize(12).text('The BCM Team is responsible for supervising and ensuring that all crisis management, disaster recovery, and business recovery team members are aware of the BCP and trained to execute the relevant BC procedures. BC awareness and training includes:', { align: 'justify' }).moveDown();
    
    // Bullet points for BC Awareness and Training
    doc.font('Helvetica')
      .text('• Annual review of roles and responsibilities.', { align: 'justify' })
      .text('• Annual review of BCP documentation.', { align: 'justify' })
      .text('• Introduction to the above content during new employee onboarding procedures.', { align: 'justify' })
      .text('• A series of BCP tests each year (see “BCP Testing”).', { align: 'justify' }).moveDown();
    
    // Section 9.1 Roles and Responsibilities
    doc.fontSize(14).text('9.1 Roles and Responsibilities').moveDown();
    
    doc.fontSize(12).text('The roles and responsibilities for all crisis management, disaster recovery, and business recovery team members are outlined in the BCP – Reference Workbook, reviewed as part of an annual BCP review, and reviewed as part of BCP testing. The following is a summary of what is outlined for each team member:', { align: 'justify' }).moveDown();
    
    // Bullet points for roles and responsibilities
    doc.font('Helvetica')
      .text('• Specific role (e.g., Crisis Management Team Leader).', { align: 'justify' })
      .text('• Alternates for each role.', { align: 'justify' })
      .text('• Specific responsibilities.', { align: 'justify' })
      .text('• Authority to declare a disaster.', { align: 'justify' }).moveDown();

    // Add spacing at the end of the section
    doc.moveDown();
    
    // Section 10: Testing and Maintenance
    doc.addPage()
      .fontSize(16).text('10. Testing and Maintenance', { underline: true }).moveDown();
    
    doc.fontSize(12).text('A structured program is outlined to review, maintain, and optimize the BCP through:', { align: 'justify' }).moveDown();
    
    // Bullet points for testing and maintenance
    doc.font('Helvetica')
      .text('• BCP testing.', { align: 'justify' })
      .text('• Documentation management (including formal reviews).', { align: 'justify' })
      .text('• Change management.', { align: 'justify' }).moveDown();
    
    // Section 10.1 BCP Testing
    doc.fontSize(14).text('10.1 BCP Testing').moveDown();
    
    doc.fontSize(12).text('Our annual testing program includes:', { align: 'justify' }).moveDown();
    
    // Bullet points for BCP testing
    doc.font('Helvetica')
      .text('• Tabletop planning exercises in Q1 and Q2. This enables the crisis management, disaster recovery, and business recovery teams to ensure procedures are current and resolve issues before more functional testing in Q3 and Q4.', { align: 'justify' })
      .text('• Simulation testing in Q3 and Q4. This includes:', { align: 'justify' }).moveDown();
    
    // Sub-bullets for simulation testing
    doc.text('o Select staff work from one of the designated alternate locations to verify processes can be executed as expected.', { indent: 20 })
      .text('o The CMT uses cell phones to remotely notify relevant staff in a simulated disaster scenario to validate communications and an understanding of next steps.', { indent: 20 }).moveDown();
    
    doc.fontSize(12).text('Each test includes a record of issues found and action items to resolve those issues before the next test. This drives ongoing awareness, accuracy, and successful follow-up testing.', { align: 'justify' }).moveDown();
    
    // Section 10.2 BCP Documentation Management
    doc.fontSize(14).text('10.2 BCP Documentation Management').moveDown();
    
    doc.fontSize(12).text('The BCM Team will supervise documentation creation, management, and review to ensure consistency and accuracy. BCP documentation is maintained in the following locations:', { align: 'justify' }).moveDown();
    
    // Bullet points for documentation locations
    doc.font('Helvetica')
      .text('• Primary BCP Repository: [Insert Link]', { align: 'justify' })
      .text('• Alternate Copy (if Primary BCP Repository can’t be accessed): Stored on the smartphones of the CMT members and all business unit managers (an updated copy is downloaded monthly, coordinated by the CMT Leader).', { align: 'justify' }).moveDown();
    
    // Section 10.3 BCP Change Management
    doc.fontSize(14).text('10.3 BCP Change Management').moveDown();
    
    doc.fontSize(12).text('The BCM Team manages the processes to ensure change management. Business continuity considerations are incorporated into our change management process to ensure that changes in the business and technology environment are consistently reflected in our BCP. This includes the following process points:', { align: 'justify' }).moveDown();
    
    // Bullet points for change management
    doc.font('Helvetica')
      .text('• Asset management records are updated as assets are added or decommissioned. Asset management records are audited annually.', { align: 'justify' })
      .text('• New IT projects include an outline of BC requirements (RTOs/RPOs, impact of downtime, technical requirements, etc.).', { align: 'justify' })
      .text('• Change management for business operations includes a summary of how the change affects business impact and RTOs/RPOs.', { align: 'justify' }).moveDown();
    
    // Section 10.3.2 BCP Annual Review
    doc.fontSize(14).text('10.3.2 BCP Annual Review').moveDown();
    
    doc.fontSize(12).text('BCP documentation is reviewed annually to:', { align: 'justify' }).moveDown();
    
    // Bullet points for annual review
    doc.font('Helvetica')
      .text('• Validate that required updates identified through testing and change management have been incorporated in the BCP.', { align: 'justify' })
      .text('• Provide a focused review of elements of the BCP that have undergone significant change.', { align: 'justify' }).moveDown();

    // Add spacing at the end of the section
    doc.moveDown();
  
    // Section 11: Summary
    doc.addPage()
      .fontSize(16).text('11. Summary', { underline: true }).moveDown();
    
    doc.fontSize(12).text('Service continuity, and therefore our BCP, is a high priority for our organization. Our organization is committed to maintaining an effective BCP that includes:', { align: 'justify' }).moveDown();
    
    // Bullet points for summary
    doc.font('Helvetica')
      .text('• Clearly defined BC requirements through a business impact analysis.', { align: 'justify' })
      .text('• Ongoing evaluation of our BC strategy and BC capabilities to reduce RTO and RPO values where they exceed acceptable values.', { align: 'justify' })
      .text('• Rigorous BC change management practices to ensure our BCP stays current.', { align: 'justify' }).moveDown();

    // Add spacing at the end of the section
    doc.moveDown();
     
    // Finalize the PDF
    doc.end();
  });

// Helper function to add sections
function addSection(doc, title, content) {
  doc.addPage().fontSize(16).text(title, { underline: true }).moveDown();
  doc.fontSize(12).text(content).moveDown();
}

// Capitalizes the first letter of a word
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
