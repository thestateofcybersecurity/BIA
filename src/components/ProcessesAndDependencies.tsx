import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Table, Thead, Tbody, Tr, Th, Td, Input, VStack,
  useToast
} from '@chakra-ui/react';
import axios from 'axios';

interface ProcessDependency {
  id: number;
  processFunction: string;
  description: string;
  processOwner: string;
  peoplePrimary: string;
  peopleAlternatives: string;
  itPrimary: string;
  itAlternatives: string;
  devicesPrimary: string;
  devicesAlternatives: string;
  facilityPrimary: string;
  facilityAlternatives: string;
  suppliersPrimary: string;
  suppliersAlternatives: string;
  additionalPrimary: string;
  additionalAlternatives: string;
}

const ProcessesAndDependencies: React.FC = () => {
  const [processes, setProcesses] = useState<ProcessDependency[]>([]);
  const [newProcess, setNewProcess] = useState<ProcessDependency>({
    id: 0,
    processFunction: '',
    description: '',
    processOwner: '',
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
  const toast = useToast();

  const fetchProcesses = useCallback(async () => {
    try {
      const response = await axios.get('/api/processes');
      setProcesses(response.data);
    } catch (error) {
      console.error('Error fetching processes:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch processes',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchProcesses();
  }, [fetchProcesses]);

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
              <Th>People Primary</Th>
              <Th>People Alternatives</Th>
              <Th>IT Primary</Th>
              <Th>IT Alternatives</Th>
              <Th>Devices Primary</Th>
              <Th>Devices Alternatives</Th>
              <Th>Facility Primary</Th>
              <Th>Facility Alternatives</Th>
              <Th>Suppliers Primary</Th>
              <Th>Suppliers Alternatives</Th>
              <Th>Additional Primary</Th>
              <Th>Additional Alternatives</Th>
            </Tr>
          </Thead>
          <Tbody>
            {processes.map((process) => (
              <Tr key={process.id}>
                <Td>{process.id}</Td>
                <Td>{process.processFunction}</Td>
                <Td>{process.description}</Td>
                <Td>{process.processOwner}</Td>
                <Td>{process.peoplePrimary}</Td>
                <Td>{process.peopleAlternatives}</Td>
                <Td>{process.itPrimary}</Td>
                <Td>{process.itAlternatives}</Td>
                <Td>{process.devicesPrimary}</Td>
                <Td>{process.devicesAlternatives}</Td>
                <Td>{process.facilityPrimary}</Td>
                <Td>{process.facilityAlternatives}</Td>
                <Td>{process.suppliersPrimary}</Td>
                <Td>{process.suppliersAlternatives}</Td>
                <Td>{process.additionalPrimary}</Td>
                <Td>{process.additionalAlternatives}</Td>
              </Tr>
            ))}
            <Tr>
              <Td><Input name="id" value={newProcess.id} onChange={handleInputChange} placeholder="ID" /></Td>
              <Td><Input name="processFunction" value={newProcess.processFunction} onChange={handleInputChange} placeholder="Process/Function" /></Td>
              <Td><Input name="description" value={newProcess.description} onChange={handleInputChange} placeholder="Description" /></Td>
              <Td><Input name="processOwner" value={newProcess.processOwner} onChange={handleInputChange} placeholder="Process Owner" /></Td>
              <Td><Input name="peoplePrimary" value={newProcess.peoplePrimary} onChange={handleInputChange} placeholder="People Primary" /></Td>
              <Td><Input name="peopleAlternatives" value={newProcess.peopleAlternatives} onChange={handleInputChange} placeholder="People Alternatives" /></Td>
              <Td><Input name="itPrimary" value={newProcess.itPrimary} onChange={handleInputChange} placeholder="IT Primary" /></Td>
              <Td><Input name="itAlternatives" value={newProcess.itAlternatives} onChange={handleInputChange} placeholder="IT Alternatives" /></Td>
              <Td><Input name="devicesPrimary" value={newProcess.devicesPrimary} onChange={handleInputChange} placeholder="Devices Primary" /></Td>
              <Td><Input name="devicesAlternatives" value={newProcess.devicesAlternatives} onChange={handleInputChange} placeholder="Devices Alternatives" /></Td>
              <Td><Input name="facilityPrimary" value={newProcess.facilityPrimary} onChange={handleInputChange} placeholder="Facility Primary" /></Td>
              <Td><Input name="facilityAlternatives" value={newProcess.facilityAlternatives} onChange={handleInputChange} placeholder="Facility Alternatives" /></Td>
              <Td><Input name="suppliersPrimary" value={newProcess.suppliersPrimary} onChange={handleInputChange} placeholder="Suppliers Primary" /></Td>
              <Td><Input name="suppliersAlternatives" value={newProcess.suppliersAlternatives} onChange={handleInputChange} placeholder="Suppliers Alternatives" /></Td>
              <Td><Input name="additionalPrimary" value={newProcess.additionalPrimary} onChange={handleInputChange} placeholder="Additional Primary" /></Td>
              <Td><Input name="additionalAlternatives" value={newProcess.additionalAlternatives} onChange={handleInputChange} placeholder="Additional Alternatives" /></Td>
            </Tr>
          </Tbody>
        </Table>
      </Box>
      <Button onClick={handleAddProcess} colorScheme="blue">Add Process</Button>
    </VStack>
  );
};

export default ProcessesAndDependencies;
