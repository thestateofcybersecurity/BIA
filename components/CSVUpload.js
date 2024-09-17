import React, { useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Text,
  VStack,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import axios from 'axios';

const CSVUpload = ({ onUploadComplete }) => {
  const { user, error: authError, isLoading } = useUser();
  const [file, setFile] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setUploadError(null); // Clear any previous errors
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadError('Please select a file first!');
      return;
    }

    const formData = new FormData();
    formData.append('csv', file);

    try {
      const response = await axios.post('/api/upload-csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      alert('CSV uploaded and processed successfully!');
      onUploadComplete();
    } catch (error) {
      console.error('Error uploading CSV:', error);
      setUploadError(error.response?.data?.error || error.message || 'An unknown error occurred');
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (authError) return <div>{authError.message}</div>;

  return (
    <Box>
      <VStack spacing={4} align="flex-start">
        <FormControl>
          <FormLabel>Upload CSV File</FormLabel>
          <Input type="file" accept=".csv" onChange={handleFileChange} />
        </FormControl>
        <Button onClick={handleUpload} colorScheme="blue">Upload</Button>
        {uploadError && (
          <Alert status="error">
            <AlertIcon />
            {uploadError}
          </Alert>
        )}
        <Text>Upload a CSV file to bulk import business processes.</Text>
        <Text fontSize="sm">
          CSV should have columns: processName, description, owner, people, itApplications, devices, facilityLocation, suppliers
        </Text>
      </VStack>
    </Box>
  );
};

export default CSVUpload;
