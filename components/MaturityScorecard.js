// components/MaturityScorecard.js
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
    processDocumentation: '',
    testingFrequency: '',
    incidentResponse: '',
    complianceReadiness: '',
    teamTraining: '',
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
      switch (value) {
        case 'Optimized': return 5;
        case 'Managed': return 4;
        case 'Defined': return 3;
        case 'Repeatable': return 2;
        case 'Initial': return 1;
        default: return 0;
      }
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

  return (
    <Box>
      <form onSubmit={handleSubmit}>
        <VStack spacing={4} align="stretch">
          <FormControl>
            <FormLabel>Process Documentation</FormLabel>
            <Select name="processDocumentation" value={formData.processDocumentation} onChange={handleChange}>
              <option value="">Select level</option>
              <option value="Initial">Initial</option>
              <option value="Repeatable">Repeatable</option>
              <option value="Defined">Defined</option>
              <option value="Managed">Managed</option>
              <option value="Optimized">Optimized</option>
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Testing Frequency</FormLabel>
            <Select name="testingFrequency" value={formData.testingFrequency} onChange={handleChange}>
              <option value="">Select level</option>
              <option value="Initial">Initial</option>
              <option value="Repeatable">Repeatable</option>
              <option value="Defined">Defined</option>
              <option value="Managed">Managed</option>
              <option value="Optimized">Optimized</option>
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Incident Response</FormLabel>
            <Select name="incidentResponse" value={formData.incidentResponse} onChange={handleChange}>
              <option value="">Select level</option>
              <option value="Initial">Initial</option>
              <option value="Repeatable">Repeatable</option>
              <option value="Defined">Defined</option>
              <option value="Managed">Managed</option>
              <option value="Optimized">Optimized</option>
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Compliance Readiness</FormLabel>
            <Select name="complianceReadiness" value={formData.complianceReadiness} onChange={handleChange}>
              <option value="">Select level</option>
              <option value="Initial">Initial</option>
              <option value="Repeatable">Repeatable</option>
              <option value="Defined">Defined</option>
              <option value="Managed">Managed</option>
              <option value="Optimized">Optimized</option>
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Team Training</FormLabel>
            <Select name="teamTraining" value={formData.teamTraining} onChange={handleChange}>
              <option value="">Select level</option>
              <option value="Initial">Initial</option>
              <option value="Repeatable">Repeatable</option>
              <option value="Defined">Defined</option>
              <option value="Managed">Managed</option>
              <option value="Optimized">Optimized</option>
            </Select>
          </FormControl>
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
