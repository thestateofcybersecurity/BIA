import React, { useState } from 'react'
import { Box, Button, FormControl, FormLabel, Input, VStack, Text, Select } from '@chakra-ui/react'
import axios from 'axios'
import { ProcessDependency } from '@/types/ProcessDependency'

interface RecoveryObjectivesProps {
  processes: ProcessDependency[]
}

export default function RecoveryObjectives({ processes }: RecoveryObjectivesProps) {
  const [formData, setFormData] = useState({
    processId: '',
    expectedRTO: '',
    actualRTO: '',
    expectedRPO: '',
    actualRPO: '',
  })
  const [gaps, setGaps] = useState({ rtoGap: 0, rpoGap: 0 })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await axios.post('/api/save-recovery', formData)
      setGaps(response.data)
    } catch (error) {
      console.error('Error saving recovery objectives:', error)
    }
  }

  return (
    <Box>
      <form onSubmit={handleSubmit}>
        <VStack spacing={4} align="stretch">
          <FormControl>
            <FormLabel>Process/Dependency</FormLabel>
            <Select name="processId" value={formData.processId} onChange={handleInputChange} required>
              <option value="">Select a process</option>
              {processes.map((process) => (
                <option key={process.id} value={process.id}>{process.processFunction}</option>
              ))}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Expected RTO (hours)</FormLabel>
            <Input type="number" name="expectedRTO" value={formData.expectedRTO} onChange={handleInputChange} required />
          </FormControl>
          <FormControl>
            <FormLabel>Actual RTO (hours)</FormLabel>
            <Input type="number" name="actualRTO" value={formData.actualRTO} onChange={handleInputChange} required />
          </FormControl>
          <FormControl>
            <FormLabel>Expected RPO (hours)</FormLabel>
            <Input type="number" name="expectedRPO" value={formData.expectedRPO} onChange={handleInputChange} required />
          </FormControl>
          <FormControl>
            <FormLabel>Actual RPO (hours)</FormLabel>
            <Input type="number" name="actualRPO" value={formData.actualRPO} onChange={handleInputChange} required />
          </FormControl>
          <Button type="submit" colorScheme="blue">Submit</Button>
        </VStack>
      </form>
      <Text mt={4}>RTO Gap: {gaps.rtoGap} hours</Text>
      <Text>RPO Gap: {gaps.rpoGap} hours</Text>
    </Box>
  )
}
