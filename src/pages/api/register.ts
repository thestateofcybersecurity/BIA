import type { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import { connectToDatabase } from '@/utils/database'
import { User } from '@/models/User'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Register API route called')
  if (req.method !== 'POST') {
    console.log('Method not allowed:', req.method)
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    console.log('Connecting to database...')
    await connectToDatabase()
    console.log('Connected to database')

    const { email, password } = req.body
    console.log('Received registration request for email:', email)

    if (!email || !password) {
      console.log('Email or password missing')
      return res.status(400).json({ message: 'Email and password are required' })
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      console.log('User already exists:', email)
      return res.status(400).json({ message: 'User already exists' })
    }

    console.log('Hashing password...')
    const hashedPassword = await bcrypt.hash(password, 10)
    console.log('Password hashed')

    console.log('Creating new user...')
    const newUser = new User({ email, password: hashedPassword })
    await newUser.save()
    console.log('New user created:', email)

    res.status(201).json({ message: 'User created successfully' })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
