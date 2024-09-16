import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import Header from '../components/Header';

const BusinessProcessForm = () => {
  const { user, getAccessTokenSilently } = useAuth0();
  const [formData, setFormData] = useState({
    processName: '',
    description: '',
    owner: '',
    dependencies: {
      people: '',
      itApplications: '',
      devices: '',
      facilityLocation: '',
      suppliers: ''
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = await getAccessTokenSilently();
      const response = await fetch('/api/index?path=businessProcess', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: user.sub,
          ...formData
        }),
      });
      if (response.ok) {
        alert('Business process saved successfully!');
      } else {
        throw new Error('Failed to save business process');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to save business process. Please try again.');
    }
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  return (
   <div>
      <Header />
      <form onSubmit={handleSubmit}>
      <h2>Business Process Assessment</h2>
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
        <label htmlFor="description">Description:</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="owner">Process Owner:</label>
        <input
          type="text"
          id="owner"
          name="owner"
          value={formData.owner}
          onChange={handleChange}
          required
        />
      </div>
      <h3>Dependencies</h3>
      <div>
        <label htmlFor="people">People:</label>
        <input
          type="text"
          id="people"
          name="dependencies.people"
          value={formData.dependencies.people}
          onChange={handleChange}
        />
      </div>
      <div>
        <label htmlFor="itApplications">IT Applications:</label>
        <input
          type="text"
          id="itApplications"
          name="dependencies.itApplications"
          value={formData.dependencies.itApplications}
          onChange={handleChange}
        />
      </div>
      <div>
        <label htmlFor="devices">Devices/Equipment:</label>
        <input
          type="text"
          id="devices"
          name="dependencies.devices"
          value={formData.dependencies.devices}
          onChange={handleChange}
        />
      </div>
      <div>
        <label htmlFor="facilityLocation">Facility Location:</label>
        <input
          type="text"
          id="facilityLocation"
          name="dependencies.facilityLocation"
          value={formData.dependencies.facilityLocation}
          onChange={handleChange}
        />
      </div>
      <div>
        <label htmlFor="suppliers">Suppliers:</label>
        <input
          type="text"
          id="suppliers"
          name="dependencies.suppliers"
          value={formData.dependencies.suppliers}
          onChange={handleChange}
        />
      </div>
      <button type="submit">Save Business Process</button>
    </form>
  </div>
  );
};

export default BusinessProcessForm;
