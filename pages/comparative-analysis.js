import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import Header from '../components/Header';
import { Box, Heading, Table, Thead, Tbody, Tr, Th, Td, VStack } from '@chakra-ui/react';

const ComparativeAnalysis = () => {
  const { getAccessTokenSilently } = useAuth0();
  const [analyses, setAnalyses] = useState([]);

  useEffect(() => {
    fetchAnalyses();
  }, []);

  const fetchAnalyses = async () => {
    try {
      const token = await getAccessTokenSilently();
      const response = await fetch('/api/impact-analysis', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
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
