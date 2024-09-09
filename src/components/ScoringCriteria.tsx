import React, { useState, useEffect } from 'react';
import {
  Box, Table, Thead, Tbody, Tr, Th, Td, Input,
  Button, Heading
} from '@chakra-ui/react';
import axios from 'axios';

interface ScoringCriteria {
  score: number;
  levelOfImpact: string;
  lossOfRevenue: number;
  lossOfProductivity: number;
  increasedOperatingCosts: number;
  financialPenalties: number;
  impactOnCustomers: string;
  impactOnInternalStaff: string;
  impactOnBusinessPartners: string;
  compliance: string;
  healthOrSafetyRisk: string;
  likelihoodOfIncident: string;
  impactOfIncident: string;
}

const ScoringCriteria: React.FC = () => {
  const [criteria, setCriteria] = useState<ScoringCriteria[]>([]);

  useEffect(() => {
    fetchCriteria();
  }, []);

  const fetchCriteria = async () => {
    try {
      const response = await axios.get('/api/scoring-criteria');
      setCriteria(response.data);
    } catch (error) {
      console.error('Error fetching scoring criteria:', error);
    }
  };

  const handleInputChange = (index: number, field: keyof ScoringCriteria, value: string | number) => {
    const updatedCriteria = [...criteria];
    updatedCriteria[index][field] = value as never;
    setCriteria(updatedCriteria);
  };

  const handleSave = async () => {
    try {
      await axios.post('/api/scoring-criteria', criteria);
      alert('Scoring criteria saved successfully');
    } catch (error) {
      console.error('Error saving scoring criteria:', error);
      alert('Error saving scoring criteria');
    }
  };

  return (
    <Box>
      <Heading as="h2" size="lg" mb={4}>Scoring Criteria</Heading>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Score</Th>
            <Th>Level of Impact</Th>
            <Th>Loss of Revenue</Th>
            <Th>Loss of Productivity</Th>
            <Th>Increased Operating Costs</Th>
            <Th>Financial Penalties</Th>
            <Th>Impact on Customers</Th>
            <Th>Impact on Internal Staff</Th>
            <Th>Impact on Business Partners</Th>
            <Th>Compliance</Th>
            <Th>Health or Safety Risk</Th>
            <Th>Likelihood of Incident</Th>
            <Th>Impact of Incident</Th>
          </Tr>
        </Thead>
        <Tbody>
          {criteria.map((criterion, index) => (
            <Tr key={index}>
              <Td><Input value={criterion.score} onChange={(e) => handleInputChange(index, 'score', parseFloat(e.target.value))} /></Td>
              <Td><Input value={criterion.levelOfImpact} onChange={(e) => handleInputChange(index, 'levelOfImpact', e.target.value)} /></Td>
              <Td><Input value={criterion.lossOfRevenue} onChange={(e) => handleInputChange(index, 'lossOfRevenue', parseFloat(e.target.value))} /></Td>
              <Td><Input value={criterion.lossOfProductivity} onChange={(e) => handleInputChange(index, 'lossOfProductivity', parseFloat(e.target.value))} /></Td>
              <Td><Input value={criterion.increasedOperatingCosts} onChange={(e) => handleInputChange(index, 'increasedOperatingCosts', parseFloat(e.target.value))} /></Td>
              <Td><Input value={criterion.financialPenalties} onChange={(e) => handleInputChange(index, 'financialPenalties', parseFloat(e.target.value))} /></Td>
              <Td><Input value={criterion.impactOnCustomers} onChange={(e) => handleInputChange(index, 'impactOnCustomers', e.target.value)} /></Td>
              <Td><Input value={criterion.impactOnInternalStaff} onChange={(e) => handleInputChange(index, 'impactOnInternalStaff', e.target.value)} /></Td>
              <Td><Input value={criterion.impactOnBusinessPartners} onChange={(e) => handleInputChange(index, 'impactOnBusinessPartners', e.target.value)} /></Td>
              <Td><Input value={criterion.compliance} onChange={(e) => handleInputChange(index, 'compliance', e.target.value)} /></Td>
              <Td><Input value={criterion.healthOrSafetyRisk} onChange={(e) => handleInputChange(index, 'healthOrSafetyRisk', e.target.value)} /></Td>
              <Td><Input value={criterion.likelihoodOfIncident} onChange={(e) => handleInputChange(index, 'likelihoodOfIncident', e.target.value)} /></Td>
              <Td><Input value={criterion.impactOfIncident} onChange={(e) => handleInputChange(index, 'impactOfIncident', e.target.value)} /></Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
      <Button mt={4} onClick={handleSave}>Save Scoring Criteria</Button>
    </Box>
  );
};

export default ScoringCriteria;
