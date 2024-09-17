import React from 'react';
import Link from 'next/link';
import { useUser } from '@auth0/nextjs-auth0/client';
import Header from '../components/Header';
import { Box, Button, Heading, Text, UnorderedList, ListItem, VStack } from '@chakra-ui/react';
import { useRouter } from 'next/router';

const Home = () => {
  const { user, error, isLoading } = useUser();
  const router = useRouter();

  if (isLoading) return <Box>Loading...</Box>;

  if (error) return <Box>Error: {error.message}</Box>;

  if (!user) {
    return (
      <Box p={6}>
        <Heading as="h1" size="xl" mb={4}>Welcome to BIA Web Application</Heading>
        <Text mb={4}>Please log in to access the BIA tools.</Text>
        <Button onClick={() => router.push('/api/auth/login')} colorScheme="blue">Log In</Button>
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
