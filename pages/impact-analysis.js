import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import Header from '../components/Header';
import ProtectedRoute from '../components/ProtectedRoute';

const ImpactAnalysisForm = () => {
  const { user, getAccessTokenSilently } = useAuth0();
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

  const [scores, setScores] = useState({
    revenueScore: 0,
    productivityScore: 0,
    operatingCostsScore: 0,
    financialPenaltiesScore: 0,
    customersScore: 0,
    staffScore: 0,
    partnersScore: 0,
    complianceScore: 0,
    healthSafetyScore: 0,
    overallScore: 0,
    criticalityTier: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    calculateScores();
  }, [formData]);

  const calculateScores = () => {
    const newScores = { ...scores };

    // Calculate individual scores
    newScores.revenueScore = calculateImpactScore(formData.lossOfRevenue, [25000, 125000, 250000, 500000]);
    newScores.productivityScore = calculateImpactScore(formData.lossOfProductivity, [5000, 25000, 50000, 100000]);
    newScores.operatingCostsScore = calculateImpactScore(formData.increasedOperatingCosts, [2500, 12500, 25000, 50000]);
    newScores.financialPenaltiesScore = calculateImpactScore(formData.financialPenalties, [500, 2500, 5000, 10000]);
    newScores.customersScore = calculateGoodwillScore(formData.impactOnCustomers);
    newScores.staffScore = calculateGoodwillScore(formData.impactOnStaff);
    newScores.partnersScore = calculateGoodwillScore(formData.impactOnPartners);
    newScores.complianceScore = calculateComplianceScore(formData.impactOnCompliance);
    newScores.healthSafetyScore = calculateHealthSafetyScore(formData.impactOnSafety);

    // Calculate overall score
    newScores.overallScore = Object.values(newScores).reduce((sum, score) => sum + score, 0) / 9;

    // Determine criticality tier
    newScores.criticalityTier = determineCriticalityTier(newScores.overallScore);

    setScores(newScores);
  };

  const calculateImpactScore = (value, thresholds) => {
    const numValue = Number(value);
    if (numValue >= thresholds[3]) return 4;
    if (numValue >= thresholds[2]) return 3;
    if (numValue >= thresholds[1]) return 2;
    if (numValue >= thresholds[0]) return 1;
    return 0;
  };

  const calculateGoodwillScore = (impact) => {
    switch (impact) {
      case 'Critical Impact': return 4;
      case 'High Impact': return 3;
      case 'Medium Impact': return 2;
      case 'Low Impact': return 1;
      default: return 0;
    }
  };

  const calculateComplianceScore = (impact) => {
    switch (impact) {
      case 'Critical Impact': return 4;
      case 'High Impact': return 3;
      case 'Medium Impact': return 2;
      case 'Low Impact': return 1;
      default: return 0;
    }
  };

  const calculateHealthSafetyScore = (impact) => {
    switch (impact) {
      case 'High risk of loss-of-life/serious harm': return 4;
      case 'Some risk of loss-of-life/serious harm': return 3;
      case 'High degradation of health/safety services': return 2;
      case 'Some degradation of health/safety services': return 1;
      default: return 0;
    }
  };

  const determineCriticalityTier = (score) => {
    if (score >= 3.5) return 'Tier 1 (Gold)';
    if (score >= 3) return 'Tier 2 (Silver)';
    if (score >= 2.5) return 'Tier 3 (Bronze)';
    return 'Non-critical';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = await getAccessTokenSilently();
      const response = await fetch('/api/impact-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: user.sub,
          ...formData,
          ...scores
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
    <div>
      <Header />
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
        <div>
          <h3>Impact Scores</h3>
          <p>Revenue Score: {scores.revenueScore}</p>
          <p>Productivity Score: {scores.productivityScore}</p>
          <p>Operating Costs Score: {scores.operatingCostsScore}</p>
          <p>Financial Penalties Score: {scores.financialPenaltiesScore}</p>
          <p>Customers Score: {scores.customersScore}</p>
          <p>Staff Score: {scores.staffScore}</p>
          <p>Partners Score: {scores.partnersScore}</p>
          <p>Compliance Score: {scores.complianceScore}</p>
          <p>Health & Safety Score: {scores.healthSafetyScore}</p>
          <p>Overall Score: {scores.overallScore.toFixed(2)}</p>
          <p>Criticality Tier: {scores.criticalityTier}</p>
        </div>
        <button type="submit">Save Impact Analysis</button>
      </form>
    </div>
  );
};

export default ImpactAnalysisForm;
