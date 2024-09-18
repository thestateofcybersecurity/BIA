import React from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import Header from '../components/Header';
import { Box, Heading } from '@chakra-ui/react';
import ComparativeAnalysis from '../components/ComparativeAnalysis';

const ComparativeAnalysisPage = () => {
  const { user, error: authError, isLoading } = useUser();

  if (isLoading) return <div>Loading...</div>;
  if (authError) return <div>{authError.message}</div>;

  return (
    <Box>
      <Header />
      <Box className="container" bg="white" p={6} rounded="md" shadow="md">
        <Heading as="h2" size="lg" mb={6}>Comparative Analysis</Heading>
        <ComparativeAnalysis />
      </Box>
    </Box>
  );
};

export default ComparativeAnalysisPage;
