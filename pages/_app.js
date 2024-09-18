import '../styles/globals.css';
import { ChakraProvider } from '@chakra-ui/react';
import { UserProvider } from '@auth0/nextjs-auth0/client';
import ErrorBoundary from '../components/ErrorBoundary';
import Header from '../components/Header';

function MyApp({ Component, pageProps }) {
  return (
    <UserProvider>
      <ChakraProvider>
        <ErrorBoundary>
          <Header />
          <Component {...pageProps} />
        </ErrorBoundary>
      </ChakraProvider>
    </UserProvider>
  );
}

export default MyApp;
