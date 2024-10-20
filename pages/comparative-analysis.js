import React from 'react';
import { Box, Heading } from '@chakra-ui/react';
import { useUser } from '@auth0/nextjs-auth0/client';
import ComparativeAnalysis from '../components/ComparativeAnalysis';
import { useRouter } from 'next/router';

const ComparativeAnalysisPage = () => {
  const { user, error, isLoading } = useUser();
  const router = useRouter();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error.message}</div>;

  if (!user) {
    typeof window !== 'undefined' && router.push('/api/auth/login');
    return null;
  }

  return (
    <Box p={5}>
      <Heading mb={6}>Comparative Analysis</Heading>
      <ComparativeAnalysis />
    </Box>
  );
};

export default ComparativeAnalysisPage;
