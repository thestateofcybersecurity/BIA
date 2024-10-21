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
  Heading,
  VStack,
  Text,
  SimpleGrid,
  useToast,
} from '@chakra-ui/react';
import axios from 'axios';

const ImpactAnalysisForm = ({ analysisId = null, initialData = null, onSave }) => {
  const { user, error, isLoading } = useUser();
  const toast = useToast();
  const [processes, setProcesses] = useState([]);
  const [selectedProcess, setSelectedProcess] = useState('');
  const [formData, setFormData] = useState({
    processName: '',
    clientFacingAvailability: '',
    additionalAvailability: '',
    criticalityRating: '',
    lossOfRevenue: '',
    lossOfProductivity: '',
    increasedOperatingCosts: '',
    financialPenalties: '',
    impactOnCustomers: '',
    impactOnStaff: '',
    impactOnPartners: '',
    complianceImpact: '',
    healthSafetyRisk: '',
  });

  const [scores, setScores] = useState({
    revenueScore: 0,
    productivityScore: 0,
    operatingCostsScore: 0,
    financialPenaltiesScore: 0,
    customersScore: 0,
    staffScore: 0,
    partnersScore: 0,
    complianceScore: 0,
    healthSafetyScore: 0,
    totalCostOfDowntime: 0,
    totalImpactScore: 0,
    overallScore: 0,
    criticalityTier: '',
  });

  const scoringCriteria = {
    lossOfRevenue: [
      { value: 5500000, score: 4 },
      { value: 4125000, score: 3.5 },
      { value: 2750000, score: 3 },
      { value: 2062500, score: 2.5 },
      { value: 1375000, score: 2 },
      { value: 825000, score: 1.5 },
      { value: 275000, score: 1 },
      { value: 137500, score: 0.5 },
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
    if (user) {
      fetchProcesses();
      if (initialData) {
        setFormData(initialData);
        setSelectedProcess(initialData.businessProcess);
        calculateScores(initialData);
      }
    }
  }, [user, initialData]);

  useEffect(() => {
    calculateScores();
  }, [formData]);
  
  const fetchProcesses = async () => {
    try {
      const response = await axios.get('/api/business-processes');
      setProcesses(response.data);
    } catch (error) {
      console.error('Error fetching processes:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch business processes.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const fetchAnalysis = async (id) => {
    try {
      const response = await axios.get(`/api/impact-analysis/${id}`);
      setFormData(response.data);
      setSelectedProcess(response.data.businessProcess);
    } catch (error) {
      console.error('Error fetching analysis:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch impact analysis.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = analysisId ? `/api/impact-analysis/${analysisId}` : '/api/impact-analysis';
      const method = analysisId ? 'put' : 'post';
      const response = await axios[method](url, {
        ...formData,
        ...scores,
        businessProcess: selectedProcess,
      });
      toast({
        title: 'Success',
        description: `Impact analysis ${analysisId ? 'updated' : 'created'} successfully!`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      if (onSave) onSave(response.data);
    } catch (error) {
      console.error('Error saving impact analysis:', error.response?.data || error.message);
      toast({
        title: 'Error',
        description: `Failed to ${analysisId ? 'update' : 'create'} impact analysis: ${error.response?.data?.error || error.message}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProcessChange = (e) => {
    setSelectedProcess(e.target.value);
    const process = processes.find(p => p._id === e.target.value);
    if (process) {
      setFormData(prevData => ({
        ...prevData,
        processName: process.processName,
      }));
    }
  };

  const calculateScores = () => {
    const newScores = {
      revenueScore: calculateImpactScore('lossOfRevenue', formData.lossOfRevenue),
      productivityScore: calculateImpactScore('lossOfProductivity', formData.lossOfProductivity),
      operatingCostsScore: calculateImpactScore('increasedOperatingCosts', formData.increasedOperatingCosts),
      financialPenaltiesScore: calculateImpactScore('financialPenalties', formData.financialPenalties),
      customersScore: calculateGoodwillScore(formData.impactOnCustomers),
      staffScore: calculateGoodwillScore(formData.impactOnStaff),
      partnersScore: calculateGoodwillScore(formData.impactOnPartners),
      complianceScore: calculateComplianceScore(formData.complianceImpact),
      healthSafetyScore: calculateHealthSafetyScore(formData.healthSafetyRisk),
    };

    newScores.totalCostOfDowntime = calculateTotalCostOfDowntime(formData);
    newScores.totalImpactScore = calculateTotalImpactScore(newScores);
    newScores.overallScore = calculateOverallScore(newScores, formData.criticalityRating);
    newScores.criticalityTier = determineCriticalityTier(newScores.overallScore);

    setScores(newScores);
  };

  const calculateImpactScore = (category, value) => {
    const numValue = Number(value);
    const criteriaItem = scoringCriteria[category].find(item => item.value === numValue);
    return criteriaItem ? criteriaItem.score : 0;
  };

  const calculateGoodwillScore = (impact) => {
    switch (impact) {
      case 'Critical Impact': return 4;
      case 'High Impact': return 3;
      case 'Medium Impact': return 2;
      case 'Low Impact': return 1;
      default: return 0;
    }
  };

  const calculateComplianceScore = (impact) => {
    switch (impact) {
      case 'Critical Impact': return 4;
      case 'High Impact': return 3;
      case 'Medium Impact': return 2;
      case 'Low Impact': return 1;
      default: return 0;
    }
  };

  const calculateHealthSafetyScore = (impact) => {
    switch (impact) {
      case 'High risk of loss-of-life/serious harm': return 4;
      case 'Some risk of loss-of-life/serious harm': return 3;
      case 'High degradation of health/safety services': return 2;
      case 'Some degradation of health/safety services': return 1;
      default: return 0;
    }
  };

  const calculateTotalCostOfDowntime = (data) => {
    return (
      Number(data.lossOfRevenue) +
      Number(data.lossOfProductivity) +
      Number(data.increasedOperatingCosts) +
      Number(data.financialPenalties)
    );
  };

  const calculateTotalImpactScore = (scores) => {
    return (
      scores.customersScore +
      scores.staffScore +
      scores.partnersScore +
      scores.complianceScore +
      scores.healthSafetyScore
    );
  };

  const calculateOverallScore = (scores, criticalityRating) => {
    let baseScore = Object.values(scores).reduce((sum, score) => {
      if (typeof score === 'number' && score !== scores.totalCostOfDowntime && score !== scores.totalImpactScore) {
        return sum + score;
      }
      return sum;
    }, 0) / 9;

    // Apply criticality rating multiplier
    const criticalityMultiplier = {
      'Critical': 1.3,
      'High': 1.2,
      'Medium': 1.1,
      'Low': 1.0
    };

    return baseScore * (criticalityMultiplier[criticalityRating] || 1.0);
  };

  const determineCriticalityTier = (score) => {
    if (score >= 3.5) return 'Tier 1 (Gold)';
    if (score >= 3.0) return 'Tier 2 (Silver)';
    if (score >= 2.5) return 'Tier 3 (Bronze)';
    return 'Non-critical';
  };

  const renderOptions = (category) => {
    return scoringCriteria[category].map(({ value }) => (
      <option key={value} value={value}>
        ${value.toLocaleString()}
      </option>
    ));
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error.message}</div>;

  return (
    <Box className="container" bg="white" p={6} rounded="md" shadow="md">
      <Heading as="h2" size="lg" mb={6}>{analysisId ? 'Edit' : 'New'} Impact Analysis</Heading>
      <form onSubmit={handleSubmit}>
        <VStack spacing={4} align="flex-start">
          <FormControl id="processSelect" isRequired>
            <FormLabel>Select Business Process</FormLabel>
            <Select 
              value={selectedProcess} 
              onChange={handleProcessChange}
              isDisabled={analysisId != null}
            >
              <option value="">Select a process</option>
              {processes.map(process => (
                <option key={process._id} value={process._id}>{process.processName}</option>
              ))}
            </Select>
          </FormControl>

          <FormControl id="clientFacingAvailability">
            <FormLabel>Client-Facing Availability Requirements</FormLabel>
            <Input type="text" name="clientFacingAvailability" value={formData.clientFacingAvailability} onChange={handleChange} />
          </FormControl>
          
          <FormControl id="additionalAvailability">
            <FormLabel>Additional Availability Requirements</FormLabel>
            <Input type="text" name="additionalAvailability" value={formData.additionalAvailability} onChange={handleChange} />
          </FormControl>
          
          <FormControl id="criticalityRating" isRequired>
            <FormLabel>Criticality Rating</FormLabel>
            <Select name="criticalityRating" value={formData.criticalityRating} onChange={handleChange}>
              <option value="">Select a rating</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </Select>
          </FormControl>

          <FormControl id="lossOfRevenue" isRequired>
            <FormLabel>Loss of Revenue</FormLabel>
            <Select name="lossOfRevenue" value={formData.lossOfRevenue} onChange={handleChange}>
              <option value="">Select an option</option>
              {renderOptions('lossOfRevenue')}
            </Select>
          </FormControl>

          <FormControl id="lossOfProductivity" isRequired>
            <FormLabel>Loss of Productivity</FormLabel>
            <Select name="lossOfProductivity" value={formData.lossOfProductivity} onChange={handleChange}>
              <option value="">Select an option</option>
              {renderOptions('lossOfProductivity')}
            </Select>
          </FormControl>

          <FormControl id="increasedOperatingCosts" isRequired>
            <FormLabel>Increased Operating Costs</FormLabel>
            <Select name="increasedOperatingCosts" value={formData.increasedOperatingCosts} onChange={handleChange}>
              <option value="">Select an option</option>
              {renderOptions('increasedOperatingCosts')}
            </Select>
          </FormControl>

          <FormControl id="financialPenalties" isRequired>
            <FormLabel>Financial Penalties</FormLabel>
            <Select name="financialPenalties" value={formData.financialPenalties} onChange={handleChange}>
              <option value="">Select an option</option>
              {renderOptions('financialPenalties')}
            </Select>
          </FormControl>
  
          <FormControl id="impactOnCustomers" isRequired>
            <FormLabel>Impact on Customers</FormLabel>
            <Select name="impactOnCustomers" value={formData.impactOnCustomers} onChange={handleChange}>
              <option value="">Select an option</option>
              <option value="None">No Impact</option>
              <option value="Low Impact">Low Impact</option>
              <option value="Medium Impact">Medium Impact</option>
              <option value="High Impact">High Impact</option>
              <option value="Critical Impact">Critical Impact</option>
            </Select>
          </FormControl>

          <FormControl id="impactOnStaff" isRequired>
            <FormLabel>Impact on Internal Staff</FormLabel>
            <Select name="impactOnStaff" value={formData.impactOnStaff} onChange={handleChange}>
              <option value="">Select an option</option>
              <option value="None">No Impact</option>
              <option value="Low Impact">Low Impact</option>
              <option value="Medium Impact">Medium Impact</option>
              <option value="High Impact">High Impact</option>
              <option value="Critical Impact">Critical Impact</option>
            </Select>
          </FormControl>

          <FormControl id="impactOnPartners" isRequired>
            <FormLabel>Impact on Business Partners</FormLabel>
            <Select name="impactOnPartners" value={formData.impactOnPartners} onChange={handleChange}>
              <option value="">Select an option</option>
              <option value="None">No Impact</option>
              <option value="Low Impact">Low Impact</option>
              <option value="Medium Impact">Medium Impact</option>
              <option value="High Impact">High Impact</option>
              <option value="Critical Impact">Critical Impact</option>
            </Select>
          </FormControl>

          <FormControl id="complianceImpact" isRequired>
            <FormLabel>Compliance (e.g. Legal/ Regulatory) Impact</FormLabel>
            <Select name="complianceImpact" value={formData.complianceImpact} onChange={handleChange}>
              <option value="">Select an option</option>
              <option value="None">No Impact</option>
              <option value="Low Impact">Low Impact</option>
              <option value="Medium Impact">Medium Impact</option>
              <option value="High Impact">High Impact</option>
              <option value="Critical Impact">Critical Impact</option>
            </Select>
          </FormControl>

          <FormControl id="healthSafetyRisk" isRequired>
            <FormLabel>Health or Safety Risk</FormLabel>
            <Select name="healthSafetyRisk" value={formData.healthSafetyRisk} onChange={handleChange}>
              <option value="">Select an option</option>
              <option value="None">No Impact</option>
              <option value="Some degradation of health/safety services">Some degradation of health/safety services</option>
              <option value="High degradation of health/safety services">High degradation of health/safety services</option>
              <option value="Some risk of loss-of-life/serious harm">Some risk of loss-of-life/serious harm</option>
              <option value="High risk of loss-of-life/serious harm">High risk of loss-of-life/serious harm</option>
            </Select>
          </FormControl>
              
          <Heading as="h3" size="md" mt={6}>Impact Scores</Heading>
          <SimpleGrid columns={2} spacing={4}>
            <Text>Revenue Score: {scores.revenueScore.toFixed(2)}</Text>
            <Text>Productivity Score: {scores.productivityScore.toFixed(2)}</Text>
            <Text>Operating Costs Score: {scores.operatingCostsScore.toFixed(2)}</Text>
            <Text>Financial Penalties Score: {scores.financialPenaltiesScore.toFixed(2)}</Text>
            <Text>Customers Score: {scores.customersScore}</Text>
            <Text>Staff Score: {scores.staffScore}</Text>
            <Text>Partners Score: {scores.partnersScore}</Text>
            <Text>Compliance Score: {scores.complianceScore}</Text>
            <Text>Health & Safety Score: {scores.healthSafetyScore}</Text>
          </SimpleGrid>
          <Text fontWeight="bold">Total Cost of Downtime per 24 Hours: ${scores.totalCostOfDowntime.toLocaleString()}</Text>
          <Text fontWeight="bold">Total Impact on Goodwill, Compliance & Safety: {scores.totalImpactScore}</Text>
          <Text fontWeight="bold">Overall Score: {scores.overallScore.toFixed(2)}</Text>
          <Text fontWeight="bold">Criticality Tier: {scores.criticalityTier}</Text>
          
          <Button type="submit" colorScheme="blue" mt={6}>
            {analysisId ? 'Update' : 'Create'} Impact Analysis
          </Button>
        </VStack>
      </form>
    </Box>
  );
};

export default ImpactAnalysisForm;
