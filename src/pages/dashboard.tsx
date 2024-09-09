import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { Box, Button, Heading, VStack, Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react'
import Introduction from '@/components/Introduction'
import ProcessesAndDependencies from '@/components/ProcessesAndDependencies'
import ImpactAnalysis from '@/components/ImpactAnalysis'
import VulnerabilityScoring from '@/components/VulnerabilityScoring'
import RecoveryObjectives from '@/components/RecoveryObjectives'
import axios from 'axios'

export default function Dashboard() {
  const { isAuthenticated, logout } = useAuth()
  const router = useRouter()
  const [processes, setProcesses] = useState([])

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    } else {
      fetchProcesses()
    }
  }, [isAuthenticated, router])

  const fetchProcesses = async () => {
    try {
      const response = await axios.get('/api/processes')
      setProcesses(response.data)
    } catch (error) {
      console.error('Error fetching processes:', error)
    }
  }

  const handleExportFindings = async () => {
    try {
      const response = await axios.get('/api/export-findings')
      console.log('Findings:', response.data)
    } catch (error) {
      console.error('Error exporting findings:', error)
    }
  }

  return (
    <Box maxWidth="1200px" margin="auto" mt={8} px={4}>
      <VStack spacing={4} align="stretch">
        <Heading>Business Impact Analysis Dashboard</Heading>
        <Button onClick={logout} colorScheme="red" alignSelf="flex-end">Logout</Button>
        <Tabs>
          <TabList>
            <Tab>Introduction</Tab>
            <Tab>Processes and Dependencies</Tab>
            <Tab>Impact Analysis</Tab>
            <Tab>Vulnerability Scoring</Tab>
            <Tab>Recovery Objectives</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <Introduction />
            </TabPanel>
            <TabPanel>
              <ProcessesAndDependencies />
            </TabPanel>
            <TabPanel>
              <ImpactAnalysis processes={processes} />
            </TabPanel>
            <TabPanel>
              <VulnerabilityScoring processes={processes} />
            </TabPanel>
            <TabPanel>
              <RecoveryObjectives processes={processes} />
            </TabPanel>
          </TabPanels>
        </Tabs>
        <Button onClick={handleExportFindings} colorScheme="green">Export Findings</Button>
      </VStack>
    </Box>
  )
}
