import React, { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { 
  Box, 
  Heading, 
  VStack, 
  Tabs, 
  TabList, 
  TabPanels, 
  Tab, 
  TabPanel,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
} from '@chakra-ui/react';
import ImpactAnalysisForm from '../components/ImpactAnalysisForm';
import ImpactAnalysisBulkUpload from '../components/ImpactAnalysisBulkUpload';
import axios from 'axios';

const ImpactAnalysisPage = () => {
  const { user, error, isLoading } = useUser();
  const [analyses, setAnalyses] = useState([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    if (user) {
      fetchAnalyses();
    }
  }, [user]);

  const fetchAnalyses = async () => {
    try {
      const response = await axios.get('/api/impact-analysis');
      setAnalyses(response.data);
    } catch (error) {
      console.error('Error fetching analyses:', error);
    }
  };

  const handleEditAnalysis = (analysis) => {
    setSelectedAnalysis(analysis);
    onOpen();
  };

  const handleAnalysisSaved = () => {
    fetchAnalyses();
    onClose();
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error.message}</div>;

  return (
    <Box>
      <Box className="container" bg="white" p={6} rounded="md" shadow="md">
        <VStack spacing={6} align="stretch">
          <Heading as="h2" size="lg">Impact Analysis Management</Heading>
          <Tabs>
            <TabList>
              <Tab>New Analysis</Tab>
              <Tab>Existing Analyses</Tab>
              <Tab>Bulk Upload</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <ImpactAnalysisForm onSave={handleAnalysisSaved} />
              </TabPanel>
              <TabPanel>
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th>Process Name</Th>
                      <Th>Overall Score</Th>
                      <Th>Criticality Tier</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {analyses.map((analysis) => (
                      <Tr key={analysis._id}>
                        <Td>{analysis.processName}</Td>
                        <Td>{analysis.overallScore?.toFixed(2)}</Td>
                        <Td>{analysis.criticalityTier}</Td>
                        <Td>
                          <Button onClick={() => handleEditAnalysis(analysis)}>Edit</Button>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TabPanel>
              <TabPanel>
                <ImpactAnalysisBulkUpload onUploadComplete={fetchAnalyses} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
      </Box>

      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Impact Analysis</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedAnalysis && (
              <ImpactAnalysisForm
                analysisId={selectedAnalysis._id}
                initialData={selectedAnalysis}
                onSave={handleAnalysisSaved}
              />
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default ImpactAnalysisPage;
