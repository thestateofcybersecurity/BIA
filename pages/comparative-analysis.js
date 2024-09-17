import React, { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import Header from '../components/Header';
import { Box, Heading, Table, Thead, Tbody, Tr, Th, Td, VStack, Alert, AlertIcon } from '@chakra-ui/react';
import axios from 'axios';

const ComparativeAnalysis = () => {
  const { user, error: authError, isLoading } = useUser();
  const [analyses, setAnalyses] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchAnalyses();
    }
  }, [user]);

  const fetchAnalyses = async () => {
    try {
      const response = await axios.get('/api/impact-analysis');
      setAnalyses(response.data);
    } catch (error) {
      console.error('Error fetching analyses:', error);
      setError('Failed to fetch impact analyses. Please try again.');
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (authError) return <div>{authError.message}</div>;

  return (
    <Box>
      <Header />
      <Box className="container" bg="white" p={6} rounded="md" shadow="md">
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
                  <Th>Revenue Score</Th>
                  <Th>Productivity Score</Th>
                  <Th>Operating Costs Score</Th>
                  <Th>Financial Penalties Score</Th>
                  <Th>Customers Score</Th>
                  <Th>Staff Score</Th>
                  <Th>Partners Score</Th>
                  <Th>Compliance Score</Th>
                  <Th>Health & Safety Score</Th>
                </Tr>
              </Thead>
              <Tbody>
                {analyses.map((analysis) => (
                  <Tr key={analysis._id}>
                    <Td>{analysis.processName}</Td>
                    <Td>{analysis.overallScore?.toFixed(2) || 'N/A'}</Td>
                    <Td>{analysis.criticalityTier || 'N/A'}</Td>
                    <Td>{analysis.revenueScore?.toFixed(2) || 'N/A'}</Td>
                    <Td>{analysis.productivityScore?.toFixed(2) || 'N/A'}</Td>
                    <Td>{analysis.operatingCostsScore?.toFixed(2) || 'N/A'}</Td>
                    <Td>{analysis.financialPenaltiesScore?.toFixed(2) || 'N/A'}</Td>
                    <Td>{analysis.customersScore?.toFixed(2) || 'N/A'}</Td>
                    <Td>{analysis.staffScore?.toFixed(2) || 'N/A'}</Td>
                    <Td>{analysis.partnersScore?.toFixed(2) || 'N/A'}</Td>
                    <Td>{analysis.complianceScore?.toFixed(2) || 'N/A'}</Td>
                    <Td>{analysis.healthSafetyScore?.toFixed(2) || 'N/A'}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          ) : (
            <Alert status="info">
              <AlertIcon />
              No impact analyses available.
            </Alert>
          )}
        </VStack>
      </Box>
    </Box>
  );
};

export default ComparativeAnalysis;
