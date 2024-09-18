// components/ImpactAnalysisForm.js
import React, { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  VStack,
  useToast,
} from '@chakra-ui/react';
import axios from 'axios';

const ImpactAnalysisForm = ({ businessProcessId }) => {
  const { user } = useUser();
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
  const toast = useToast();

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
        businessProcessId,
      });
      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Impact analysis saved successfully.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error saving impact analysis:', error);
      toast({
        title: 'Error',
        description: 'Failed to save impact analysis.',
        status: 'error',
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
