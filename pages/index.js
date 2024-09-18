import React from 'react';
import Link from 'next/link';
import { useUser } from '@auth0/nextjs-auth0/client';
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
        <Heading as="h1" size="xl" mb={4}>Welcome to Business Continuity Platform</Heading>
        <Text mb={4}>Please log in to access the platform tools.</Text>
        <Button onClick={() => router.push('/api/auth/login')} colorScheme="blue">Log In</Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box className="container" bg="white" p={6} rounded="md" shadow="md">
        <VStack spacing={6} align="stretch">
          <Heading as="h1" size="xl">Welcome to Business Continuity Platform</Heading>
          <Text>Get started with your Business Continuity Planning:</Text>
          <UnorderedList spacing={2}>
            <ListItem><Link href="/business-process">Manage Business Processes</Link></ListItem>
            <ListItem><Link href="/impact-analysis">Conduct Impact Analysis</Link></ListItem>
            <ListItem><Link href="/recovery-workflow">Create Recovery Workflows</Link></ListItem>
            <ListItem><Link href="/rto-rpo-analysis">RTO/RPO Analysis</Link></ListItem>
            <ListItem><Link href="/maturity-scorecard">Maturity Scorecard</Link></ListItem>
            <ListItem><Link href="/tabletop-scenario">Generate Tabletop Scenarios</Link></ListItem>
            <ListItem><Link href="/comparative-analysis">View Comparative Analysis</Link></ListItem>
          </UnorderedList>
        </VStack>
      </Box>
    </Box>
  );
};

export default Home;
