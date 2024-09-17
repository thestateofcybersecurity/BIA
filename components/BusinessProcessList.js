// components/BusinessProcessList.js
import React, { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import {Box, Button, Table, Thead, Tbody, Tr, Th, Td, Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, useDisclosure, FormControl, FormLabel, Input, Textarea, VStack } from '@chakra-ui/react';
import axios from 'axios';

const BusinessProcessList = () => {
  const { user, error, isLoading } = useUser();
  const [processes, setProcesses] = useState([]);
  const [editingProcess, setEditingProcess] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    if (user) {
      fetchProcesses();
    }
  }, [user]);

  const fetchProcesses = async () => {
    try {
      const response = await axios.get('/api/business-processes');
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
      await axios.put(`/api/business-processes/${editingProcess._id}`, editingProcess);
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

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error.message}</div>;

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
