import React, { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { Box, Button, FormControl, FormLabel, Input, Textarea, Heading, VStack, HStack, Text, IconButton } from '@chakra-ui/react';
import BusinessProcessList from '../components/BusinessProcessList';
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';
import CSVUpload from '../components/CSVUpload';
import Header from '../components/Header';
import axios from 'axios';

const BusinessProcessForm = () => {
  const { user, error, isLoading } = useUser();
  const [processes, setProcesses] = useState([]);
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

  useEffect(() => {
    if (user) fetchProcesses();
  }, [user]);

  const fetchProcesses = async () => {
    try {
      const response = await axios.get('/api/business-process');
      setProcesses(response.data.data);
    } catch (error) {
      console.error('Error fetching processes:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/business-process', formData);
      if (response.data.success) {
        alert('Business process saved successfully!');
        fetchProcesses();
        resetForm();
      } else {
        throw new Error(response.data.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to save business process. Please try again.');
    }
  };
  
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

  const handleCSVUploadComplete = () => {
    fetchProcesses();
  };
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error.message}</div>;

  return (
    <Box>
      <Header />
      <Box className="container" bg="white" p={6} rounded="md" shadow="md">
        <Heading as="h2" size="lg" mb={6}>Business Process Assessment</Heading>
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

            <Heading as="h3" size="md" mt={6}>Dependencies</Heading>

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

            <Button type="submit" colorScheme="blue" rounded="md" size="lg">Save Business Process</Button>
          </VStack>
        </form>

        <Heading as="h3" size="md" mt={6}>Bulk Upload</Heading>
        <CSVUpload onUploadComplete={handleCSVUploadComplete} />

        <Heading as="h3" size="md" mt={6}>Submitted Processes</Heading>
        {processes.map((process) => (
          <Box key={process._id} mt={4} p={4} border="1px" borderColor="gray.200" borderRadius="md">
            <Text><strong>Name:</strong> {process.processName}</Text>
            <Text><strong>Owner:</strong> {process.owner}</Text>
            <Text><strong>Description:</strong> {process.description}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default BusinessProcessForm;
