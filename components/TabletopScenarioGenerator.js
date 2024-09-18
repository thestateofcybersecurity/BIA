// components/TabletopScenarioGenerator.js
import React, { useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  VStack,
  Text,
  useToast,
} from '@chakra-ui/react';
import axios from 'axios';

const TabletopScenarioGenerator = () => {
  const { user } = useUser();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    attackVector: '',
    businessImpact: '',
    irExperience: '',
    securityMaturity: '',
    complianceRequirements: '',
    riskTolerance: '',
  });
  const [generatedScenario, setGeneratedScenario] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await axios.post('/api/tabletop-scenario', {
        ...formData,
        generateScenario: true,
      }, {
        responseType: 'stream',
      });

      let result = '';
      const reader = response.data.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value);
        setGeneratedScenario(JSON.parse(result));
      }

      toast({
        title: 'Success',
        description: 'Tabletop scenario generated successfully.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error generating scenario:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate tabletop scenario.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveScenario = async () => {
    try {
      await axios.post('/api/tabletop-scenario', generatedScenario);
      toast({
        title: 'Success',
        description: 'Tabletop scenario saved successfully.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error saving scenario:', error);
      toast({
        title: 'Error',
        description: 'Failed to save tabletop scenario.',
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
          <FormControl>
            <FormLabel>Title</FormLabel>
            <Input name="title" value={formData.title} onChange={handleChange} />
          </FormControl>
          <FormControl>
            <FormLabel>Description</FormLabel>
            <Textarea name="description" value={formData.description} onChange={handleChange} />
          </FormControl>
          <FormControl>
            <FormLabel>IR Experience</FormLabel>
            <Select name="irExperience" value={formData.irExperience} onChange={handleChange}>
              <option value="">Select level</option>
              <option value="Novice">Novice</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Expert">Expert</option>
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Security Maturity</FormLabel>
            <Select name="securityMaturity" value={formData.securityMaturity} onChange={handleChange}>
              <option value="">Select level</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Compliance Requirements</FormLabel>
            <Input name="complianceRequirements" value={formData.complianceRequirements} onChange={handleChange} />
          </FormControl>
          <FormControl>
            <FormLabel>Risk Tolerance</FormLabel>
            <Select name="riskTolerance" value={formData.riskTolerance} onChange={handleChange}>
              <option value="">Select level</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </Select>
          </FormControl>
          <Button type="submit" colorScheme="blue" isLoading={isLoading}>Generate Scenario</Button>
        </VStack>
      </form>

      {generatedScenario && (
        <Box mt={6}>
          <Text fontSize="xl" fontWeight="bold">{generatedScenario.title}</Text>
          <Text mt={2}>{generatedScenario.description}</Text>
          <Text mt={2}><strong>Attack Vector:</strong> {generatedScenario.attackVector}</Text>
          <Text mt={2}><strong>Business Impact:</strong> {generatedScenario.businessImpact}</Text>
          <Button mt={4} colorScheme="green" onClick={saveScenario}>Save Scenario</Button>
        </Box>
      )}
    </Box>
  );
};

export default TabletopScenarioGenerator;
