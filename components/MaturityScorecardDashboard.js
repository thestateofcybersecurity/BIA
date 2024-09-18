import React from 'react';
import { Box, Heading, Progress, VStack, Text } from '@chakra-ui/react';
import { Bar, Doughnut } from 'react-chartjs-2';
import 'chart.js/auto';

const MaturityScorecardDashboard = ({ formData, overallMaturityScore }) => {
  // Bar chart data for each section of the scorecard
  const sectionScores = {
    labels: [
      'BCP Scope',
      'Business Operations',
      'Dependencies',
      'Alternatives for Dependencies',
      'Legal & Regulatory',
      'Internal Stakeholders',
      'External Stakeholders',
      'Organizational Objectives',
      'BIA Process',
      'RTOs and RPOs',
      'Recovery Plans',
      'Crisis Management',
      'BC Testing',
      'Change Management'
    ],
    datasets: [
      {
        label: 'Scores',
        data: [
          formData.bcpScope,
          formData.businessOperations,
          formData.dependencies,
          formData.alternativesForDependencies,
          formData.legalAndRegulatoryRequirements,
          formData.internalStakeholders,
          formData.externalStakeholders,
          formData.organizationalObjectives,
          formData.biaProcess,
          formData.rtosRposDefined,
          formData.incidentResponsePlans,
          formData.riskManagement,
          formData.bcTesting,
          formData.changeManagementProcedures,
        ],
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Doughnut chart data for overall maturity score
  const doughnutData = {
    labels: ['Maturity Score', 'Remaining'],
    datasets: [
      {
        data: [overallMaturityScore, 10 - overallMaturityScore],
        backgroundColor: ['#4CAF50', '#e0e0e0'],
        hoverBackgroundColor: ['#4CAF50', '#e0e0e0'],
      },
    ],
  };

  return (
    <Box>
      <Heading as="h2" size="lg" mb={4}>
        Maturity Scorecard Dashboard
      </Heading>

      {/* Overall Maturity Progress */}
      <VStack spacing={4} align="stretch">
        <Text fontWeight="bold">Overall Maturity Score</Text>
        <Progress
          value={(overallMaturityScore / 10) * 100}
          size="lg"
          colorScheme="green"
        />
        <Text fontSize="lg">{overallMaturityScore} / 10</Text>

        {/* Doughnut Chart for Overall Maturity */}
        <Box w="50%" mx="auto">
          <Doughnut data={doughnutData} />
        </Box>
      </VStack>

      {/* Bar Chart for Section Scores */}
      <Box mt={8}>
        <Heading as="h3" size="md" mb={4}>
          Section Score Breakdown
        </Heading>
        <Bar
          data={sectionScores}
          options={{
            responsive: true,
            scales: {
              y: {
                beginAtZero: true,
                max: 10,
              },
            },
          }}
        />
      </Box>
    </Box>
  );
};

export default MaturityScorecardDashboard;
