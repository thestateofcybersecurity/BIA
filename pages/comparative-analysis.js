import React, { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import Header from '../components/Header';
import { Box, Heading, Table, Thead, Tbody, Tr, Th, Td, VStack } from '@chakra-ui/react';

const ComparativeAnalysis = () => {
  const { user, error, isLoading } = useUser();
  const [analyses, setAnalyses] = useState([]);

  useEffect(() => {
    if (user) {
      fetchAnalyses();
    }
  }, [user]);

  const fetchAnalyses = async () => {
    try {
      const response = await fetch('/api/impact-analysis');
      if (response.ok) {
        const data = await response.json();
        setAnalyses(data.data);
      } else {
        throw new Error('Failed to fetch impact analyses');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to fetch impact analyses. Please try again.');
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error.message}</div>;

  return (
    <Box>
      <Header />
      <Box className="container" bg="white" p={6} rounded="md" shadow="md">
        <VStack spacing={6} align="stretch">
          <Heading as="h2" size="lg">Comparative Analysis</Heading>
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
                  <Td>{analysis.overallScore.toFixed(2)}</Td>
                  <Td>{analysis.criticalityTier}</Td>
                  <Td>{analysis.revenueScore}</Td>
                  <Td>{analysis.productivityScore}</Td>
                  <Td>{analysis.operatingCostsScore}</Td>
                  <Td>{analysis.financialPenaltiesScore}</Td>
                  <Td>{analysis.customersScore}</Td>
                  <Td>{analysis.staffScore}</Td>
                  <Td>{analysis.partnersScore}</Td>
                  <Td>{analysis.complianceScore}</Td>
                  <Td>{analysis.healthSafetyScore}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </VStack>
      </Box>
    </Box>
  );
};

export default ComparativeAnalysis;
