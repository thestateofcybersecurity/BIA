// components/RecoveryWorkflow.js (Handle auto-generated steps)
import React, { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  HStack,
  IconButton,
  useToast,
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';
import axios from 'axios';

const RecoveryWorkflow = ({ businessProcessId }) => {
  const { user } = useUser();
  const [steps, setSteps] = useState([]);
  const toast = useToast();

  useEffect(() => {
    if (businessProcessId) {
      fetchWorkflow();
    }
  }, [businessProcessId]);

  const fetchWorkflow = async () => {
    try {
      const response = await axios.get(`/api/recovery-workflow?businessProcessId=${businessProcessId}`);
      if (response.data.success && response.data.data) {
        setSteps(response.data.data.recoverySteps);
      }
    } catch (error) {
      console.error('Error fetching recovery workflow:', error);
    }
  };

  const handleStepChange = (index, field, value) => {
    const updatedSteps = [...steps];
    updatedSteps[index][field] = value;
    setSteps(updatedSteps);
  };

  const addStep = () => {
    setSteps([...steps, { 
      stepNumber: steps.length + 1,
      description: '',
      responsibleTeam: '',
      estimatedCompletionTime: '',
      dependencies: {
        people: [],
        itApplications: [],
        devices: [],
        facilities: [],
        suppliers: []
      },
      alternateStaff: []
    }]);
  };

  const removeStep = (index) => {
    const updatedSteps = steps.filter((_, i) => i !== index);
    updatedSteps.forEach((step, i) => step.stepNumber = i + 1);
    setSteps(updatedSteps);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
            const response = await axios.post('/api/recovery-workflow', {
        businessProcessId,
        recoverySteps: steps,
      });
      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Recovery workflow saved successfully.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error saving recovery workflow:', error);
      toast({
        title: 'Error',
        description: 'Failed to save recovery workflow.',
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
          {steps.map((step, index) => (
            <Box key={index} p={4} borderWidth={1} borderRadius="md">
              <HStack justifyContent="space-between" mb={2}>
                <FormControl>
                  <FormLabel>Step {step.stepNumber}</FormLabel>
                  <Input
                    value={step.description}
                    onChange={(e) => handleStepChange(index, 'description', e.target.value)}
                    placeholder="Step description"
                  />
                </FormControl>
                <IconButton
                  icon={<DeleteIcon />}
                  onClick={() => removeStep(index)}
                  aria-label="Remove step"
                />
              </HStack>
              <FormControl mt={2}>
                <FormLabel>Responsible Team</FormLabel>
                <Input
                  value={step.responsibleTeam}
                  onChange={(e) => handleStepChange(index, 'responsibleTeam', e.target.value)}
                />
              </FormControl>
              <FormControl mt={2}>
                <FormLabel>Estimated Completion Time (hours)</FormLabel>
                <Input
                  type="number"
                  value={step.estimatedCompletionTime}
                  onChange={(e) => handleStepChange(index, 'estimatedCompletionTime', e.target.value)}
                />
              </FormControl>
              {/* Dependencies input fields */}
              <FormControl mt={2}>
                <FormLabel>People Dependencies</FormLabel>
                <Input
                  value={step.dependencies.people.join(', ')}
                  onChange={(e) => handleStepChange(index, 'dependencies.people', e.target.value.split(', '))}
                />
              </FormControl>
              <FormControl mt={2}>
                <FormLabel>IT Applications</FormLabel>
                <Input
                  value={step.dependencies.itApplications.join(', ')}
                  onChange={(e) => handleStepChange(index, 'dependencies.itApplications', e.target.value.split(', '))}
                />
              </FormControl>
              <FormControl mt={2}>
                <FormLabel>Devices</FormLabel>
                <Input
                  value={step.dependencies.devices.join(', ')}
                  onChange={(e) => handleStepChange(index, 'dependencies.devices', e.target.value.split(', '))}
                />
              </FormControl>
              <FormControl mt={2}>
                <FormLabel>Facilities</FormLabel>
                <Input
                  value={step.dependencies.facilities.join(', ')}
                  onChange={(e) => handleStepChange(index, 'dependencies.facilities', e.target.value.split(', '))}
                />
              </FormControl>
              <FormControl mt={2}>
                <FormLabel>Suppliers</FormLabel>
                <Input
                  value={step.dependencies.suppliers.join(', ')}
                  onChange={(e) => handleStepChange(index, 'dependencies.suppliers', e.target.value.split(', '))}
                />
              </FormControl>
              <FormControl mt={2}>
                <FormLabel>Alternate Staff</FormLabel>
                <Input
                  value={step.alternateStaff.join(', ')}
                  onChange={(e) => handleStepChange(index, 'alternateStaff', e.target.value.split(', '))}
                />
              </FormControl>
            </Box>
          ))}
          <Button leftIcon={<AddIcon />} onClick={addStep}>
            Add Step
          </Button>
          <Button type="submit" colorScheme="blue">Save Recovery Workflow</Button>
        </VStack>
      </form>
    </Box>
  );
};

export default RecoveryWorkflow;
