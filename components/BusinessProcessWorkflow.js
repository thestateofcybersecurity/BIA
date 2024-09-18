import React, { useState } from 'react';
import { Box, Button, FormControl, FormLabel, Input, Textarea, VStack, HStack, IconButton, useToast } from '@chakra-ui/react';
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';
import axios from 'axios';

const BusinessProcessWorkflow = ({ onProcessAdded }) => {
  const [formData, setFormData] = useState({
    processName: '',
    description: '',
    owner: '',
    dependencies: {
      people: [''],
      itApplications: [''],
      devices: [''],
      facilityLocation: [''],
      suppliers: ['']
    }
  });
  const toast = useToast();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDependencyChange = (type, index, value) => {
    setFormData(prev => ({
      ...prev,
      dependencies: {
        ...prev.dependencies,
        [type]: prev.dependencies[type].map((item, i) => i === index ? value : item)
      }
    }));
  };

  const addDependency = (type) => {
    setFormData(prev => ({
      ...prev,
      dependencies: {
        ...prev.dependencies,
        [type]: [...prev.dependencies[type], '']
      }
    }));
  };

  const removeDependency = (type, index) => {
    setFormData(prev => ({
      ...prev,
      dependencies: {
        ...prev.dependencies,
        [type]: prev.dependencies[type].filter((_, i) => i !== index)
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/business-process', formData);
      if (response.data.success) {
        toast({
          title: 'Business process saved.',
          description: 'The business process has been successfully saved.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        resetForm();
        onProcessAdded();
      } else {
        throw new Error(response.data.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save business process. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const resetForm = () => {
    setFormData({
      processName: '',
      description: '',
      owner: '',
      dependencies: {
        people: [''],
        itApplications: [''],
        devices: [''],
        facilityLocation: [''],
        suppliers: ['']
      }
    });
  };

  return (
    <Box>
      <form onSubmit={handleSubmit}>
        <VStack spacing={4} align="flex-start">
          <FormControl id="processName" isRequired>
            <FormLabel>Process/Function</FormLabel>
            <Input type="text" name="processName" onChange={handleChange} value={formData.processName} />
          </FormControl>
          
          <FormControl id="description" isRequired>
            <FormLabel>Description</FormLabel>
            <Textarea name="description" onChange={handleChange} value={formData.description} />
          </FormControl>
          
          <FormControl id="owner" isRequired>
            <FormLabel>Process Owner</FormLabel>
            <Input type="text" name="owner" onChange={handleChange} value={formData.owner} />
          </FormControl>

          {Object.entries(formData.dependencies).map(([type, dependencies]) => (
            <FormControl key={type}>
              <FormLabel>{type.charAt(0).toUpperCase() + type.slice(1)}</FormLabel>
              {dependencies.map((dep, index) => (
                <HStack key={index} mt={2}>
                  <Input
                    type="text"
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

          <Button type="submit" colorScheme="blue">Save Business Process</Button>
        </VStack>
      </form>
    </Box>
  );
};

export default BusinessProcessWorkflow;
