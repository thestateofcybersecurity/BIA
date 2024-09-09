import { useState } from 'react';
import { useRouter } from 'next/router';
import { Box, Button, FormControl, FormLabel, Input, VStack, Heading, Text, Link } from '@chakra-ui/react';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (response.ok) {
        router.push('/login');
      } else {
        throw new Error('Registration failed');
      }
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  return (
    <Box maxWidth="400px" margin="auto" mt={8}>
      <VStack spacing={4} align="stretch">
        <Heading>Register</Heading>
        <form onSubmit={handleSubmit}>
          <FormControl>
            <FormLabel>Email</FormLabel>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </FormControl>
          <FormControl mt={4}>
            <FormLabel>Password</FormLabel>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </FormControl>
          <Button type="submit" colorScheme="blue" width="full" mt={4}>
            Register
          </Button>
        </form>
        <Text>
          Already have an account? <Link href="/login">Login here</Link>
        </Text>
      </VStack>
    </Box>
  );
}
