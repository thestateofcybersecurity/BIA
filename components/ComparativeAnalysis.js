// components/ComparativeAnalysis.js
import React, { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Select,
  VStack,
  Heading,
  Text,
} from '@chakra-ui/react';
import axios from 'axios';

const ComparativeAnalysis = () => {
  const { user } = useUser();
  const [businessProcesses, setBusinessProcesses] = useState([]);
  const [selectedProcesses, setSelectedProcesses] = useState([]);
  const [analysisData, setAnalysisData] = useState([]);

  useEffect(() => {
    fetchBusinessProcesses();
  }, []);

  useEffect(() => {
    if (selectedProcesses.length > 0) {
      fetchAnalysisData();
    }
  }, [selectedProcesses]);

  const fetchBusinessProcesses = async () => {
    try {
      const response = await axios.get('/api/business-process');
      setBusinessProcesses(response.data.data);
    } catch (error) {
      console.error('Error fetching business processes:', error);
    }
  };

  const fetchAnalysisData = async () => {
    try {
      const impactAnalysisPromises = selectedProcesses.map(processId =>
        axios.get(`/api/impact-analysis?businessProcessId=${processId}`)
      );
      const rtoRpoAnalysisPromises = selectedProcesses.map(processId =>
        axios.get(`/api/rto-rpo-analysis?businessProcessId=${processId}`)
      );

      const [impactAnalysisResponses, rtoRpoAnalysisResponses] = await Promise.all([
        Promise.all(impactAnalysisPromises),
        Promise.all(rtoRpoAnalysisPromises)
      ]);

      const combinedData = selectedProcesses.map((processId, index) => {
        const process = businessProcesses.find(p => p._id === processId);
        const impactAnalysis = impactAnalysisResponses[index].data.data;
        const rtoRpoAnalysis = rtoRpoAnalysisResponses[index].data.data;

        return {
          processName: process.processName,
          criticalityTier: impactAnalysis.criticalityTier,
          overallImpactScore: impactAnalysis.overallScore,
          rto: rtoRpoAnalysis.find(a => a.type === 'RTO')?.acceptableTime || 'N/A',
          rpo: rtoRpoAnalysis.find(a => a.type === 'RPO')?.acceptableTime || 'N/A',
        };
      });

      setAnalysisData(combinedData);
    } catch (error) {
      console.error('Error fetching analysis data:', error);
    }
  };

  const handleProcessSelection = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setSelectedProcesses(selectedOptions);
  };

  return (
    <Box>
      <VStack spacing={4} align="stretch">
        <Heading size="lg">Comparative Analysis</Heading>
        <Text>Select business processes to compare:</Text>
        <Select
          multiple
          onChange={handleProcessSelection}
          size="sm"
          height="auto"
          maxHeight="200px"
          overflowY="auto"
        >
          {businessProcesses.map(process => (
            <option key={process._id} value={process._id}>
              {process.processName}
            </option>
          ))}
        </Select>

        {analysisData.length > 0 && (
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Process Name</Th>
                <Th>Criticality Tier</Th>
                <Th>Overall Impact Score</Th>
                <Th>RTO (hrs)</Th>
                <Th>RPO (hrs)</Th>
              </Tr>
            </Thead>
            <Tbody>
              {analysisData.map((data, index) => (
                <Tr key={index}>
                  <Td>{data.processName}</Td>
                  <Td>{data.criticalityTier}</Td>
                  <Td>{data.overallImpactScore.toFixed(2)}</Td>
                  <Td>{data.rto}</Td>
                  <Td>{data.rpo}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </VStack>
    </Box>
  );
};

export default ComparativeAnalysis;
