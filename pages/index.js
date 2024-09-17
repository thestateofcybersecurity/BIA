import React, { useEffect } from 'react';
import Link from 'next/link';
import { useAuth0 } from '@auth0/auth0-react';
import Header from '../components/Header';
import { useRouter } from 'next/router';

const Home = () => {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) return <div>Loading...</div>;

  if (!isAuthenticated) return null; // This prevents content flash before redirect

  return (
    <div className="home">
      <Header />
      <h1>Welcome to BIA Web Application</h1>
      <div>
        <p>Get started with your Business Impact Analysis:</p>
        <ul>
          <li><Link href="/business-process">Define Business Processes</Link></li>
          <li><Link href="/impact-analysis">Conduct Impact Analysis</Link></li>
          <li><Link href="/rto-rpo-analysis">RTO/RPO Analysis</Link></li>
        </ul>
      </div>
    </div>
  );
};

export default Home;
