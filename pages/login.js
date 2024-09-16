import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

const Login = () => {
  const { loginWithRedirect, isAuthenticated } = useAuth0();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    } else {
      loginWithRedirect();
    }
  }, [isAuthenticated, loginWithRedirect, router]);

  return <div>Logging in...</div>;
};

export default Login;
