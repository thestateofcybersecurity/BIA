import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { Box, Button, Heading, VStack, Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react'
import ImpactAnalysis from '@/components/ImpactAnalysis'
import VulnerabilityScoring from '@/components/VulnerabilityScoring'
import RecoveryObjectives from '@/components/RecoveryObjectives'
import axios from 'axios'

export default function Dashboard() {
  const { isAuthenticated, logout } = useAuth()
  const [findings, setFindings] = useState(null)
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  const handleExportFindings = async () => {
    try {
      const response = await axios.get('/api/export-findings')
      setFindings(response.data)
      // Here you could trigger a download of the findings or display them in a modal
      console.log('Findings:', response.data)
    } catch (error) {
      console.error('Error exporting findings:', error)
    }
  }

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
  )
}
