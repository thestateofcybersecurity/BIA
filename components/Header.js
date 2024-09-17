import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Flex, Box, Button, Link as ChakraLink, Text } from '@chakra-ui/react';
import { useUser } from '@auth0/nextjs-auth0/client';

const Header = () => {
  const { user, error, isLoading } = useUser();
  const router = useRouter();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error.message}</div>;

  return (
    <Flex as="header" bg="blue.500" p={4} justifyContent="space-between" alignItems="center">
      <Box>
        <ChakraLink href="/" color="white" fontSize="xl" fontWeight="bold" mr={6}>Home</ChakraLink>
        <ChakraLink href="/business-process" color="white" mr={6}>Business Process</ChakraLink>
        <ChakraLink href="/impact-analysis" color="white" mr={6}>Impact Analysis</ChakraLink>
        <ChakraLink href="/rto-rpo-analysis" color="white" mr={6}>RTO/RPO Analysis</ChakraLink>
        <ChakraLink href="/comparative-analysis" color="white">Comparative Analysis</ChakraLink>
      </Box>
      <Box>
        {user ? (
          <>
            <Text color="white" mr={4}>Welcome, {user.name}</Text>
            <Button onClick={() => router.push('/api/auth/logout')} colorScheme="red" size="sm">Logout</Button>
          </>
        ) : (
          <Button onClick={() => router.push('/api/auth/login')} colorScheme="teal" size="sm">Login</Button>
        )}
      </Box>
    </Flex>
  );
};

export default Header;
