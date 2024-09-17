// components/CSVUpload.js
import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Text,
} from '@chakra-ui/react';
import axios from 'axios';

const CSVUpload = ({ onUploadComplete }) => {
  const { getAccessTokenSilently } = useAuth0();
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
      const token = await getAccessTokenSilently();
      await axios.post('/api/upload-csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      alert('CSV uploaded and processed successfully!');
      onUploadComplete();
    } catch (error) {
      console.error('Error uploading CSV:', error);
      alert('Error uploading CSV. Please try again.');
    }
  };

  return (
    <Box>
      <FormControl>
        <FormLabel>Upload CSV File</FormLabel>
        <Input type="file" accept=".csv" onChange={handleFileChange} />
      </FormControl>
      <Button onClick={handleUpload} mt={4}>Upload</Button>
      <Text mt={2}>Upload a CSV file to bulk import business processes.</Text>
    </Box>
  );
};

export default CSVUpload;
