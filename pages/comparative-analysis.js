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
  Select,
  Button,
  HStack,
  Input,
  useToast,
} from '@chakra-ui/react';
import axios from 'axios';
import { CSVLink } from 'react-csv';

const ComparativeAnalysis = () => {
  const { user, error: authError, isLoading } = useUser();
  const [analyses, setAnalyses] = useState([]);
  const [filteredAnalyses, setFilteredAnalyses] = useState([]);
  const [error, setError] = useState(null);
  const [filterCriteria, setFilterCriteria] = useState({
    criticalityTier: '',
    minOverallScore: '',
    maxOverallScore: '',
  });
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

      const combinedData = impactResponse.data.map(impact => {
        const businessProcess = businessProcessResponse.data.find(bp => bp._id === impact.businessProcessId);
        const rtoRpo = rtoRpoResponse.data.find(rr => rr.businessProcessId === impact.businessProcessId);

        return {
          ...impact,
          processName: businessProcess?.processName || 'N/A',
          owner: businessProcess?.owner || 'N/A',
          rto: rtoRpo?.acceptableTime || 'N/A',
          rpo: rtoRpo?.achievableTime || 'N/A',
        };
      });

      setAnalyses(combinedData);
      setFilteredAnalyses(combinedData);
    } catch (error) {
      console.error('Error fetching analyses:', error);
      setError('Failed to fetch comparative analysis data. Please try again.');
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilterCriteria(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    const filtered = analyses.filter(analysis => {
      const matchesCriticality = !filterCriteria.criticalityTier || analysis.criticalityTier === filterCriteria.criticalityTier;
      const matchesMinScore = !filterCriteria.minOverallScore || analysis.overallScore >= Number(filterCriteria.minOverallScore);
      const matchesMaxScore = !filterCriteria.maxOverallScore || analysis.overallScore <= Number(filterCriteria.maxOverallScore);
      return matchesCriticality && matchesMinScore && matchesMaxScore;
    });
    setFilteredAnalyses(filtered);
  };

  const resetFilters = () => {
    setFilterCriteria({
      criticalityTier: '',
      minOverallScore: '',
      maxOverallScore: '',
    });
    setFilteredAnalyses(analyses);
  };

  const exportData = () => {
    const csvData = filteredAnalyses.map(analysis => ({
      'Process Name': analysis.processName,
      'Owner': analysis.owner,
      'Overall Score': analysis.overallScore?.toFixed(2) || 'N/A',
      'Criticality Tier': analysis.criticalityTier || 'N/A',
      'Revenue Score': analysis.revenueScore?.toFixed(2) || 'N/A',
      'Productivity Score': analysis.productivityScore?.toFixed(2) || 'N/A',
      'Operating Costs Score': analysis.operatingCostsScore?.toFixed(2) || 'N/A',
      'Financial Penalties Score': analysis.financialPenaltiesScore?.toFixed(2) || 'N/A',
      'Customers Score': analysis.customersScore?.toFixed(2) || 'N/A',
      'Staff Score': analysis.staffScore?.toFixed(2) || 'N/A',
      'Partners Score': analysis.partnersScore?.toFixed(2) || 'N/A',
      'Compliance Score': analysis.complianceScore?.toFixed(2) || 'N/A',
      'Health & Safety Score': analysis.healthSafetyScore?.toFixed(2) || 'N/A',
      'RTO': analysis.rto,
      'RPO': analysis.rpo,
    }));

    return csvData;
  };

  if (isLoading) return <div>Loading...</div>;
  if (authError) return <div>{authError.message}</div>;

  return (
    <Box>
      <Box className="container" bg="white" p={6} rounded="md" shadow="md">
        <VStack spacing={6} align="stretch">
          <Heading as="h2" size="lg">Comparative Analysis</Heading>
          {error && (
            <Alert status="error">
              <AlertIcon />
              {error}
            </Alert>
          )}
          <HStack spacing={4}>
            <Select
              placeholder="Criticality Tier"
              name="criticalityTier"
              value={filterCriteria.criticalityTier}
              onChange={handleFilterChange}
            >
              <option value="Tier 1 (Gold)">Tier 1 (Gold)</option>
              <option value="Tier 2 (Silver)">Tier 2 (Silver)</option>
              <option value="Tier 3 (Bronze)">Tier 3 (Bronze)</option>
              <option value="Non-critical">Non-critical</option>
            </Select>
            <Input
              placeholder="Min Overall Score"
              name="minOverallScore"
              type="number"
              value={filterCriteria.minOverallScore}
              onChange={handleFilterChange}
            />
            <Input
              placeholder="Max Overall Score"
              name="maxOverallScore"
              type="number"
              value={filterCriteria.maxOverallScore}
              onChange={handleFilterChange}
            />
            <Button onClick={applyFilters}>Apply Filters</Button>
            <Button onClick={resetFilters}>Reset Filters</Button>
            <CSVLink
              data={exportData()}
              filename="comparative_analysis.csv"
              className="btn btn-primary"
              onClick={() => {
                toast({
                  title: "Export successful",
                  description: "The data has been exported to CSV.",
                  status: "success",
                  duration: 3000,
                  isClosable: true,
                });
              }}
            >
              <Button>Export to CSV</Button>
            </CSVLink>
          </HStack>
          {filteredAnalyses.length > 0 ? (
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Process Name</Th>
                  <Th>Owner</Th>
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
                  <Th>RTO</Th>
                  <Th>RPO</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredAnalyses.map((analysis) => (
                  <Tr key={analysis._id}>
                    <Td>{analysis.processName}</Td>
                    <Td>{analysis.owner}</Td>
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
                    <Td>{analysis.rto}</Td>
                    <Td>{analysis.rpo}</Td>
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
