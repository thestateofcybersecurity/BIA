import React from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { Box, Heading } from '@chakra-ui/react';
import RTORPOAnalysis from '../components/RTORPOAnalysis';

const RTORPOAnalysisPage = () => {
  const { user, error, isLoading } = useUser();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error.message}</div>;

  return (
    <Box>
      <Box className="container" bg="white" p={6} rounded="md" shadow="md">
        <Heading as="h2" size="lg" mb={6}>RTO/RPO Gap Analysis</Heading>
        <RTORPOAnalysis />
      </Box>
    </Box>
  );
};

export default RTORPOAnalysisPage;
