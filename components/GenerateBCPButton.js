import React from 'react';
import { Button, useToast } from '@chakra-ui/react';
import axios from 'axios';

const GenerateBCPButton = () => {
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

  return (
    <Button onClick={handleGenerateBCP} colorScheme="blue">
      Generate BCP
    </Button>
  );
};

export default GenerateBCPButton;
