// components/RTORPOAnalysis.js
import React, { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  VStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useToast,
} from '@chakra-ui/react';
import axios from 'axios';

const RTORPOAnalysis = ({ businessProcessId }) => {
  const { user } = useUser();
  const [formData, setFormData] = useState({
    type: 'RTO',
    metric: 'recovery',
    acceptableTime: '',
    achievableTime: '',
  });
  const [analyses, setAnalyses] = useState([]);
  const toast = useToast();

  useEffect(() => {
    if (businessProcessId) {
      fetchAnalyses();
    }
  }, [businessProcessId]);

  const fetchAnalyses = async () => {
    try {
      const response = await axios.get(`/api/rto-rpo-analysis?businessProcessId=${businessProcessId}`);
      if (response.data.success) {
        setAnalyses(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching RTO/RPO analyses:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    const [metric, type] = activeTab.split('-');
    const response = await axios.post('/api/rto-rpo-analysis', {
      businessProcessId: selectedProcess,
      type: type.toUpperCase(),
      metric: metric,
      acceptableTime: parseFloat(formData.acceptableTime),
      achievableTime: parseFloat(formData.achievableTime)
    });
    toast({
      title: 'Success',
      description: 'RTO/RPO analysis saved successfully!',
      status: 'success',
      duration: 5000,
      isClosable: true,
    });
    fetchData();
  } catch (error) {
    console.error('Error saving RTO/RPO analysis:', error);
    toast({
      title: 'Error',
      description: `Failed to save RTO/RPO analysis: ${error.response?.data?.error || error.message}`,
      status: 'error',
      duration: 5000,
      isClosable: true,
    });
  }
};

  return (
    <Box>
      <form onSubmit={handleSubmit}>
        <VStack spacing={4} align="stretch">
          <FormControl>
            <FormLabel>Type</FormLabel>
            <Select name="type" value={formData.type} onChange={handleChange}>
              <option value="RTO">RTO</option>
              <option value="RPO">RPO</option>
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Metric</FormLabel>
            <Select name="metric" value={formData.metric} onChange={handleChange}>
              <option value="recovery">Recovery</option>
              <option value="repatriation">Repatriation</option>
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Acceptable Time (hours)</FormLabel>
            <Input type="number" name="acceptableTime" value={formData.acceptableTime} onChange={handleChange} />
          </FormControl>
          <FormControl>
            <FormLabel>Achievable Time (hours)</FormLabel>
            <Input type="number" name="achievableTime" value={formData.achievableTime} onChange={handleChange} />
          </FormControl>
          <Button type="submit" colorScheme="blue">Save Analysis</Button>
        </VStack>
      </form>

      <Table variant="simple" mt={6}>
        <Thead>
          <Tr>
            <Th>Type</Th>
            <Th>Metric</Th>
            <Th>Acceptable Time (hours)</Th>
            <Th>Achievable Time (hours)</Th>
            <Th>Gap (hours)</Th>
          </Tr>
        </Thead>
        <Tbody>
          {analyses.map((analysis, index) => (
            <Tr key={index}>
              <Td>{analysis.type}</Td>
              <Td>{analysis.metric}</Td>
              <Td>{analysis.acceptableTime}</Td>
              <Td>{analysis.achievableTime}</Td>
              <Td>{analysis.acceptableTime - analysis.achievableTime}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};

export default RTORPOAnalysis;
