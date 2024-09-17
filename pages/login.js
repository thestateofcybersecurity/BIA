import React from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/router';
import { Box, Button, Heading, Text } from '@chakra-ui/react';

const Login = () => {
  const { user, error, isLoading } = useUser();
  const router = useRouter();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error.message}</div>;
  if (user) {
    router.push('/dashboard');
    return null;
  }

  return (
    <Box display="flex" justifyContent="center" alignItems="center" height="100vh" bg="gray.100">
      <Box bg="white" p={10} shadow="md" rounded="md">
        <Heading as="h1" size="xl" mb={4}>Welcome to BIA Web App</Heading>
        <Text mb={6}>Please log in to access the BIA tools.</Text>
        <Button colorScheme="blue" onClick={() => router.push('/api/auth/login')}>Log In</Button>
      </Box>
    </Box>
  );
};

export default Login;
