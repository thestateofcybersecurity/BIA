import React, { useEffect, useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { Box, Heading, SimpleGrid, Text, VStack, HStack, Progress, Button } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import axios from 'axios';

const Dashboard = () => {
  const { user, error, isLoading } = useUser();
  const router = useRouter();
  const [businessProcesses, setBusinessProcesses] = useState([]);
  const [maturityScore, setMaturityScore] = useState(0);
  const [recentScenarios, setRecentScenarios] = useState([]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const [processesResponse, maturityResponse, scenariosResponse] = await Promise.all([
        axios.get('/api/business-process'),
        axios.get('/api/maturity-scorecard'),
        axios.get('/api/tabletop-scenario')
      ]);

      setBusinessProcesses(processesResponse.data.data);
      setMaturityScore(maturityResponse.data.data?.overallMaturityScore || 0);
      setRecentScenarios(scenariosResponse.data.data.slice(0, 5)); // Get the 5 most recent scenarios
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const navigateTo = (path) => {
    router.push(path);
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error.message}</div>;

  return (
    <Box p={5}>
      <Heading mb={6}>Business Continuity Platform Dashboard</Heading>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={10}>
        <Box p={5} shadow="md" borderWidth="1px">
          <Heading fontSize="xl" mb={4}>Business Processes</Heading>
          <Text>Total Processes: {businessProcesses.length}</Text>
          <Text>Completed Impact Analyses: {businessProcesses.filter(p => p.impactAnalysisCompleted).length}</Text>
          <Button mt={4} onClick={() => navigateTo('/business-process')}>Manage Processes</Button>
        </Box>

        <Box p={5} shadow="md" borderWidth="1px">
          <Heading fontSize="xl" mb={4}>Maturity Score</Heading>
          <Text fontSize="3xl" fontWeight="bold">{maturityScore.toFixed(2)}</Text>
          <Progress value={(maturityScore / 5) * 100} mt={2} />
          <Button mt={4} onClick={() => navigateTo('/maturity-scorecard')}>View Scorecard</Button>
        </Box>

        <Box p={5} shadow="md" borderWidth="1px">
          <Heading fontSize="xl" mb={4}>Recent Tabletop Scenarios</Heading>
          <VStack align="stretch" spacing={2}>
            {recentScenarios.map((scenario, index) => (
              <Text key={index}>{scenario.title}</Text>
            ))}
          </VStack>
          <Button mt={4} onClick={() => navigateTo('/tabletop-scenario')}>Generate Scenario</Button>
        </Box>

        <Box p={5} shadow="md" borderWidth="1px">
          <Heading fontSize="xl" mb={4}>Recovery Workflows</Heading>
          <Text>Completed Workflows: {businessProcesses.filter(p => p.recoveryWorkflow).length}</Text>
          <Button mt={4} onClick={() => navigateTo('/recovery-workflow')}>Manage Workflows</Button>
        </Box>

        <Box p={5} shadow="md" borderWidth="1px">
          <Heading fontSize="xl" mb={4}>RTO/RPO Analysis</Heading>
          <Button mt={4} onClick={() => navigateTo('/rto-rpo-analysis')}>View Analysis</Button>
        </Box>

        <Box p={5} shadow="md" borderWidth="1px">
          <Heading fontSize="xl" mb={4}>Comparative Analysis</Heading>
          <Button mt={4} onClick={() => navigateTo('/comparative-analysis')}>Compare Processes</Button>
        </Box>
      </SimpleGrid>
    </Box>
  );
};

export default Dashboard;
