import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Flex, Box, Button, Link as ChakraLink, Text } from '@chakra-ui/react';
import { useAuth0 } from '@auth0/auth0-react';

const Header = () => {
  const { isAuthenticated, logout, user } = useAuth0();

  return (
    <Flex as="header" bg="blue.500" p={4} justifyContent="space-between" alignItems="center">
      <Box>
        <ChakraLink href="/" color="white" fontSize="xl" fontWeight="bold" mr={6}>Home</ChakraLink>
        <ChakraLink href="/business-process" color="white" mr={6}>Business Process</ChakraLink>
        <ChakraLink href="/impact-analysis" color="white" mr={6}>Impact Analysis</ChakraLink>
        <ChakraLink href="/rto-rpo-analysis" color="white">RTO/RPO Analysis</ChakraLink>
      </Box>
      <Box>
        {isAuthenticated ? (
          <>
            <Text color="white" mr={4}>Welcome, {user?.name}</Text>
            <Button onClick={() => logout({ returnTo: window.location.origin })} colorScheme="red" size="sm">Logout</Button>
          </>
        ) : (
          <Button onClick={() => router.push('/login')} colorScheme="teal" size="sm">Login</Button>
        )}
      </Box>
    </Flex>
  );
};

export default Header;
