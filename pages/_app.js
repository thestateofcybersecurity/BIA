import '../styles/globals.css';
import { ChakraProvider } from '@chakra-ui/react';
import { UserProvider } from '@auth0/nextjs-auth0/client';
import ErrorBoundary from '../components/ErrorBoundary';

function MyApp({ Component, pageProps }) {
  return (
    <ErrorBoundary>
      <UserProvider>
        <ChakraProvider>
          <Component {...pageProps} />
        </ChakraProvider>
      </UserProvider>
    </ErrorBoundary>
  );
}

export default MyApp;
