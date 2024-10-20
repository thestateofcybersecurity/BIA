import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Flex, Box, Button, Link as ChakraLink, Text, Menu, MenuButton, MenuList, MenuItem, Spinner } from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import { useUser } from '@auth0/nextjs-auth0/client';

const Header = () => {
  const { user, error, isLoading } = useUser();
  const router = useRouter();

  if (error) {
    console.error('Auth0 error:', error);
    return null;
  }

  return (
    <Flex as="header" bg="blue.500" p={4} justifyContent="space-between" alignItems="center">
      <Box>
        <ChakraLink href="/" color="white" fontSize="xl" fontWeight="bold" mr={6}>Home</ChakraLink>
        {user && (
          <Menu>
            <MenuButton as={Button} rightIcon={<ChevronDownIcon />} variant="ghost" color="white">
              Tools
            </MenuButton>
            <MenuList>
              <MenuItem as={Link} href="/business-process">Business Process</MenuItem>
              <MenuItem as={Link} href="/impact-analysis">Impact Analysis</MenuItem>
              <MenuItem as={Link} href="/recovery-workflow">Recovery Workflow</MenuItem>
              <MenuItem as={Link} href="/rto-rpo-analysis">RTO/RPO Analysis</MenuItem>
              <MenuItem as={Link} href="/maturity-scorecard">Maturity Scorecard</MenuItem>
              <MenuItem as={Link} href="/tabletop-scenario">Tabletop Scenario</MenuItem>
              <MenuItem as={Link} href="/comparative-analysis">Comparative Analysis</MenuItem>
              <MenuItem as={Link} href="/generate-bcp">Generate BCP</MenuItem>
            </MenuList>
          </Menu>
        )}
      </Box>
      <Box>
        {isLoading ? (
          <Spinner color="white" />
        ) : user ? (
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
