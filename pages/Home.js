import React from 'react';
import Header from '../components/Header';
import { useAuth0 } from '@auth0/auth0-react';
import { Link } from 'react-router-dom';

const Home = () => {
  const { isAuthenticated, loginWithRedirect } = useAuth0();

  return (
    <div className="home">
      <h1>Welcome to BIA Web Application</h1>
      {isAuthenticated ? (
        <div>
          <p>Get started with your Business Impact Analysis:</p>
          <ul>
            <li><Link to="/business-process">Define Business Processes</Link></li>
            <li><Link to="/impact-analysis">Conduct Impact Analysis</Link></li>
            <li><Link to="/rto-rpo-analysis">RTO/RPO Analysis</Link></li>
          </ul>
        </div>
      ) : (
        <div>
          <p>Please log in to access the BIA tools.</p>
          <button onClick={() => loginWithRedirect()}>Log In</button>
        </div>
      )}
    </div>
  );
};

export default Home;
