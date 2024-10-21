import React, { useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  useToast,
  Text,
  Alert,
  AlertIcon,
  List,
  ListItem,
} from '@chakra-ui/react';
import axios from 'axios';
import Papa from 'papaparse';

const ImpactAnalysisBulkUpload = ({ onUploadComplete }) => {
  const { user } = useUser();
  const [file, setFile] = useState(null);
  const [uploadErrors, setUploadErrors] = useState([]);
  const toast = useToast();

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setUploadErrors([]);
  };

  const translateCriticalityRating = (rating) => {
    const ratingMap = {
      'Tier 0': 'Critical',
      'Tier 1': 'High',
      'Tier 2': 'Medium',
      'Tier 3': 'Low',
    };
    return ratingMap[rating] || 'Low';
  };

  const translateImpactScore = (score) => {
    return parseFloat(score) || 0;
  };

  const calculateScores = (row) => {
    const scores = {
      revenueScore: calculateImpactScore('lossOfRevenue', parseFloat(row.lossOfRevenue)),
      productivityScore: calculateImpactScore('lossOfProductivity', parseFloat(row.lossOfProductivity)),
      operatingCostsScore: calculateImpactScore('increasedOperatingCosts', parseFloat(row.increasedOperatingCosts)),
      financialPenaltiesScore: calculateImpactScore('financialPenalties', parseFloat(row.financialPenalties)),
      customersScore: calculateGoodwillScore(row.impactOnCustomers),
      staffScore: calculateGoodwillScore(row.impactOnStaff),
      partnersScore: calculateGoodwillScore(row.impactOnPartners),
      complianceScore: calculateComplianceScore(row.complianceImpact),
      healthSafetyScore: calculateHealthSafetyScore(row.healthSafetyRisk),
    };

    scores.totalCostOfDowntime = 
      parseFloat(row.lossOfRevenue) + 
      parseFloat(row.lossOfProductivity) + 
      parseFloat(row.increasedOperatingCosts) + 
      parseFloat(row.financialPenalties);

    scores.totalImpactScore = 
      scores.customersScore + 
      scores.staffScore + 
      scores.partnersScore + 
      scores.complianceScore + 
      scores.healthSafetyScore;

    scores.overallScore = calculateOverallScore(scores, row.criticalityRating);

    scores.criticalityTier = determineCriticalityTier(scores.overallScore);

    return scores;
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
  
  const preprocessData = (data) => {
    return data.map(row => ({
      ...row,
      criticalityRating: translateCriticalityRating(row.criticalityRating),
      ...calculateScores(row),
    }));
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: 'No file selected',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    Papa.parse(file, {
      complete: async (results) => {
        try {
          const processedData = preprocessData(results.data);
          const response = await axios.post('/api/impact-analysis?bulkUpload=true', {
            data: processedData,
          });
          toast({
            title: 'Upload successful',
            description: `${response.data.uploadedCount} analyses uploaded.`,
            status: 'success',
            duration: 5000,
            isClosable: true,
          });
          if (response.data.errors) {
            setUploadErrors(response.data.errors);
          }
          onUploadComplete();
        } catch (error) {
          console.error('Error uploading analyses:', error);
          toast({
            title: 'Upload failed',
            description: error.response?.data?.error || 'An error occurred during upload.',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
          if (error.response?.data?.errors) {
            setUploadErrors(error.response.data.errors);
          }
        }
      },
      header: true,
      skipEmptyLines: true,
    });
  };

  return (
    <Box>
      <VStack spacing={4} align="stretch">
        <FormControl>
          <FormLabel>Upload CSV File</FormLabel>
          <Input type="file" accept=".csv" onChange={handleFileChange} />
        </FormControl>
        <Button onClick={handleUpload} colorScheme="blue">
          Upload
        </Button>
        <Alert status="info">
          <AlertIcon />
          <Text>
            Upload a CSV file to bulk import impact analyses. The CSV should have the following columns:
          </Text>
        </Alert>
        <Text fontSize="sm">
          Required columns: processName, clientFacingAvailability, additionalAvailability, criticalityRating, lossOfRevenue, lossOfProductivity, increasedOperatingCosts, financialPenalties, impactOnCustomers, impactOnStaff, impactOnPartners, complianceImpact, healthSafetyRisk
        </Text>
        <Text fontSize="sm">
          Note: The 'processName' should match an existing business process in the system. Criticality Rating should be one of: Tier 0, Tier 1, Tier 2, Tier 3. Impact scores should be numerical values.
        </Text>
        {uploadErrors.length > 0 && (
          <Alert status="warning">
            <AlertIcon />
            <VStack align="start">
              <Text>The following errors occurred during upload:</Text>
              <List styleType="disc" pl={4}>
                {uploadErrors.map((error, index) => (
                  <ListItem key={index}>{error}</ListItem>
                ))}
              </List>
            </VStack>
          </Alert>
        )}
      </VStack>
    </Box>
  );
};

export default ImpactAnalysisBulkUpload;
