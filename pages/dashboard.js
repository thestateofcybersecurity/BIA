import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Box, Button, Heading, VStack, Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react';
import ImpactAnalysis from '../components/ImpactAnalysis';
import VulnerabilityScoring from '../components/VulnerabilityScoring';
import RecoveryObjectives from '../components/RecoveryObjectives';

export default function Dashboard() {
  const { isAuthenticated, logout } = useAuth();
  const [findings, setFindings] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated]);

  const handleExportFindings = async () => {
    try {
      const response = await fetch('/api/export-findings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
      });
      if (response.ok) {
        const data = await response.json();
        setFindings(data);
        // Here you could trigger a download of the findings or display them in a modal
        console.log('Findings:', data);
      } else {
        throw new Error('Failed to export findings');
      }
    } catch (error) {
      console.error('Error exporting findings:', error);
    }
  };

  return (
    <Box maxWidth="800px" margin="auto" mt={8}>
      <VStack spacing={4} align="stretch">
        <Heading>Business Impact Analysis Dashboard</Heading>
        <Button onClick={logout} colorScheme="red">Logout</Button>
        <Tabs>
          <TabList>
            <Tab>Impact Analysis</Tab>
            <Tab>Vulnerability Scoring</Tab>
            <Tab>Recovery Objectives</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <ImpactAnalysis />
            </TabPanel>
            <TabPanel>
              <VulnerabilityScoring />
            </TabPanel>
            <TabPanel>
              <RecoveryObjectives />
            </TabPanel>
          </TabPanels>
        </Tabs>
        <Button onClick={handleExportFindings} colorScheme="green">Export Findings</Button>
      </VStack>
    </Box>
  );
}
