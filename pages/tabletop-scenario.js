import React from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { Box, Heading } from '@chakra-ui/react';
import TabletopScenarioGenerator from '../components/TabletopScenarioGenerator';

const TabletopScenarioPage = () => {
  const { user, error, isLoading } = useUser();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error.message}</div>;

  return (
    <Box>
      <Box className="container" bg="white" p={6} rounded="md" shadow="md">
        <Heading as="h2" size="lg" mb={6}>Tabletop Scenario Generator</Heading>
        <TabletopScenarioGenerator />
      </Box>
    </Box>
  );
};

export default TabletopScenarioPage;
