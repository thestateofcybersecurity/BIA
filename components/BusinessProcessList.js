import React, { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
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
  HStack,
  IconButton,
  useToast,
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';
import axios from 'axios';

const BusinessProcessList = () => {
  const { user, error, isLoading } = useUser();
  const [processes, setProcesses] = useState([]);
  const [editingProcess, setEditingProcess] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  useEffect(() => {
    if (user) {
      fetchProcesses();
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

  const handleEdit = (process) => {
    setEditingProcess(process);
    onOpen();
  };

  const handleSave = async () => {
    try {
      await axios.put(`/api/business-process/${editingProcess._id}`, editingProcess);
      onClose();
      fetchProcesses();
      toast({
        title: 'Success',
        description: 'Business process updated successfully.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error updating process:', error);
      toast({
        title: 'Error',
        description: 'Failed to update business process.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditingProcess(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDependencyChange = (type, index, value) => {
    setEditingProcess(prev => ({
      ...prev,
      dependencies: {
        ...prev.dependencies,
        [type]: prev.dependencies[type].map((item, i) => i === index ? value : item)
      }
    }));
  };

  const addDependency = (type) => {
    setEditingProcess(prev => ({
      ...prev,
      dependencies: {
        ...prev.dependencies,
        [type]: [...prev.dependencies[type], '']
      }
    }));
  };

  const removeDependency = (type, index) => {
    setEditingProcess(prev => ({
      ...prev,
      dependencies: {
        ...prev.dependencies,
        [type]: prev.dependencies[type].filter((_, i) => i !== index)
      }
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
            <Th>Recovery Workflow</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {processes.map((process) => (
            <Tr key={process._id}>
              <Td>{process.processName}</Td>
              <Td>{process.owner}</Td>
              <Td>{process.impactAnalysisCompleted ? 'Completed' : 'Pending'}</Td>
              <Td>{process.recoveryWorkflow ? 'Completed' : 'Pending'}</Td>
              <Td>
                <Button onClick={() => handleEdit(process)}>Edit</Button>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <Modal isOpen={isOpen} onClose={onClose} size="xl">
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
              
              {editingProcess && Object.entries(editingProcess.dependencies).map(([type, dependencies]) => (
                <FormControl key={type}>
                  <FormLabel>{type.charAt(0).toUpperCase() + type.slice(1)}</FormLabel>
                  {dependencies.map((dep, index) => (
                    <HStack key={index} mt={2}>
                      <Input
                        value={dep}
                        onChange={(e) => handleDependencyChange(type, index, e.target.value)}
                      />
                      <IconButton
                        icon={<DeleteIcon />}
                        onClick={() => removeDependency(type, index)}
                        aria-label="Remove dependency"
                      />
                    </HStack>
                  ))}
                  <Button leftIcon={<AddIcon />} onClick={() => addDependency(type)} mt={2}>
                    Add {type}
                  </Button>
                </FormControl>
              ))}
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
