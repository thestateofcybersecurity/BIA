import React from 'react';
import { Box, Heading } from '@chakra-ui/react';
import ComparativeAnalysis from '../components/ComparativeAnalysis';
import { withPageAuthRequired } from '@auth0/nextjs-auth0';

const ComparativeAnalysisPage = () => {
  return (
    <Box p={5}>
      <Heading mb={6}>Comparative Analysis</Heading>
      <ComparativeAnalysis />
    </Box>
  );
};

export default withPageAuthRequired(ComparativeAnalysisPage);
