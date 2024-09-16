import React from 'react';
import Link from 'next/link';
import { useAuth0 } from '@auth0/auth0-react';
import Header from '../components/Header';

const Home = () => {
  const { isAuthenticated, loginWithRedirect } = useAuth0();

  return (
    <div className="home">
      <Header />
      <h1>Welcome to BIA Web Application</h1>
      {isAuthenticated ? (
        <div>
          <p>Get started with your Business Impact Analysis:</p>
          <ul>
            <li><Link href="/business-process">Define Business Processes</Link></li>
            <li><Link href="/impact-analysis">Conduct Impact Analysis</Link></li>
            <li><Link href="/rto-rpo-analysis">RTO/RPO Analysis</Link></li>
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
