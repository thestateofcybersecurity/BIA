// components/BusinessProcessList.js
import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Box,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  VStack,
} from '@chakra-ui/react';
import axios from 'axios';

const BusinessProcessList = () => {
  const { getAccessTokenSilently } = useAuth0();
  const [processes, setProcesses] = useState([]);
  const [editingProcess, setEditingProcess] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    fetchProcesses();
  }, []);

  const fetchProcesses = async () => {
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.get('/api/business-processes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProcesses(response.data);
    } catch (error) {
      console.error('Error fetching processes:', error);
    }
  };

  const handleEdit = (process) => {
    setEditingProcess(process);
    onOpen();
  };

  const handleSave = async () => {
    try {
      const token = await getAccessTokenSilently();
      await axios.put(`/api/business-processes/${editingProcess._id}`, editingProcess, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onClose();
      fetchProcesses();
    } catch (error) {
      console.error('Error updating process:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditingProcess(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Box>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Process Name</Th>
            <Th>Owner</Th>
            <Th>Impact Analysis</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {processes.map((process) => (
            <Tr key={process._id}>
              <Td>{process.processName}</Td>
              <Td>{process.owner}</Td>
              <Td>{process.impactAnalysisCompleted ? 'Completed' : 'Pending'}</Td>
              <Td>
                <Button onClick={() => handleEdit(process)}>Edit</Button>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Business Process</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Process Name</FormLabel>
                <Input name="processName" value={editingProcess?.processName || ''} onChange={handleChange} />
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea name="description" value={editingProcess?.description || ''} onChange={handleChange} />
              </FormControl>
              <FormControl>
                <FormLabel>Owner</FormLabel>
                <Input name="owner" value={editingProcess?.owner || ''} onChange={handleChange} />
              </FormControl>
              {/* Add more fields as needed */}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={handleSave}>
              Save
            </Button>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default BusinessProcessList;
