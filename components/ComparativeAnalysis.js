import React, { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  VStack,
  Alert,
  AlertIcon,
  useToast
} from '@chakra-ui/react';
import axios from 'axios';

const ComparativeAnalysis = () => {
  const { user, error: authError, isLoading } = useUser();
  const [analyses, setAnalyses] = useState([]);
  const [error, setError] = useState(null);
  const toast = useToast();

  useEffect(() => {
    if (user) {
      fetchAnalyses();
    }
  }, [user]);

  const fetchAnalyses = async () => {
    try {
      const [impactResponse, businessProcessResponse, rtoRpoResponse] = await Promise.all([
        axios.get('/api/impact-analysis'),
        axios.get('/api/business-process'),
        axios.get('/api/rto-rpo-analysis'),
      ]);

      // Ensure that the responses contain arrays
      const impactAnalyses = Array.isArray(impactResponse.data) ? impactResponse.data : [];
      const businessProcesses = Array.isArray(businessProcessResponse.data) ? businessProcessResponse.data : [];
      const rtoRpoAnalyses = Array.isArray(rtoRpoResponse.data) ? rtoRpoResponse.data : [];

      const combinedData = impactAnalyses.map(impact => {
        const businessProcess = businessProcesses.find(bp => bp._id === impact.businessProcessId) || {};
        const rtoRpo = rtoRpoAnalyses.find(rr => rr.businessProcessId === impact.businessProcessId) || {};

        return {
          ...impact,
          processName: businessProcess.processName || 'N/A',
          rto: rtoRpo.acceptableTime || 'N/A',
          rpo: rtoRpo.achievableTime || 'N/A',
        };
      });

      setAnalyses(combinedData);
    } catch (error) {
      console.error('Error fetching analyses:', error);
      setError('Failed to fetch comparative analysis data. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to fetch comparative analysis data.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (authError) return <div>{authError.message}</div>;

  return (
    <Box>
      <VStack spacing={6} align="stretch">
        <Heading as="h2" size="lg">Comparative Analysis</Heading>
        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}
        {analyses.length > 0 ? (
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Process Name</Th>
                <Th>Overall Score</Th>
                <Th>Criticality Tier</Th>
                <Th>RTO</Th>
                <Th>RPO</Th>
                {/* Add more headers as needed */}
              </Tr>
            </Thead>
            <Tbody>
              {analyses.map((analysis, index) => (
                <Tr key={index}>
                  <Td>{analysis.processName}</Td>
                  <Td>{analysis.overallScore?.toFixed(2) || 'N/A'}</Td>
                  <Td>{analysis.criticalityTier || 'N/A'}</Td>
                  <Td>{analysis.rto}</Td>
                  <Td>{analysis.rpo}</Td>
                  {/* Add more cells as needed */}
                </Tr>
              ))}
            </Tbody>
          </Table>
        ) : (
          <Alert status="info">
            <AlertIcon />
            No comparative analysis data available.
          </Alert>
        )}
      </VStack>
    </Box>
  );
};

export default ComparativeAnalysis;
