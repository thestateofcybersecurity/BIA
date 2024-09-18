import React, { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { Box, Button, Heading, Table, Thead, Tbody, Tr, Th, Td, ButtonGroup, VStack, Select, FormControl, FormLabel, Input, Text, useToast } from '@chakra-ui/react';
import axios from 'axios';

const RTORPOAnalysis = () => {
  const { user, error, isLoading } = useUser();
  const [processes, setProcesses] = useState([]);
  const [selectedProcess, setSelectedProcess] = useState('');
  const [data, setData] = useState([]);
  const [activeTab, setActiveTab] = useState('recovery-rto');
  const [formData, setFormData] = useState({
    acceptableTime: '',
    achievableTime: '',
  });
  const toast = useToast();

  useEffect(() => {
    if (user) {
      fetchProcesses();
      fetchData();
    }
  }, [user]);

  const fetchProcesses = async () => {
    try {
      const response = await axios.get('/api/business-process');
      setProcesses(response.data.data);
    } catch (error) {
      console.error('Error fetching processes:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch business processes.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const fetchData = async () => {
    try {
      const response = await axios.get('/api/rto-rpo-analysis');
      setData(response.data);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch RTO/RPO data.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleProcessChange = (e) => {
    setSelectedProcess(e.target.value);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/rto-rpo-analysis', {
        businessProcessId: selectedProcess,
        type: activeTab.split('-')[0],
        metric: activeTab.split('-')[1],
        ...formData
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
        description: 'Failed to save RTO/RPO analysis.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const calculateGap = (acceptable, achievable) => {
    return parseFloat(acceptable) - parseFloat(achievable);
  };

  const renderTable = () => {
    let filteredData = data.filter(item => item.type === activeTab.split('-')[0] && item.metric === activeTab.split('-')[1]);

    return (
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Process</Th>
            <Th>Acceptable {activeTab.split('-')[1].toUpperCase()} (hrs.)</Th>
            <Th>Achievable {activeTab.split('-')[1].toUpperCase()} (hrs.)</Th>
            <Th>{activeTab.split('-')[1].toUpperCase()} Gaps (hrs.)</Th>
          </Tr>
        </Thead>
        <Tbody>
          {filteredData.map((item, index) => (
            <Tr key={index}>
              <Td>{item.processName}</Td>
              <Td>{item.acceptableTime}</Td>
              <Td>{item.achievableTime}</Td>
              <Td>{calculateGap(item.acceptableTime, item.achievableTime).toFixed(2)}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    );
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error.message}</div>;

  return (
    <Box>
      <Box className="container" bg="white" p={6} rounded="md" shadow="md">
        <VStack spacing={6} align="stretch">
          <Heading as="h2" size="lg">RTO/RPO Gap Analysis</Heading>
          <ButtonGroup>
            <Button onClick={() => setActiveTab('recovery-rto')} colorScheme={activeTab === 'recovery-rto' ? 'blue' : 'gray'}>Recovery - RTO Gaps</Button>
            <Button onClick={() => setActiveTab('recovery-rpo')} colorScheme={activeTab === 'recovery-rpo' ? 'blue' : 'gray'}>Recovery - RPO Gaps</Button>
            <Button onClick={() => setActiveTab('repatriation-rto')} colorScheme={activeTab === 'repatriation-rto' ? 'blue' : 'gray'}>Repatriation - RTO Gaps</Button>
            <Button onClick={() => setActiveTab('repatriation-rpo')} colorScheme={activeTab === 'repatriation-rpo' ? 'blue' : 'gray'}>Repatriation - RPO Gaps</Button>
          </ButtonGroup>
          <form onSubmit={handleSubmit}>
            <VStack spacing={4} align="flex-start">
              <FormControl id="processSelect" isRequired>
                <FormLabel>Select Business Process</FormLabel>
                <Select value={selectedProcess} onChange={handleProcessChange}>
                  <option value="">Select a process</option>
                  {processes.map(process => (
                    <option key={process._id} value={process._id}>{process.processName}</option>
                  ))}
                </Select>
              </FormControl>
              <FormControl id="acceptableTime" isRequired>
                <FormLabel>Acceptable {activeTab.split('-')[1].toUpperCase()} (hrs.)</FormLabel>
                <Input type="number" name="acceptableTime" value={formData.acceptableTime} onChange={handleInputChange} step="0.01" />
              </FormControl>
              <FormControl id="achievableTime" isRequired>
                <FormLabel>Achievable {activeTab.split('-')[1].toUpperCase()} (hrs.)</FormLabel>
                <Input type="number" name="achievableTime" value={formData.achievableTime} onChange={handleInputChange} step="0.01" />
              </FormControl>
              <Button type="submit" colorScheme="blue">Save Analysis</Button>
            </VStack>
          </form>
          {renderTable()}
        </VStack>
      </Box>
    </Box>
  );
};

export default RTORPOAnalysis;
