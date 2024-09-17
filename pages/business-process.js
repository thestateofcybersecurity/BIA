import React, { useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { Box, Button, FormControl, FormLabel, Input, Textarea, Heading, VStack } from '@chakra-ui/react';
import BusinessProcessList from '../components/BusinessProcessList';
import CSVUpload from '../components/CSVUpload';
import Header from '../components/Header';

const BusinessProcessForm = () => {
  const { user, error, isLoading } = useUser();
  const [formData, setFormData] = useState({
    processName: '',
    description: '',
    owner: '',
    dependencies: {
      people: '',
      itApplications: '',
      devices: '',
      facilityLocation: '',
      suppliers: ''
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/index?path=businessProcess', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.sub,
          ...formData
        }),
      });
      if (response.ok) {
        alert('Business process saved successfully!');
      } else {
        throw new Error('Failed to save business process');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to save business process. Please try again.');
    }
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
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

          <FormControl id="people">
            <FormLabel>People</FormLabel>
            <Input type="text" name="dependencies.people" onChange={handleChange} value={formData.dependencies.people} />
          </FormControl>
          
          <FormControl id="itApplications">
            <FormLabel>IT Applications</FormLabel>
            <Input type="text" name="dependencies.itApplications" onChange={handleChange} value={formData.dependencies.itApplications} />
          </FormControl>

          <FormControl id="devices">
            <FormLabel>Devices/Equipment</FormLabel>
            <Input type="text" name="dependencies.devices" onChange={handleChange} value={formData.dependencies.devices} />
          </FormControl>

          <FormControl id="facilityLocation">
            <FormLabel>Facility Location</FormLabel>
            <Input type="text" name="dependencies.facilityLocation" onChange={handleChange} value={formData.dependencies.facilityLocation} />
          </FormControl>

          <FormControl id="suppliers">
            <FormLabel>Suppliers</FormLabel>
            <Input type="text" name="dependencies.suppliers" onChange={handleChange} value={formData.dependencies.suppliers} />
          </FormControl>

          <Button type="submit" colorScheme="blue" rounded="md" size="lg">Save Business Process</Button>
        </VStack>
        </form>
      </Box>
    </Box>
  );
};

export default BusinessProcessForm;
