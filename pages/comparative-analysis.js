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
  Text,
} from '@chakra-ui/react';
import axios from 'axios';
import { CSVLink } from 'react-csv';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

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
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
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

      if (impactAnalyses.length === 0) {
        setError('No impact analysis data available.');
        return;
      }

      const combinedData = impactAnalyses.map(impact => {
        const businessProcess = businessProcesses.find(bp => bp._id === impact.businessProcessId) || {};
        const rtoRpo = rtoRpoAnalyses.find(rr => rr.businessProcessId === impact.businessProcessId) || {};

        return {
          ...impact,
          processName: businessProcess.processName || 'N/A',
          owner: businessProcess.owner || 'N/A',
          rto: rtoRpo.acceptableTime || 'N/A',
          rpo: rtoRpo.achievableTime || 'N/A',
        };
      });

      setAnalyses(combinedData);
      setFilteredAnalyses(combinedData);
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
      'RTO': analysis.rto,
      'RPO': analysis.rpo,
    }));

    return csvData;
  };

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedAnalyses = React.useMemo(() => {
    let sortableItems = [...filteredAnalyses];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredAnalyses, sortConfig]);

  const getStatistics = () => {
    const overallScores = filteredAnalyses.map(a => a.overallScore).filter(score => !isNaN(score));
    const average = overallScores.reduce((a, b) => a + b, 0) / overallScores.length;
    const max = Math.max(...overallScores);
    const min = Math.min(...overallScores);

    return { average: average.toFixed(2), max: max.toFixed(2), min: min.toFixed(2) };
  };

  const chartData = {
    labels: sortedAnalyses.map(a => a.processName),
    datasets: [
      {
        label: 'Overall Score',
        data: sortedAnalyses.map(a => a.overallScore),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Overall Scores by Business Process',
      },
    },
  };

  if (isLoading) return <div>Loading...</div>;
  if (authError) return <div>{authError.message}</div>;

  const stats = getStatistics();

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
          <Box>
            <Text>Average Overall Score: {stats.average}</Text>
            <Text>Highest Overall Score: {stats.max}</Text>
            <Text>Lowest Overall Score: {stats.min}</Text>
          </Box>
          <Box height="400px">
            <Bar data={chartData} options={chartOptions} />
          </Box>
          {sortedAnalyses.length > 0 ? (
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th onClick={() => requestSort('processName')}>Process Name</Th>
                  <Th onClick={() => requestSort('owner')}>Owner</Th>
                  <Th onClick={() => requestSort('overallScore')}>Overall Score</Th>
                  <Th onClick={() => requestSort('criticalityTier')}>Criticality Tier</Th>
                  <Th onClick={() => requestSort('rto')}>RTO</Th>
                  <Th onClick={() => requestSort('rpo')}>RPO</Th>
                </Tr>
              </Thead>
              <Tbody>
                {sortedAnalyses.map((analysis) => (
                  <Tr key={analysis._id}>
                    <Td>{analysis.processName}</Td>
                    <Td>{analysis.owner}</Td>
                    <Td>{analysis.overallScore?.toFixed(2) || 'N/A'}</Td>
                    <Td>{analysis.criticalityTier || 'N/A'}</Td>
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
