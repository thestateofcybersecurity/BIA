import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Auth0Provider } from '@auth0/auth0-react';
import Header from './components/Header';
import Home from './pages/Home';
import BusinessProcessForm from './pages/BusinessProcessForm';
import ImpactAnalysisForm from './pages/ImpactAnalysisForm';
import RTORPOAnalysis from './pages/RTORPOAnalysis';

function App() {
  return (
    <Auth0Provider
      domain={process.env.REACT_APP_AUTH0_DOMAIN}
      clientId={process.env.REACT_APP_AUTH0_CLIENT_ID}
      redirectUri={window.location.origin}
      audience={process.env.REACT_APP_AUTH0_AUDIENCE}
    >
      <Router>
        <div className="App">
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/business-process" element={<BusinessProcessForm />} />
            <Route path="/impact-analysis" element={<ImpactAnalysisForm />} />
            <Route path="/rto-rpo-analysis" element={<RTORPOAnalysis />} />
          </Routes>
        </div>
      </Router>
    </Auth0Provider>
  );
}

export default App;
