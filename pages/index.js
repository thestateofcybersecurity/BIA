import React from 'react';
import Link from 'next/link';
import { useAuth0 } from '@auth0/auth0-react';
import Header from '../components/Header';
import { Box, Button, Heading, Text, UnorderedList, ListItem, VStack } from '@chakra-ui/react';

const Home = () => {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();

  if (isLoading) return <Box>Loading...</Box>;

  if (!isAuthenticated) {
    return (
      <Box p={6}>
        <Heading as="h1" size="xl" mb={4}>Welcome to BIA Web Application</Heading>
        <Text mb={4}>Please log in to access the BIA tools.</Text>
        <Button onClick={() => loginWithRedirect()} colorScheme="blue">Log In</Button>
      </Box>
    );
  }

  return (
    <Box>
      <Header />
      <Box className="container" bg="white" p={6} rounded="md" shadow="md">
        <VStack spacing={6} align="stretch">
          <Heading as="h1" size="xl">Welcome to BIA Web Application</Heading>
          <Text>Get started with your Business Impact Analysis:</Text>
          <UnorderedList spacing={2}>
            <ListItem><Link href="/business-process">Define Business Processes</Link></ListItem>
            <ListItem><Link href="/impact-analysis">Conduct Impact Analysis</Link></ListItem>
            <ListItem><Link href="/comparative-analysis">View Comparative Analysis</Link></ListItem>
            <ListItem><Link href="/rto-rpo-analysis">RTO/RPO Analysis</Link></ListItem>
          </UnorderedList>
        </VStack>
      </Box>
    </Box>
  );
};

export default Home;
