import React, { createContext, useState, useContext, useEffect } from 'react'
import axios, { AxiosError } from 'axios'

interface AuthContextType {
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  error: string | null
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  login: async (_email: string, _password: string) => {
    console.warn('login not implemented')
  },
  logout: () => {
    console.warn('logout not implemented')
  },
  error: null
})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      setIsAuthenticated(true)
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
  }, [])

  const login = async (email: string, password: string) => {
    try {
      setError(null) // Clear any previous errors
      const response = await axios.post('/api/login', { email, password })
      const { token } = response.data
      localStorage.setItem('token', token)
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      setIsAuthenticated(true)
    } catch (error) {
      console.error('Login error:', error)
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError
        if (axiosError.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          setError(`Server error: ${axiosError.response.status} - ${axiosError.response.data.message || 'Unknown error'}`)
        } else if (axiosError.request) {
          // The request was made but no response was received
          setError('No response received from server. Please check your internet connection.')
        } else {
          // Something happened in setting up the request that triggered an Error
          setError(`Error: ${axiosError.message}`)
        }
      } else {
        setError('An unexpected error occurred')
      }
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    delete axios.defaults.headers.common['Authorization']
    setIsAuthenticated(false)
    setError(null)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, error }}>
      {children}
    </AuthContext.Provider>
  )
}
