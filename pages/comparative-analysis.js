import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import Header from '../components/Header';

const ComparativeAnalysis = () => {
  const { getAccessTokenSilently } = useAuth0();
  const [analyses, setAnalyses] = useState([]);

  useEffect(() => {
    fetchAnalyses();
  }, []);

  const fetchAnalyses = async () => {
    try {
      const token = await getAccessTokenSilently();
      const response = await fetch('/api/impact-analysis', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAnalyses(data.data);
      } else {
        throw new Error('Failed to fetch impact analyses');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to fetch impact analyses. Please try again.');
    }
  };

  return (
    <div>
      <Header />
      <h2>Comparative Analysis</h2>
      <table>
        <thead>
          <tr>
            <th>Process Name</th>
            <th>Overall Score</th>
            <th>Criticality Tier</th>
            <th>Revenue Score</th>
            <th>Productivity Score</th>
            <th>Operating Costs Score</th>
            <th>Financial Penalties Score</th>
            <th>Customers Score</th>
            <th>Staff Score</th>
            <th>Partners Score</th>
            <th>Compliance Score</th>
            <th>Health & Safety Score</th>
          </tr>
        </thead>
        <tbody>
          {analyses.map((analysis) => (
            <tr key={analysis._id}>
              <td>{analysis.processName}</td>
              <td>{analysis.overallScore.toFixed(2)}</td>
              <td>{analysis.criticalityTier}</td>
              <td>{analysis.revenueScore}</td>
              <td>{analysis.productivityScore}</td>
              <td>{analysis.operatingCostsScore}</td>
              <td>{analysis.financialPenaltiesScore}</td>
              <td>{analysis.customersScore}</td>
              <td>{analysis.staffScore}</td>
              <td>{analysis.partnersScore}</td>
              <td>{analysis.complianceScore}</td>
              <td>{analysis.healthSafetyScore}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ComparativeAnalysis;
