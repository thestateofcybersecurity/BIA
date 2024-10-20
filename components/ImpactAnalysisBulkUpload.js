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
} from '@chakra-ui/react';
import axios from 'axios';
import Papa from 'papaparse';

const ImpactAnalysisBulkUpload = ({ onUploadComplete }) => {
  const { user } = useUser();
  const [file, setFile] = useState(null);
  const toast = useToast();

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
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
          const response = await axios.post('/api/impact-analysis?bulkUpload=true', {
            data: results.data,
          });
          toast({
            title: 'Upload successful',
            description: `${response.data.uploadedCount} analyses uploaded.`,
            status: 'success',
            duration: 5000,
            isClosable: true,
          });
          onUploadComplete();
        } catch (error) {
          console.error('Error uploading analyses:', error);
          toast({
            title: 'Upload failed',
            description: error.response?.data?.message || 'An error occurred during upload.',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
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
          Note: The 'processName' should match an existing business process in the system.
        </Text>
      </VStack>
    </Box>
  );
};

export default ImpactAnalysisBulkUpload;
