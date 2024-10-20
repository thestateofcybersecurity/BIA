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
      revenueScore: translateImpactScore(row.lossOfRevenue),
      productivityScore: translateImpactScore(row.lossOfProductivity),
      operatingCostsScore: translateImpactScore(row.increasedOperatingCosts),
      financialPenaltiesScore: translateImpactScore(row.financialPenalties),
      customersScore: translateImpactScore(row.impactOnCustomers),
      staffScore: translateImpactScore(row.impactOnStaff),
      partnersScore: translateImpactScore(row.impactOnPartners),
      complianceScore: translateImpactScore(row.complianceImpact),
      healthSafetyScore: translateImpactScore(row.healthSafetyRisk),
    };

    scores.totalCostOfDowntime = 
      scores.revenueScore + 
      scores.productivityScore + 
      scores.operatingCostsScore + 
      scores.financialPenaltiesScore;

    scores.totalImpactScore = 
      scores.customersScore + 
      scores.staffScore + 
      scores.partnersScore + 
      scores.complianceScore + 
      scores.healthSafetyScore;

    scores.overallScore = Object.values(scores).reduce((sum, score) => sum + score, 0) / 9;

    scores.criticalityTier = 
      scores.overallScore >= 3.5 ? 'Tier 1 (Gold)' :
      scores.overallScore >= 3 ? 'Tier 2 (Silver)' :
      scores.overallScore >= 2.5 ? 'Tier 3 (Bronze)' :
      'Non-critical';

    return scores;
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
