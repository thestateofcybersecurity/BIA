import React, { useState, useEffect } from 'react';
import {
  Box, Button, Table, Thead, Tbody, Tr, Th, Td, Input, VStack,
  useToast, Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton
} from '@chakra-ui/react';
import axios from 'axios';
import { ProcessDependency } from '@/types/ProcessDependency';

interface ProcessesAndDependenciesProps {
  processes: ProcessDependency[];
  setProcesses: React.Dispatch<React.SetStateAction<ProcessDependency[]>>;
}

const ProcessesAndDependencies: React.FC<ProcessesAndDependenciesProps> = ({ processes, setProcesses }) => {
  const [newProcess, setNewProcess] = useState<ProcessDependency>({
    id: 0,
    processFunction: '',
    description: '',
    processOwner: '',
    clientFacingAvailabilityRequirements: '',
    additionalAvailabilityRequirements: '',
    peoplePrimary: '',
    peopleAlternatives: '',
    itPrimary: '',
    itAlternatives: '',
    devicesPrimary: '',
    devicesAlternatives: '',
    facilityPrimary: '',
    facilityAlternatives: '',
    suppliersPrimary: '',
    suppliersAlternatives: '',
    additionalPrimary: '',
    additionalAlternatives: '',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState<ProcessDependency | null>(null);
  const toast = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewProcess(prev => ({ ...prev, [name]: value }));
  };

  const handleAddProcess = async () => {
    try {
      const response = await axios.post('/api/processes', newProcess);
      setProcesses(prev => [...prev, response.data]);
      setNewProcess({
        id: 0,
        processFunction: '',
        description: '',
        processOwner: '',
        clientFacingAvailabilityRequirements: '',
        additionalAvailabilityRequirements: '',
        peoplePrimary: '',
        peopleAlternatives: '',
        itPrimary: '',
        itAlternatives: '',
        devicesPrimary: '',
        devicesAlternatives: '',
        facilityPrimary: '',
        facilityAlternatives: '',
        suppliersPrimary: '',
        suppliersAlternatives: '',
        additionalPrimary: '',
        additionalAlternatives: '',
      });
      toast({
        title: 'Success',
        description: 'Process added successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error adding process:', error);
      toast({
        title: 'Error',
        description: 'Failed to add process',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleEditProcess = (process: ProcessDependency) => {
    setEditingProcess(process);
    setIsModalOpen(true);
  };

  const handleUpdateProcess = async () => {
    if (!editingProcess) return;

    try {
      const response = await axios.put(`/api/processes/${editingProcess.id}`, editingProcess);
      setProcesses(prev => prev.map(p => p.id === editingProcess.id ? response.data : p));
      setIsModalOpen(false);
      toast({
        title: 'Success',
        description: 'Process updated successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error updating process:', error);
      toast({
        title: 'Error',
        description: 'Failed to update process',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <VStack spacing={4} align="stretch">
      <Box overflowX="auto">
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>ID</Th>
              <Th>Process/Function</Th>
              <Th>Description</Th>
              <Th>Process Owner</Th>
              <Th>Client-Facing Availability Requirements</Th>
              <Th>Additional Availability Requirements</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {processes.map((process) => (
              <Tr key={process.id}>
                <Td>{process.id}</Td>
                <Td>{process.processFunction}</Td>
                <Td>{process.description}</Td>
                <Td>{process.processOwner}</Td>
                <Td>{process.clientFacingAvailabilityRequirements}</Td>
                <Td>{process.additionalAvailabilityRequirements}</Td>
                <Td>
                  <Button onClick={() => handleEditProcess(process)}>Edit</Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
      <Button onClick={handleAddProcess} colorScheme="blue">Add Process</Button>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Process</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {editingProcess && (
              <VStack spacing={4}>
                <Input
                  placeholder="Process/Function"
                  value={editingProcess.processFunction}
                  onChange={(e) => setEditingProcess({ ...editingProcess, processFunction: e.target.value })}
                />
                <Input
                  placeholder="Description"
                  value={editingProcess.description}
                  onChange={(e) => setEditingProcess({ ...editingProcess, description: e.target.value })}
                />
                <Input
                  placeholder="Process Owner"
                  value={editingProcess.processOwner}
                  onChange={(e) => setEditingProcess({ ...editingProcess, processOwner: e.target.value })}
                />
                <Input
                  placeholder="Client-Facing Availability Requirements"
                  value={editingProcess.clientFacingAvailabilityRequirements}
                  onChange={(e) => setEditingProcess({ ...editingProcess, clientFacingAvailabilityRequirements: e.target.value })}
                />
                <Input
                  placeholder="Additional Availability Requirements"
                  value={editingProcess.additionalAvailabilityRequirements}
                  onChange={(e) => setEditingProcess({ ...editingProcess, additionalAvailabilityRequirements: e.target.value })}
                />
                {/* Add more fields for dependencies here */}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={handleUpdateProcess}>
              Update
            </Button>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
};

export default ProcessesAndDependencies;
