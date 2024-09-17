import React, { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useRouter } from 'next/router';

const Login = () => {
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.push('/');
      } else {
        loginWithRedirect();
      }
    }
  }, [isAuthenticated, isLoading, loginWithRedirect, router]);

  return <div>Redirecting to login...</div>;
};

export default Login;
