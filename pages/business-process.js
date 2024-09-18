import React from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { Box, Heading, VStack } from '@chakra-ui/react';
import BusinessProcessList from '../components/BusinessProcessList';
import CSVUpload from '../components/CSVUpload';
import Header from '../components/Header';

const BusinessProcessPage = () => {
  const { user, error, isLoading } = useUser();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error.message}</div>;

  return (
    <Box>
      <Header />
      <Box className="container" bg="white" p={6} rounded="md" shadow="md">
        <VStack spacing={6} align="stretch">
          <Heading as="h2" size="lg">Business Process Management</Heading>
          <BusinessProcessList />
          <Heading as="h3" size="md">Bulk Upload</Heading>
          <CSVUpload onUploadComplete={() => {}} />
        </VStack>
      </Box>
    </Box>
  );
};

export default BusinessProcessPage;
