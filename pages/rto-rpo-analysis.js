import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import Header from '../components/Header';
import { Box, Button, Heading, Table, Thead, Tbody, Tr, Th, Td, ButtonGroup, VStack } from '@chakra-ui/react';

const RTORPOAnalysis = () => {
  const { user, getAccessTokenSilently } = useAuth0();
  const [data, setData] = useState([]);
  const [activeTab, setActiveTab] = useState('recovery-rto');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await getAccessTokenSilently();
        const response = await fetch(`/api/index?path=rto-rpo-analysis&userId=${user.sub}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (response.ok) {
          const result = await response.json();
          setData(result);
        } else {
          throw new Error('Failed to fetch RTO/RPO data');
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Failed to fetch RTO/RPO data. Please try again.');
      }
    };

    fetchData();
  }, [user, getAccessTokenSilently]);

  const renderTable = () => {
    let filteredData = [];
    switch (activeTab) {
      case 'recovery-rto':
        filteredData = data.filter(item => item.type === 'recovery' && item.metric === 'rto');
        break;
      case 'recovery-rpo':
        filteredData = data.filter(item => item.type === 'recovery' && item.metric === 'rpo');
        break;
      case 'repatriation-rto':
        filteredData = data.filter(item => item.type === 'repatriation' && item.metric === 'rto');
        break;
      case 'repatriation-rpo':
        filteredData = data.filter(item => item.type === 'repatriation' && item.metric === 'rpo');
        break;
      default:
        break;
    }

    return (
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Process</Th>
            <Th>Acceptable</Th>
            <Th>Achievable</Th>
            <Th>Gap</Th>
          </Tr>
        </Thead>
        <Tbody>
          {filteredData.map((item, index) => (
            <Tr key={index}>
              <Td>{item.process}</Td>
              <Td>{item.acceptable}</Td>
              <Td>{item.achievable}</Td>
              <Td>{item.gap}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    );
  };

  return (
    <Box>
      <Header />
      <Box className="container" bg="white" p={6} rounded="md" shadow="md">
        <VStack spacing={6} align="stretch">
          <Heading as="h2" size="lg">RTO/RPO Gap Analysis</Heading>
          <ButtonGroup>
            <Button onClick={() => setActiveTab('recovery-rto')} colorScheme={activeTab === 'recovery-rto' ? 'blue' : 'gray'}>Recovery - RTO Gaps</Button>
            <Button onClick={() => setActiveTab('recovery-rpo')} colorScheme={activeTab === 'recovery-rpo' ? 'blue' : 'gray'}>Recovery - RPO Gaps</Button>
            <Button onClick={() => setActiveTab('repatriation-rto')} colorScheme={activeTab === 'repatriation-rto' ? 'blue' : 'gray'}>Repatriation - RTO Gaps</Button>
            <Button onClick={() => setActiveTab('repatriation-rpo')} colorScheme={activeTab === 'repatriation-rpo' ? 'blue' : 'gray'}>Repatriation - RPO Gaps</Button>
          </ButtonGroup>
          {renderTable()}
        </VStack>
      </Box>
    </Box>
  );
};

export default RTORPOAnalysis;
