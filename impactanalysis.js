import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const ImpactAnalysisForm = () => {
  const { user } = useAuth0();
  const [formData, setFormData] = useState({
    processName: '',
    clientFacingAvailability: '',
    additionalAvailability: '',
    criticalityRating: '',
    costOfDowntime: '',
    impactOnGoodwill: '',
    impactOnCompliance: '',
    impactOnSafety: '',
    lossOfRevenue: '',
    lossOfProductivity: '',
    increasedOperatingCosts: '',
    financialPenalties: '',
    impactOnCustomers: '',
    impactOnStaff: '',
    impactOnPartners: '',
    complianceRisks: '',
    healthSafetyRisks: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/impactAnalysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.sub,
          ...formData
        }),
      });
      if (response.ok) {
        alert('Impact analysis saved successfully!');
      } else {
        throw new Error('Failed to save impact analysis');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to save impact analysis. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Impact Analysis</h2>
      <div>
        <label htmlFor="processName">Process/Function:</label>
        <input
          type="text"
          id="processName"
          name="processName"
          value={formData.processName}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="clientFacingAvailability">Client-Facing Availability Requirements:</label>
        <input
          type="text"
          id="clientFacingAvailability"
          name="clientFacingAvailability"
          value={formData.clientFacingAvailability}
          onChange={handleChange}
        />
      </div>
      <div>
        <label htmlFor="additionalAvailability">Additional Availability Requirements:</label>
        <input
          type="text"
          id="additionalAvailability"
          name="additionalAvailability"
          value={formData.additionalAvailability}
          onChange={handleChange}
        />
      </div>
      <div>
        <label htmlFor="criticalityRating">Criticality Rating:</label>
        <select
          id="criticalityRating"
          name="criticalityRating"
          value={formData.criticalityRating}
          onChange={handleChange}
          required
        >
          <option value="">Select a rating</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>
      <div>
        <label htmlFor="costOfDowntime">Total Cost of Downtime per 24 Hours:</label>
        <input
          type="number"
          id="costOfDowntime"
          name="costOfDowntime"
          value={formData.costOfDowntime}
          onChange={handleChange}
          required
        />
      </div>
      {/* Add more form fields for other impact metrics */}
      <button type="submit">Save Impact Analysis</button>
    </form>
  );
};

export default ImpactAnalysisForm;
