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
} from '@chakra-ui/react';
import axios from 'axios';

const CSVUpload = ({ onUploadComplete }) => {
  const { user, error, isLoading } = useUser();
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file first!');
      return;
    }

    const formData = new FormData();
    formData.append('csv', file);

    try {
      await axios.post('/api/upload-csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      alert('CSV uploaded and processed successfully!');
      onUploadComplete();
    } catch (error) {
      console.error('Error uploading CSV:', error);
      alert('Error uploading CSV. Please try again.');
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error.message}</div>;

  return (
    <Box>
      <VStack spacing={4} align="flex-start">
        <FormControl>
          <FormLabel>Upload CSV File</FormLabel>
          <Input type="file" accept=".csv" onChange={handleFileChange} />
        </FormControl>
        <Button onClick={handleUpload} colorScheme="blue">Upload</Button>
        <Text>Upload a CSV file to bulk import business processes.</Text>
        <Text fontSize="sm">
          CSV should have columns: processName, description, owner, people, itApplications, devices, facilityLocation, suppliers
        </Text>
      </VStack>
    </Box>
  );
};

export default CSVUpload;
