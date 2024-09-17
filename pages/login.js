import React, { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useRouter } from 'next/router';
import { Flex, Box, Button, Link as ChakraLink, Text } from '@chakra-ui/react';

const Login = () => {
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.push('/');
      } else {
        loginWithRedirect();
      }
    }
  }, [isAuthenticated, isLoading, loginWithRedirect, router]);

  return (
    <Box display="flex" justifyContent="center" alignItems="center" height="100vh" bg="gray.100">
      <Box bg="white" p={10} shadow="md" rounded="md">
        <Heading as="h1" size="xl" mb={4}>Welcome to BIA Web App</Heading>
        <Text mb={6}>Please log in to access the BIA tools.</Text>
        <Button colorScheme="blue" onClick={() => loginWithRedirect()}>Log In</Button>
      </Box>
    </Box>
  );
};

export default Login;
