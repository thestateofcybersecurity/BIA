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
      const response = await axios.get('/api/impact-analysis?completed=true');
      setAnalyses(response.data);
      setFilteredAnalyses(response.data);
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
    return filteredAnalyses.map(analysis => ({
      'Process Name': analysis.processName,
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
      'Total Cost of Downtime': analysis.totalCostOfDowntime?.toLocaleString() || 'N/A',
    }));
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
    const totalCostOfDowntime = filteredAnalyses.reduce((sum, a) => sum + (a.totalCostOfDowntime || 0), 0);

    return { 
      average: average.toFixed(2), 
      max: max.toFixed(2), 
      min: min.toFixed(2),
      totalCostOfDowntime: totalCostOfDowntime.toLocaleString()
    };
  };

  const chartData = {
    labels: sortedAnalyses.map(a => a.processName),
    datasets: [
      {
        label: 'Overall Score',
        data: sortedAnalyses.map(a => a.overallScore),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
      {
        label: 'Total Cost of Downtime',
        data: sortedAnalyses.map(a => a.totalCostOfDowntime),
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        yAxisID: 'y1',
      }
    ],
  };

  const chartOptions = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Overall Score'
        }
      },
      y1: {
        beginAtZero: true,
        position: 'right',
        title: {
          display: true,
          text: 'Total Cost of Downtime ($)'
        },
        grid: {
          drawOnChartArea: false,
        },
      }
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Overall Scores and Total Cost of Downtime by Business Process',
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
            <Text>Total Cost of Downtime (all processes): ${stats.totalCostOfDowntime}</Text>
          </Box>
          <Box height="400px">
            <Bar data={chartData} options={chartOptions} />
          </Box>
          {sortedAnalyses.length > 0 ? (
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th onClick={() => requestSort('processName')}>Process Name</Th>
                  <Th onClick={() => requestSort('overallScore')}>Overall Score</Th>
                  <Th onClick={() => requestSort('criticalityTier')}>Criticality Tier</Th>
                  <Th onClick={() => requestSort('totalCostOfDowntime')}>Total Cost of Downtime</Th>
                  <Th onClick={() => requestSort('revenueScore')}>Revenue Score</Th>
                  <Th onClick={() => requestSort('productivityScore')}>Productivity Score</Th>
                  <Th onClick={() => requestSort('operatingCostsScore')}>Operating Costs Score</Th>
                  <Th onClick={() => requestSort('financialPenaltiesScore')}>Financial Penalties Score</Th>
                  <Th onClick={() => requestSort('customersScore')}>Customers Score</Th>
                  <Th onClick={() => requestSort('staffScore')}>Staff Score</Th>
                  <Th onClick={() => requestSort('partnersScore')}>Partners Score</Th>
                  <Th onClick={() => requestSort('complianceScore')}>Compliance Score</Th>
                  <Th onClick={() => requestSort('healthSafetyScore')}>Health & Safety Score</Th>
                </Tr>
              </Thead>
              <Tbody>
                {sortedAnalyses.map((analysis) => (
                  <Tr key={analysis._id}>
                    <Td>{analysis.processName}</Td>
                    <Td>{analysis.overallScore?.toFixed(2) || 'N/A'}</Td>
                    <Td>{analysis.criticalityTier || 'N/A'}</Td>
                    <Td>${analysis.totalCostOfDowntime?.toLocaleString() || 'N/A'}</Td>
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
