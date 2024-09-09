import React, { useState, useEffect } from 'react';
import {
  Box, Button, FormControl, FormLabel, VStack, Select,
  Table, Thead, Tbody, Tr, Th, Td
} from '@chakra-ui/react';
import axios from 'axios';
import { ProcessDependency } from '@/types/ProcessDependency';

interface ImpactAnalysisProps {
  processes: ProcessDependency[];
}

interface ImpactAnalysis {
  id: number;
  processFunction: string;
  description: string;
  processOwner: string;
  clientFacingAvailabilityRequirements: string;
  additionalAvailabilityRequirements: string;
  criticalityRating: string;
  totalCostOfDowntimePer24Hours: number;
  totalImpactOnGoodwillComplianceAndSafety: number;
  lossOfRevenue: number;
  lossOfProductivity: number;
  increasedOperatingCosts: number;
  financialPenalties: number;
  impactOnCustomers: number;
  impactOnInternalStaff: number;
  impactOnBusinessPartners: number;
  compliance: number;
  healthOrSafetyRisk: number;
  dependencies: string;
  acceptableDowntimeRTO: number;
  acceptableDataLossRPO: number;
  actualCurrentDowntimeRTA: number;
  actualCurrentDataLossRPA: number;
  acceptableRepatriationDowntimeRTO: number;
  acceptableRepatriationDataLossRPO: number;
  actualRepatriationDowntimeRTA: number;
  actualRepatriationDataLossRPA: number;
}

export default function ImpactAnalysis({ processes }: ImpactAnalysisProps) {
  const [impactAnalyses, setImpactAnalyses] = useState<ImpactAnalysis[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<ImpactAnalysis | null>(null);

  useEffect(() => {
    fetchImpactAnalyses();
  }, []);

  const fetchImpactAnalyses = async () => {
    try {
      const response = await axios.get('/api/impact-analyses');
      setImpactAnalyses(response.data);
    } catch (error) {
      console.error('Error fetching impact analyses:', error);
    }
  };

  const handleInputChange = (field: keyof ImpactAnalysis, value: string | number) => {
    if (currentAnalysis) {
      setCurrentAnalysis({ ...currentAnalysis, [field]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentAnalysis) {
      try {
        if (currentAnalysis.id) {
          await axios.put(`/api/impact-analyses/${currentAnalysis.id}`, currentAnalysis);
        } else {
          await axios.post('/api/impact-analyses', currentAnalysis);
        }
        fetchImpactAnalyses();
        setCurrentAnalysis(null);
      } catch (error) {
        console.error('Error saving impact analysis:', error);
      }
    }
  };

  return (
    <Box>
      <form onSubmit={handleSubmit}>
        <VStack spacing={4} align="stretch">
          <FormControl>
            <FormLabel>Process/Function</FormLabel>
            <Select
              value={currentAnalysis?.processFunction || ''}
              onChange={(e) => handleInputChange('processFunction', e.target.value)}
              required
            >
              <option value="">Select a process</option>
              {processes.map((process) => (
                <option key={process.id} value={process.processFunction}>
                  {process.processFunction}
                </option>
              ))}
            </Select>
          </FormControl>
          {/* Add more form fields for all the properties in the ImpactAnalysis interface */}
          <Button type="submit" colorScheme="blue">
            {currentAnalysis?.id ? 'Update' : 'Create'} Impact Analysis
          </Button>
        </VStack>
      </form>

      <Table variant="simple" mt={8}>
        <Thead>
          <Tr>
            <Th>Process/Function</Th>
            <Th>Criticality Rating</Th>
            <Th>Total Cost of Downtime (24h)</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {impactAnalyses.map((analysis) => (
            <Tr key={analysis.id}>
              <Td>{analysis.processFunction}</Td>
              <Td>{analysis.criticalityRating}</Td>
              <Td>${analysis.totalCostOfDowntimePer24Hours.toFixed(2)}</Td>
              <Td>
                <Button onClick={() => setCurrentAnalysis(analysis)}>Edit</Button>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}
