// pages/generate-bcp.js
import React from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import {
  Box,
  Heading,
  Text,
  VStack,
  Button,
  useToast,
} from '@chakra-ui/react';
import axios from 'axios';

const GenerateBCPPage = () => {
  const { user, error, isLoading } = useUser();
  const toast = useToast();

  const handleGenerateBCP = async () => {
    try {
      const response = await axios.get('/api/generate-bcp', {
        responseType: 'blob', // Important for handling the PDF file
      });

      // Create a blob from the PDF data
      const blob = new Blob([response.data], { type: 'application/pdf' });
      
      // Create a link element and trigger the download
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = 'BusinessContinuityPlan.pdf';
      link.click();

      toast({
        title: 'BCP Generated',
        description: 'Your Business Continuity Plan has been generated and downloaded.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error generating BCP:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate Business Continuity Plan.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error.message}</div>;

  return (
    <Box p={5}>
      <VStack spacing={6} align="stretch">
        <Heading as="h1" size="xl">Generate Business Continuity Plan</Heading>
        <Text>
          Click the button below to generate and download your Business Continuity Plan.
          This plan will include all the information you've entered into the system,
          including business processes, impact analyses, recovery workflows, and more.
        </Text>
        <Button onClick={handleGenerateBCP} colorScheme="blue" size="lg">
          Generate and Download BCP
        </Button>
      </VStack>
    </Box>
  );
};

export default GenerateBCPPage;
