import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { Box, Button, FormControl, FormLabel, Input, VStack, Heading, Text, Link, useToast } from '@chakra-ui/react'
import axios from 'axios'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()
  const toast = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await axios.post('/api/register', { email, password })
      toast({
        title: "Account created.",
        description: "We've created your account for you.",
        status: "success",
        duration: 9000,
        isClosable: true,
      })
      router.push('/login')
    } catch (error) {
      console.error('Registration failed:', error)
      toast({
        title: "An error occurred.",
        description: "Unable to create your account.",
        status: "error",
        duration: 9000,
        isClosable: true,
      })
    }
  }

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
  )
}
