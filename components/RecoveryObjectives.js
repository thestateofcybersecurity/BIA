import { useState } from 'react';
import { Box, Button, FormControl, FormLabel, Input, VStack, Text } from '@chakra-ui/react';

export default function RecoveryObjectives() {
  const [formData, setFormData] = useState({
    expectedRTO: '',
    actualRTO: '',
    expectedRPO: '',
    actualRPO: '',
  });
  const [gaps, setGaps] = useState({ rtoGap: 0, rpoGap: 0 });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/save-recovery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        const data = await response.json();
        setGaps({ rtoGap: data.rtoGap, rpoGap: data.rpoGap });
      } else {
        throw new Error('Failed to save recovery objectives');
      }
    } catch (error) {
      console.error('Error saving recovery objectives:', error);
    }
  };

  return (
    <Box>
      <form onSubmit={handleSubmit}>
        <VStack spacing={4} align="stretch">
          <FormControl>
            <FormLabel>Expected RTO (hours)</FormLabel>
            <Input type="number" name="expectedRTO" value={formData.expectedRTO} onChange={handleInputChange} required />
          </FormControl>
          <FormControl>
            <FormLabel>Actual RTO (hours)</FormLabel>
            <Input type="number" name="actualRTO" value={formData.actualRTO} onChange={handleInputChange} required />
          </FormControl>
          <FormControl>
            <FormLabel>Expected RPO (hours)</FormLabel>
            <Input type="number" name="expectedRPO" value={formData.expectedRPO} onChange={handleInputChange} required />
          </FormControl>
          <FormControl>
            <FormLabel>Actual RPO (hours)</FormLabel>
            <Input type="number" name="actualRPO" value={formData.actualRPO} onChange={handleInputChange} required />
          </FormControl>
          <Button type="submit" colorScheme="blue">Submit</Button>
        </VStack>
      </form>
      <Text mt={4}>RTO Gap: {gaps.rtoGap} hours</Text>
      <Text>RPO Gap: {gaps.rpoGap} hours</Text>
    </Box>
  );
}
