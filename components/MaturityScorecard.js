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
          </FormControl>
          <FormControl>
            <FormLabel>Business Operations</FormLabel>
            <Select name="businessOperations" value={formData.businessOperations} onChange={handleChange}>
              {scoreOptions}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Dependencies</FormLabel>
            <Select name="dependencies" value={formData.dependencies} onChange={handleChange}>
              {scoreOptions}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Alternatives for Dependencies</FormLabel>
            <Select name="alternativesForDependencies" value={formData.alternativesForDependencies} onChange={handleChange}>
              {scoreOptions}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Legal and Regulatory Requirements</FormLabel>
            <Select name="legalAndRegulatoryRequirements" value={formData.legalAndRegulatoryRequirements} onChange={handleChange}>
              {scoreOptions}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Internal Stakeholders</FormLabel>
            <Select name="internalStakeholders" value={formData.internalStakeholders} onChange={handleChange}>
              {scoreOptions}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>External Stakeholders</FormLabel>
            <Select name="externalStakeholders" value={formData.externalStakeholders} onChange={handleChange}>
              {scoreOptions}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Organizational Objectives</FormLabel>
            <Select name="organizationalObjectives" value={formData.organizationalObjectives} onChange={handleChange}>
              {scoreOptions}
            </Select>
          </FormControl>

          {/* ISO 22301 Clause 8: Conduct a BIA to Determine Acceptable RTOs and RPOs */}
          <FormControl>
            <FormLabel>BIA Process</FormLabel>
            <Select name="biaProcess" value={formData.biaProcess} onChange={handleChange}>
              {scoreOptions}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>BIA Conducted</FormLabel>
            <Select name="biaConducted" value={formData.biaConducted} onChange={handleChange}>
              {scoreOptions}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>RTOs and RPOs Defined</FormLabel>
            <Select name="rtosRposDefined" value={formData.rtosRposDefined} onChange={handleChange}>
              {scoreOptions}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>BIA Reviewed</FormLabel>
            <Select name="biaReviewed" value={formData.biaReviewed} onChange={handleChange}>
              {scoreOptions}
            </Select>
          </FormControl>

          {/* ISO 22301 Clause 8: Create a Recovery Workflow */}
          <FormControl>
            <FormLabel>Incident Response Plans</FormLabel>
            <Select name="incidentResponsePlans" value={formData.incidentResponsePlans} onChange={handleChange}>
              {scoreOptions}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Recovery Plan Flexibility</FormLabel>
            <Select name="recoveryPlanFlexibility" value={formData.recoveryPlanFlexibility} onChange={handleChange}>
              {scoreOptions}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Incident Response Resources</FormLabel>
            <Select name="incidentResponseResources" value={formData.incidentResponseResources} onChange={handleChange}>
              {scoreOptions}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Interim Processes</FormLabel>
            <Select name="interimProcesses" value={formData.interimProcesses} onChange={handleChange}>
              {scoreOptions}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Return to Normal Procedures</FormLabel>
            <Select name="returnToNormalProcedures" value={formData.returnToNormalProcedures} onChange={handleChange}>
              {scoreOptions}
            </Select>
          </FormControl>

          {/* ISO 22301 Clause 5: Establish a BCMS */}
          <FormControl>
            <FormLabel>BC Policy</FormLabel>
            <Select name="bcPolicy" value={formData.bcPolicy} onChange={handleChange}>
              {scoreOptions}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>BC Policy Communication</FormLabel>
            <Select name="bcPolicyCommunication" value={formData.bcPolicyCommunication} onChange={handleChange}>
              {scoreOptions}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>BCM Team</FormLabel>
            <Select name="bcmTeam" value={formData.bcmTeam} onChange={handleChange}>
              {scoreOptions}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Review and Maintenance Plan</FormLabel>
            <Select name="reviewMaintenancePlan" value={formData.reviewMaintenancePlan} onChange={handleChange}>
              {scoreOptions}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>BCMS Project Plan</FormLabel>
            <Select name="bcmsProjectPlan" value={formData.bcmsProjectPlan} onChange={handleChange}>
              {scoreOptions}
            </Select>
          </FormControl>

          {/* ISO 22301 Clause 7: Risk Management */}
          <FormControl>
            <FormLabel>Risk Management</FormLabel>
            <Select name="riskManagement" value={formData.riskManagement} onChange={handleChange}>
              {scoreOptions}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Risk Assessment</FormLabel>
            <Select name="riskAssessment" value={formData.riskAssessment} onChange={handleChange}>
              {scoreOptions}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Crisis Communication</FormLabel>
            <Select name="crisisCommunication" value={formData.crisisCommunication} onChange={handleChange}>
              {scoreOptions}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Emergency Response Plans</FormLabel>
            <Select name="emergencyResponsePlans" value={formData.emergencyResponsePlans} onChange={handleChange}>
              {scoreOptions}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Crisis Management Plans</FormLabel>
            <Select name="crisisManagementPlans" value={formData.crisisManagementPlans} onChange={handleChange}>
              {scoreOptions}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Crisis Testing</FormLabel>
            <Select name="crisisTesting" value={formData.crisisTesting} onChange={handleChange}>
              {scoreOptions}
            </Select>
          </FormControl>

          {/* ISO 22301 Clause 6: BCP Testing */}
          <FormControl>
            <FormLabel>Top Management Participation</FormLabel>
            <Select name="topManagementParticipation" value={formData.topManagementParticipation} onChange={handleChange}>
              {scoreOptions}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>BC Testing</FormLabel>
            <Select name="bcTesting" value={formData.bcTesting} onChange={handleChange}>
              {scoreOptions}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Test Documentation</FormLabel>
            <Select name="testDocumentation" value={formData.testDocumentation} onChange={handleChange}>
              {scoreOptions}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Test Review</FormLabel>
            <Select name="testReview" value={formData.testReview} onChange={handleChange}>
              {scoreOptions}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Annual Testing</FormLabel>
            <Select name="annualTesting" value={formData.annualTesting} onChange={handleChange}>
              {scoreOptions}
            </Select>
          </FormControl>

          {/* ISO 22301 Clause 7: BCP Documentation Change Management */}
          <FormControl>
            <FormLabel>Change Management Procedures</FormLabel>
            <Select name="changeManagementProcedures" value={formData.changeManagementProcedures} onChange={handleChange}>
              {scoreOptions}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Documentation Security</FormLabel>
            <Select name="documentationSecurity" value={formData.documentationSecurity} onChange={handleChange}>
              {scoreOptions}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Documentation Version Control</FormLabel>
            <Select name="documentationVersionControl" value={formData.documentationVersionControl} onChange={handleChange}>
              {scoreOptions}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>External Documentation Control</FormLabel>
            <Select name="externalDocumentationControl" value={formData.externalDocumentationControl} onChange={handleChange}>
              {scoreOptions}
            </Select>
          </FormControl>

          {/* Submit Button */}
          <Button type="submit" colorScheme="blue">Save Maturity Scorecard</Button>
        </VStack>
      </form>

      <Text mt={4} fontSize="xl" fontWeight="bold">
        Overall Maturity Score: {overallMaturityScore}
      </Text>
    </Box>
  );
};

export default MaturityScorecard;
