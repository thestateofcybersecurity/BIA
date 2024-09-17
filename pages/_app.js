import '../styles/globals.css';
import { ChakraProvider } from '@chakra-ui/react';
import { Auth0Provider } from '@auth0/auth0-react';
import { useRouter } from 'next/router';
import ErrorBoundary from '../components/ErrorBoundary';
import { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

function AuthWrapper({ children }) {
  const { isAuthenticated, isLoading } = useAuth0();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && router.pathname !== '/login') {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) return <div>Loading...</div>;

  return children;
}

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  const onRedirectCallback = (appState) => {
    router.push(appState?.returnTo || '/');
  };

  return (
    <ErrorBoundary>
      <Auth0Provider
        domain={process.env.NEXT_PUBLIC_AUTH0_DOMAIN}
        clientId={process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID}
        redirectUri={typeof window !== 'undefined' ? window.location.origin : ''}
        onRedirectCallback={onRedirectCallback}
        audience={process.env.NEXT_PUBLIC_AUTH0_AUDIENCE}
      >
        <ChakraProvider>
          <AuthWrapper>
            <Component {...pageProps} />
          </AuthWrapper>
        </ChakraProvider>
      </Auth0Provider>
    </ErrorBoundary>
  );
}

export default MyApp;
