import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import Header from '../components/Header';

const RTORPOAnalysis = () => {
  const { user, getAccessTokenSilently } = useAuth0();
  const [data, setData] = useState([]);
  const [activeTab, setActiveTab] = useState('recovery-rto');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await getAccessTokenSilently();
        const response = await fetch(`/api/index?path=rto-rpo-analysis&userId=${user.sub}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (response.ok) {
          const result = await response.json();
          setData(result);
        } else {
          throw new Error('Failed to fetch RTO/RPO data');
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Failed to fetch RTO/RPO data. Please try again.');
      }
    };

    fetchData();
  }, [user, getAccessTokenSilently]);

  const renderTable = () => {
    let filteredData = [];
    switch (activeTab) {
      case 'recovery-rto':
        filteredData = data.filter(item => item.type === 'recovery' && item.metric === 'rto');
        break;
      case 'recovery-rpo':
        filteredData = data.filter(item => item.type === 'recovery' && item.metric === 'rpo');
        break;
      case 'repatriation-rto':
        filteredData = data.filter(item => item.type === 'repatriation' && item.metric === 'rto');
        break;
      case 'repatriation-rpo':
        filteredData = data.filter(item => item.type === 'repatriation' && item.metric === 'rpo');
        break;
      default:
        break;
    }

    return (
      <table>
        <thead>
          <tr>
            <th>Process</th>
            <th>Acceptable</th>
            <th>Achievable</th>
            <th>Gap</th>
          </tr>
        </thead>
        <tbody>
          {filteredData.map((item, index) => (
            <tr key={index}>
              <td>{item.process}</td>
              <td>{item.acceptable}</td>
              <td>{item.achievable}</td>
              <td>{item.gap}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div>
      <Header />
      <h2>RTO/RPO Gap Analysis</h2>
      <div>
        <button onClick={() => setActiveTab('recovery-rto')}>Recovery - RTO Gaps</button>
        <button onClick={() => setActiveTab('recovery-rpo')}>Recovery - RPO Gaps</button>
        <button onClick={() => setActiveTab('repatriation-rto')}>Repatriation - RTO Gaps</button>
        <button onClick={() => setActiveTab('repatriation-rpo')}>Repatriation - RPO Gaps</button>
      </div>
      {renderTable()}
    </div>
  );
};

export default RTORPOAnalysis;
