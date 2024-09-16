import React from 'react';
import Link from 'next/link';
import { useAuth0 } from '@auth0/auth0-react';
import { useRouter } from 'next/router';

const Header = () => {
  const { isAuthenticated, logout, user } = useAuth0();
  const router = useRouter();

  return (
    <header>
      <nav>
        <ul>
          <li><Link href="/">Home</Link></li>
          <li><Link href="/business-process">Business Process</Link></li>
          <li><Link href="/impact-analysis">Impact Analysis</Link></li>
          <li><Link href="/rto-rpo-analysis">RTO/RPO Analysis</Link></li>
        </ul>
      </nav>
      {isAuthenticated ? (
        <div>
          <span>Welcome, {user?.name}!</span>
          <button onClick={() => logout({ returnTo: typeof window !== 'undefined' ? window.location.origin : '' })}>Log Out</button>
        </div>
      ) : (
        <button onClick={() => router.push('/login')}>Log In</button>
      )}
    </header>
  );
};

export default Header;
