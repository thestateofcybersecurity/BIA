import React from 'react';
import { Box, Heading, Text, UnorderedList, ListItem, VStack } from '@chakra-ui/react';
import { ProcessDependency } from '@/types/ProcessDependency'

const Introduction: React.FC = () => {
  return (
    <Box maxWidth="800px" margin="auto" mt={8}>
      <VStack spacing={6} align="stretch">
        <Heading as="h1" size="xl">Business Impact Analysis (BIA) Tool</Heading>
        
        <Text>
          Use this tool to conduct a business impact analysis (BIA). Go through the tabs from left to right to complete the analysis, assign RTOs/RPOs and review RTO/RPO gaps, and assess risks. Each tab is described below:
        </Text>
        
        <UnorderedList spacing={3}>
          <ListItem>
            <Text fontWeight="bold">1. Processes and Dependencies:</Text>
            <Text>List the business processes/functions and dependencies to be assessed.</Text>
          </ListItem>
          
          <ListItem>
            <Text fontWeight="bold">2. Scoring Criteria:</Text>
            <Text>Define the scales that will be used throughout this tool to measure business impact and criticality.</Text>
          </ListItem>
          
          <ListItem>
            <Text fontWeight="bold">3. Impact Analysis:</Text>
            <Text>Determine the impact of downtime and define acceptable and achievable RTOs/RPOs.</Text>
          </ListItem>
          
          <ListItem>
            <Text fontWeight="bold">4. Recovery - RTO Gaps:</Text>
            <Text>This tab outlines gaps in the organization&apos;s ability to recover business processes in an acceptable amount of time. It lists the unique top-level processes and dependencies, sorted by acceptable RTO, and calculates the gap between acceptable and achievable RTO.</Text>
          </ListItem>
          
          <ListItem>
            <Text fontWeight="bold">5. Recovery - RPO Gaps:</Text>
            <Text>This tab outlines gaps in the organization&apos;s ability to guard against data loss in the event of a disaster event. It lists the unique top-level processes and dependencies, sorted by acceptable RPO, and calculates the gap between acceptable and achievable RPO.</Text>
          </ListItem>
          
          <ListItem>
            <Text fontWeight="bold">6. Repatriation - RTO Gaps:</Text>
            <Text>This tab outlines gaps in the organization&apos;s ability to repatriate business processes to the primary location in an acceptable amount of time. It provides the same analysis for your failback capability (i.e. returning to your primary site).</Text>
          </ListItem>
          
          <ListItem>
            <Text fontWeight="bold">7. Repatriation - RPO Gaps:</Text>
            <Text>This tab outlines gaps in the organization&apos;s ability to guard against data loss during a repatriation exercise following a disaster. It provides the same analysis for your failback capability (i.e. returning to your primary site).</Text>
          </ListItem>
        </UnorderedList>
      </VStack>
    </Box>
  );
};

export default Introduction;
