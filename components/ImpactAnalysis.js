import { useState } from 'react';
import { Box, Button, FormControl, FormLabel, Input, VStack, Text } from '@chakra-ui/react';

export default function ImpactAnalysis() {
  const [formData, setFormData] = useState({
    financialImpact: '',
    reputationImpact: '',
    operationalImpact: '',
    downtimeHours: '',
    costPerHour: '',
  });
  const [totalImpact, setTotalImpact] = useState(0);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/save-impact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        const data = await response.json();
        setTotalImpact(data.totalImpact);
      } else {
        throw new Error('Failed to save impact analysis');
      }
    } catch (error) {
      console.error('Error saving impact analysis:', error);
    }
  };

  return (
    <Box>
      <form onSubmit={handleSubmit}>
        <VStack spacing={4} align="stretch">
          <FormControl>
            <FormLabel>Financial Impact ($)</FormLabel>
            <Input type="number" name="financialImpact" value={formData.financialImpact} onChange={handleInputChange} required />
          </FormControl>
          <FormControl>
            <FormLabel>Reputation Impact (0-4)</FormLabel>
            <Input type="number" name="reputationImpact" min="0" max="4" value={formData.reputationImpact} onChange={handleInputChange} required />
          </FormControl>
          <FormControl>
            <FormLabel>Operational Impact (0-4)</FormLabel>
            <Input type="number" name="operationalImpact" min="0" max="4" value={formData.operationalImpact} onChange={handleInputChange} required />
          </FormControl>
          <FormControl>
            <FormLabel>Downtime (hours)</FormLabel>
            <Input type="number" name="downtimeHours" value={formData.downtimeHours} onChange={handleInputChange} required />
          </FormControl>
          <FormControl>
            <FormLabel>Cost Per Hour of Downtime ($)</FormLabel>
            <Input type="number" name="costPerHour" value={formData.costPerHour} onChange={handleInputChange} required />
          </FormControl>
          <Button type="submit" colorScheme="blue">Submit</Button>
        </VStack>
      </form>
      <Text mt={4}>Total Impact: ${totalImpact.toFixed(2)}</Text>
    </Box>
  );
}
