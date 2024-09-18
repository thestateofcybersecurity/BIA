// components/ImpactAnalysisForm.js
import React, { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { Box, Button, FormControl, FormLabel, Input, Select, Heading, VStack, Text, SimpleGrid, useToast } from '@chakra-ui/react';
import axios from 'axios';

const ImpactAnalysisForm = () => {
  const { user, error, isLoading } = useUser();
  const toast = useToast();  // Initialize the toast hook
  const [processes, setProcesses] = useState([]);
  const [selectedProcess, setSelectedProcess] = useState('');
  const [formData, setFormData] = useState({
    clientFacingAvailability: '',
    additionalAvailability: '',
    criticalityRating: '',
    costOfDowntime: '',
    impactOnGoodwill: '',
    impactOnCompliance: '',
    impactOnSafety: '',
    lossOfRevenue: '',
    lossOfProductivity: '',
    increasedOperatingCosts: '',
    financialPenalties: '',
    impactOnCustomers: '',
    impactOnStaff: '',
    impactOnPartners: '',
    complianceRisks: '',
    healthSafetyRisks: '',
  });

  const scoringCriteria = {
    lossOfRevenue: [
      { value: 500000, score: 4 },
      { value: 375000, score: 3.5 },
      { value: 250000, score: 3 },
      { value: 187500, score: 2.5 },
      { value: 125000, score: 2 },
      { value: 75000, score: 1.5 },
      { value: 25000, score: 1 },
      { value: 12500, score: 0.5 },
      { value: 0, score: 0 },
    ],
    lossOfProductivity: [
      { value: 100000, score: 4 },
      { value: 75000, score: 3.5 },
      { value: 50000, score: 3 },
      { value: 37500, score: 2.5 },
      { value: 25000, score: 2 },
      { value: 15000, score: 1.5 },
      { value: 5000, score: 1 },
      { value: 2500, score: 0.5 },
      { value: 0, score: 0 },
    ],
    increasedOperatingCosts: [
      { value: 50000, score: 4 },
      { value: 37500, score: 3.5 },
      { value: 25000, score: 3 },
      { value: 18750, score: 2.5 },
      { value: 12500, score: 2 },
      { value: 7500, score: 1.5 },
      { value: 2500, score: 1 },
      { value: 1250, score: 0.5 },
      { value: 0, score: 0 },
    ],
    financialPenalties: [
      { value: 10000, score: 4 },
      { value: 7500, score: 3.5 },
      { value: 5000, score: 3 },
      { value: 3750, score: 2.5 },
      { value: 2500, score: 2 },
      { value: 1500, score: 1.5 },
      { value: 500, score: 1 },
      { value: 250, score: 0.5 },
      { value: 0, score: 0 },
    ],
  };
  
  useEffect(() => {
    if (businessProcessId) {
      fetchImpactAnalysis();
    }
  }, [businessProcessId]);

  const fetchImpactAnalysis = async () => {
    try {
      const response = await axios.get(`/api/impact-analysis?businessProcessId=${businessProcessId}`);
      if (response.data.success && response.data.data) {
        setFormData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching impact analysis:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/impact-analysis', {
        ...formData,
        businessProcessId: selectedProcess,
        ...scores
      });
      toast({
        title: "Success",
        description: "Impact analysis saved successfully!",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      fetchProcesses();
    } catch (error) {
      console.error('Error saving impact analysis:', error.response?.data || error.message);
      toast({
        title: "Error",
        description: `Failed to save impact analysis: ${error.response?.data?.error || error.message}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Box>
      <form onSubmit={handleSubmit}>
        <VStack spacing={4} align="stretch">
          <FormControl>
            <FormLabel>Client-Facing Availability</FormLabel>
            <Input name="clientFacingAvailability" value={formData.clientFacingAvailability} onChange={handleChange} />
          </FormControl>
          <FormControl>
            <FormLabel>Additional Availability</FormLabel>
            <Input name="additionalAvailability" value={formData.additionalAvailability} onChange={handleChange} />
          </FormControl>
          <FormControl>
            <FormLabel>Criticality Rating</FormLabel>
            <Select name="criticalityRating" value={formData.criticalityRating} onChange={handleChange}>
              <option value="">Select rating</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Cost of Downtime</FormLabel>
            <Input type="number" name="costOfDowntime" value={formData.costOfDowntime} onChange={handleChange} />
          </FormControl>
          {/* Add more form fields for other impact analysis data */}
          <Button type="submit" colorScheme="blue">Save Impact Analysis</Button>
        </VStack>
      </form>
    </Box>
  );
};

export default ImpactAnalysisForm;
