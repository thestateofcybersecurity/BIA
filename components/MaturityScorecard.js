import React, { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Select,
  VStack,
  Text,
  useToast,
} from '@chakra-ui/react';
import axios from 'axios';

const MaturityScorecard = () => {
  const { user } = useUser();
  const [formData, setFormData] = useState({
    bcpScope: '',
    businessOperations: '',
    dependencies: '',
    alternativesForDependencies: '',
    legalAndRegulatoryRequirements: '',
    internalStakeholders: '',
    externalStakeholders: '',
    organizationalObjectives: '',
    biaProcess: '',
    biaConducted: '',
    rtosRposDefined: '',
    biaReviewed: '',
    incidentResponsePlans: '',
    recoveryPlanFlexibility: '',
    incidentResponseResources: '',
    interimProcesses: '',
    returnToNormalProcedures: '',
    bcPolicy: '',
    bcPolicyCommunication: '',
    bcmTeam: '',
    reviewMaintenancePlan: '',
    bcmsProjectPlan: '',
    riskManagement: '',
    riskAssessment: '',
    crisisCommunication: '',
    emergencyResponsePlans: '',
    crisisManagementPlans: '',
    crisisTesting: '',
    topManagementParticipation: '',
    bcTesting: '',
    testDocumentation: '',
    testReview: '',
    annualTesting: '',
    changeManagementProcedures: '',
    documentationSecurity: '',
    documentationVersionControl: '',
    externalDocumentationControl: '',
  });

  const [overallMaturityScore, setOverallMaturityScore] = useState(0);
  const toast = useToast();

  useEffect(() => {
    fetchMaturityScorecard();
  }, []);

  const fetchMaturityScorecard = async () => {
    try {
      const response = await axios.get('/api/maturity-scorecard');
      if (response.data.success && response.data.data) {
        setFormData(response.data.data);
        setOverallMaturityScore(response.data.data.overallMaturityScore);
      }
    } catch (error) {
      console.error('Error fetching maturity scorecard:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const calculateMaturityScore = () => {
    const scores = Object.values(formData).map(value => {
      return parseInt(value) || 0; // Convert string input to number and ensure no empty strings affect the score
    });
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const score = calculateMaturityScore();
    try {
      const response = await axios.post('/api/maturity-scorecard', {
        ...formData,
        overallMaturityScore: score,
      });
      if (response.data.success) {
        setOverallMaturityScore(score);
        toast({
          title: 'Success',
          description: 'Maturity scorecard saved successfully.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error saving maturity scorecard:', error);
      toast({
        title: 'Error',
        description: 'Failed to save maturity scorecard.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const scoreOptions = [...Array(11).keys()].map(score => (
    <option value={score} key={score}>{score}</option>
  ));

  return (
    <Box>
      <form onSubmit={handleSubmit}>
        <VStack spacing={4} align="stretch">

          {/* ISO 22301 Clause 4: Define BCP Scope, Objectives, and Stakeholders */}
          <FormControl>
            <FormLabel>BCP Scope</FormLabel>
            <Select name="bcpScope" value={formData.bcpScope} onChange={handleChange}>
              {scoreOptions}
            </Select>
            <Text fontSize="sm">The BCP scope is based on a Business Impact Analysis (BIA) and risk assessment. This should include all business processes and internal/external risks that are within scope and exclusions with justification.</Text>
          </FormControl>

          <FormControl>
            <FormLabel>Business Operations</FormLabel>
            <Select name="businessOperations" value={formData.businessOperations} onChange={handleChange}>
              {scoreOptions}
            </Select>
            <Text fontSize="sm">Document all business operations including products, services, and business processes. Ensure that the core functions are well defined.</Text>
          </FormControl>

          <FormControl>
            <FormLabel>Dependencies</FormLabel>
            <Select name="dependencies" value={formData.dependencies} onChange={handleChange}>
              {scoreOptions}
            </Select>
            <Text fontSize="sm">List all dependencies for business operations, including people, technology, data, facilities, required assets, process inputs, and supply chains.</Text>
          </FormControl>

          <FormControl>
            <FormLabel>Alternatives for Dependencies</FormLabel>
            <Select name="alternativesForDependencies" value={formData.alternativesForDependencies} onChange={handleChange}>
              {scoreOptions}
            </Select>
            <Text fontSize="sm">Document alternatives for all critical dependencies, including secondary sources or redundant systems that can be used during disruptions.</Text>
          </FormControl>

          <FormControl>
            <FormLabel>Legal and Regulatory Requirements</FormLabel>
            <Select name="legalAndRegulatoryRequirements" value={formData.legalAndRegulatoryRequirements} onChange={handleChange}>
              {scoreOptions}
            </Select>
            <Text fontSize="sm">Ensure all legal and regulatory requirements, such as health, safety, and welfare regulations, security regulations (PCI), industry-specific requirements (HIPAA), and general business continuity regulations, are documented.</Text>
          </FormControl>

          <FormControl>
            <FormLabel>Internal Stakeholders</FormLabel>
            <Select name="internalStakeholders" value={formData.internalStakeholders} onChange={handleChange}>
              {scoreOptions}
            </Select>
            <Text fontSize="sm">Document all internal stakeholders involved in BCP, including key departments, teams, and individuals with relevant roles.</Text>
          </FormControl>

          <FormControl>
            <FormLabel>External Stakeholders</FormLabel>
            <Select name="externalStakeholders" value={formData.externalStakeholders} onChange={handleChange}>
              {scoreOptions}
            </Select>
            <Text fontSize="sm">List external stakeholders with vested interest in BCP, such as customers, regulators, suppliers, and distributors.</Text>
          </FormControl>

          <FormControl>
            <FormLabel>Organizational Objectives</FormLabel>
            <Select name="organizationalObjectives" value={formData.organizationalObjectives} onChange={handleChange}>
              {scoreOptions}
            </Select>
            <Text fontSize="sm">Ensure that the organization's objectives, such as business vision, mission statement, and strategic goals, are incorporated into BCP planning.</Text>
          </FormControl>

          {/* ISO 22301 Clause 8: Conduct a BIA to Determine Acceptable RTOs and RPOs */}
          <FormControl>
            <FormLabel>BIA Process</FormLabel>
            <Select name="biaProcess" value={formData.biaProcess} onChange={handleChange}>
              {scoreOptions}
            </Select>
            <Text fontSize="sm">A documented BIA process should assess the impact of disruptions on business operations and prioritize recovery efforts based on acceptable Recovery Time Objectives (RTOs) and Recovery Point Objectives (RPOs).</Text>
          </FormControl>

          <FormControl>
            <FormLabel>BIA Conducted</FormLabel>
            <Select name="biaConducted" value={formData.biaConducted} onChange={handleChange}>
              {scoreOptions}
            </Select>
            <Text fontSize="sm">A comprehensive BIA should be conducted, assessing business processes, dependencies, and potential impacts of disruptions over time (e.g., financial, legal, and reputational).</Text>
          </FormControl>

          <FormControl>
            <FormLabel>RTOs and RPOs Defined</FormLabel>
            <Select name="rtosRposDefined" value={formData.rtosRposDefined} onChange={handleChange}>
              {scoreOptions}
            </Select>
            <Text fontSize="sm">Define RTOs and RPOs for critical business processes based on BIA findings and ensure that they are documented and communicated.</Text>
          </FormControl>

          <FormControl>
            <FormLabel>BIA Reviewed</FormLabel>
            <Select name="biaReviewed" value={formData.biaReviewed} onChange={handleChange}>
              {scoreOptions}
            </Select>
            <Text fontSize="sm">Ensure that BIA results have been reviewed and updated regularly (e.g., at least annually or after significant changes).</Text>
          </FormControl>

          {/* ISO 22301 Clause 8: Create a Recovery Workflow */}
          <FormControl>
            <FormLabel>Incident Response Plans</FormLabel>
            <Select name="incidentResponsePlans" value={formData.incidentResponsePlans} onChange={handleChange}>
              {scoreOptions}
            </Select>
            <Text fontSize="sm">Incident response plans should be documented and include detailed procedures for event detection, notification, crisis communications, and relocating to alternate work sites, if necessary.</Text>
          </FormControl>

          <FormControl>
            <FormLabel>Recovery Plan Flexibility</FormLabel>
            <Select name="recoveryPlanFlexibility" value={formData.recoveryPlanFlexibility} onChange={handleChange}>
              {scoreOptions}
            </Select>
            <Text fontSize="sm">The recovery plans must be flexible to address various incidents within the BCP scope, including IT failures, facility outages, and regional disruptions.</Text>
          </FormControl>

          <FormControl>
            <FormLabel>Incident Response Resources</FormLabel>
            <Select name="incidentResponseResources" value={formData.incidentResponseResources} onChange={handleChange}>
              {scoreOptions}
            </Select>
            <Text fontSize="sm">List all resources required to execute incident response plans, including personnel, data (hard/soft copies), facilities, equipment, transportation, IT systems, and vendors.</Text>
          </FormControl>

          <FormControl>
            <FormLabel>Interim Processes</FormLabel>
            <Select name="interimProcesses" value={formData.interimProcesses} onChange={handleChange}>
              {scoreOptions}
            </Select>
            <Text fontSize="sm">Document interim business processes, including variations or workarounds, to support business resumption plans during disruptions.</Text>
          </FormControl>

          <FormControl>
            <FormLabel>Return to Normal Procedures</FormLabel>
            <Select name="returnToNormalProcedures" value={formData.returnToNormalProcedures} onChange={handleChange}>
              {scoreOptions}
            </Select>
            <Text fontSize="sm">Procedures must be documented to facilitate returning to normal operations after an incident is resolved (e.g., returning to the primary business location).</Text>
          </FormControl>

          {/* ISO 22301 Clause 5: Establish a BCMS */}
          <FormControl>
            <FormLabel>BC Policy</FormLabel>
            <Select name="bcPolicy" value={formData.bcPolicy} onChange={handleChange}>
              {scoreOptions}
            </Select>
            <Text fontSize="sm">A business continuity policy should outline the organization’s commitment to creating, maintaining, and testing the BCP. Ensure it is documented, updated regularly, and communicated to all stakeholders.</Text>
          </FormControl>

          <FormControl>
            <FormLabel>BC Policy Communication</FormLabel>
            <Select name="bcPolicyCommunication" value={formData.bcPolicyCommunication} onChange={handleChange}>
              {scoreOptions}
            </Select>
            <Text fontSize="sm">Ensure that the BC policy has been communicated to all staff, typically via onboarding, intranet pages, or employee handbooks.</Text>
          </FormControl>

          <FormControl>
            <FormLabel>BCM Team</FormLabel>
            <Select name="bcmTeam" value={formData.bcmTeam} onChange={handleChange}>
              {scoreOptions}
            </Select>
            <Text fontSize="sm">A BCM team should be in place with specific roles (executive sponsor, team leader, departmental representatives, etc.) that govern the BCP, IT DR, and crisis management planning.</Text>
          </FormControl>

          <FormControl>
            <FormLabel>Review and Maintenance Plan</FormLabel>
            <Select name="reviewMaintenancePlan" value={formData.reviewMaintenancePlan} onChange={handleChange}>
              {scoreOptions}
            </Select>
            <Text fontSize="sm">The BCMS review and maintenance plan should include schedules for testing and reviewing the BCP, along with responsibilities for completing updates and reporting findings to top management.</Text>
          </FormControl>

          <FormControl>
            <FormLabel>BCMS Project Plan</FormLabel>
            <Select name="bcmsProjectPlan" value={formData.bcmsProjectPlan} onChange={handleChange}>
              {scoreOptions}
            </Select>
            <Text fontSize="sm">Document a BCMS project plan that outlines specific tasks, resources, and timelines needed to close gaps in business continuity objectives.</Text>
          </FormControl>

          {/* ISO 22301 Clause 7: Risk Management */}
          <FormControl>
            <FormLabel>Risk Management</FormLabel>
            <Select name="riskManagement" value={formData.riskManagement} onChange={handleChange}>
              {scoreOptions}
            </Select>
            <Text fontSize="sm">A formal risk management process must be documented, outlining the identification, evaluation, and prioritization of risks related to business disruptions, and deciding which risks to mitigate or accept.</Text>
          </FormControl>

          <FormControl>
            <FormLabel>Risk Assessment</FormLabel>
            <Select name="riskAssessment" value={formData.riskAssessment} onChange={handleChange}>
              {scoreOptions}
            </Select>
            <Text fontSize="sm">The risk assessment should document identified risks, risk criteria, risk tolerance levels, and strategies for risk mitigation and acceptance.</Text>
          </FormControl>

          <FormControl>
            <FormLabel>Crisis Communication</FormLabel>
            <Select name="crisisCommunication" value={formData.crisisCommunication} onChange={handleChange}>
              {scoreOptions}
            </Select>
            <Text fontSize="sm">Crisis communication plans should include procedures for internal and external communications during an event, including alternate communication means if primary methods are disrupted.</Text>
          </FormControl>

          <FormControl>
            <FormLabel>Emergency Response Plans</FormLabel>
            <Select name="emergencyResponsePlans" value={formData.emergencyResponsePlans} onChange={handleChange}>
              {scoreOptions}
            </Select>
            <Text fontSize="sm">Ensure emergency response plans include procedures for evacuation, shelter-in-place, lockdown, and medical emergencies.</Text>
          </FormControl>

          <FormControl>
            <FormLabel>Crisis Management Plans</FormLabel>
            <Select name="crisisManagementPlans" value={formData.crisisManagementPlans} onChange={handleChange}>
              {scoreOptions}
            </Select>
            <Text fontSize="sm">Crisis management plans should include procedures for notifying the crisis management team (CMT), assessing the situation, activating the crisis communication plan, and evaluating the situation regularly.</Text>
          </FormControl>

          <FormControl>
            <FormLabel>Crisis Testing</FormLabel>
            <Select name="crisisTesting" value={formData.crisisTesting} onChange={handleChange}>
              {scoreOptions}
            </Select>
            <Text fontSize="sm">Ensure that crisis management testing is conducted at scheduled intervals (e.g., annually) to validate the effectiveness of the crisis response.</Text>
          </FormControl>

          {/* ISO 22301 Clause 6: BCP Testing */}
          <FormControl>
            <FormLabel>Top Management Participation</FormLabel>
            <Select name="topManagementParticipation" value={formData.topManagementParticipation} onChange={handleChange}>
              {scoreOptions}
            </Select>
            <Text fontSize="sm">Top management must actively participate in business continuity tests and reviews to ensure alignment with the BCP scope and objectives.</Text>
          </FormControl>

          <FormControl>
            <FormLabel>BC Testing</FormLabel>
            <Select name="bcTesting" value={formData.bcTesting} onChange={handleChange}>
              {scoreOptions}
            </Select>
            <Text fontSize="sm">Business continuity tests should be based on realistic scenarios and objectives, and must validate continuity procedures and arrangements with external parties (e.g., vendors supporting recovery).</Text>
          </FormControl>

          <FormControl>
            <FormLabel>Test Documentation</FormLabel>
            <Select name="testDocumentation" value={formData.testDocumentation} onChange={handleChange}>
              {scoreOptions}
            </Select>
            <Text fontSize="sm">All test results, outcomes, and any recommendations for improvements must be documented after conducting business continuity tests.</Text>
          </FormControl>

          <FormControl>
            <FormLabel>Test Review</FormLabel>
            <Select name="testReview" value={formData.testReview} onChange={handleChange}>
              {scoreOptions}
            </Select>
            <Text fontSize="sm">Ensure that top management reviews test results and takes actions based on post-exercise reports to improve BCP procedures.</Text>
          </FormControl>

          <FormControl>
            <FormLabel>Annual Testing</FormLabel>
            <Select name="annualTesting" value={formData.annualTesting} onChange={handleChange}>
              {scoreOptions}
            </Select>
            <Text fontSize="sm">Business continuity tests should be conducted annually, or when significant changes to operations occur that may affect continuity procedures.</Text>
          </FormControl>

          {/* ISO 22301 Clause 7: BCP Documentation Change Management */}
          <FormControl>
            <FormLabel>Change Management Procedures</FormLabel>
            <Select name="changeManagementProcedures" value={formData.changeManagementProcedures} onChange={handleChange}>
              {scoreOptions}
            </Select>
            <Text fontSize="sm">Change management procedures must identify the impact of IT and business changes             on the BCP and assign tasks to address those impacts. This includes identifying responsibilities, timelines, and resource requirements.</Text>
          </FormControl>

          <FormControl>
            <FormLabel>Documentation Security</FormLabel>
            <Select name="documentationSecurity" value={formData.documentationSecurity} onChange={handleChange}>
              {scoreOptions}
            </Select>
            <Text fontSize="sm">BCP documentation must meet organizational and regulatory security requirements, ensuring that confidential information is protected appropriately.</Text>
          </FormControl>

          <FormControl>
            <FormLabel>Documentation Version Control</FormLabel>
            <Select name="documentationVersionControl" value={formData.documentationVersionControl} onChange={handleChange}>
              {scoreOptions}
            </Select>
            <Text fontSize="sm">All BCP documentation must include version control, adhering to the organization’s retention and disposition policies to ensure proper document management and compliance.</Text>
          </FormControl>

          <FormControl>
            <FormLabel>External Documentation Control</FormLabel>
            <Select name="externalDocumentationControl" value={formData.externalDocumentationControl} onChange={handleChange}>
              {scoreOptions}
            </Select>
            <Text fontSize="sm">Required documentation from external entities (such as business partners, vendors, etc.) must be identified and subject to appropriate controls to ensure that sensitive information is protected.</Text>
          </FormControl>

          {/* Submit Button */}
          <Button type="submit" colorScheme="blue">Save Maturity Scorecard</Button>
        </VStack>
      </form>

      <Box mt={4}>
        <Text fontSize="xl" fontWeight="bold">Overall Maturity Score: {overallMaturityScore}</Text>
      </Box>
    </Box>
  );
};

export default MaturityScorecard;

