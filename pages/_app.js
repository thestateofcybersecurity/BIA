import '../styles/globals.css';
import { ChakraProvider } from '@chakra-ui/react';
import { Auth0Provider } from '@auth0/auth0-react';
import ErrorBoundary from '../components/ErrorBoundary';

function MyApp({ Component, pageProps }) {
  return (
    <ErrorBoundary>
      <Auth0Provider
        domain={process.env.NEXT_PUBLIC_AUTH0_DOMAIN}
        clientId={process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID}
        redirectUri={typeof window !== 'undefined' ? window.location.origin : ''}
        audience={process.env.NEXT_PUBLIC_AUTH0_AUDIENCE}
      >
        <ChakraProvider>
          <Component {...pageProps} />
        </ChakraProvider>
      </Auth0Provider>
    </ErrorBoundary>
  );
}

export default MyApp;
