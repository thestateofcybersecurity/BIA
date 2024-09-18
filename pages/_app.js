import '../styles/globals.css';
import { ChakraProvider } from '@chakra-ui/react';
import { UserProvider } from '@auth0/nextjs-auth0/client';
import Header from '../components/Header';
import { useRouter } from 'next/router';
import { useUser } from '@auth0/nextjs-auth0/client';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const { user, isLoading } = useUser();

  if (isLoading) return <div>Loading...</div>;

  const isPublicPage = ['/login', '/api/auth/login', '/api/auth/logout', '/api/auth/callback'].includes(router.pathname);

  if (!user && !isPublicPage) {
    router.push('/login');
    return null;
  }

  return (
    <UserProvider>
      <ChakraProvider>
        {user && !isPublicPage && <Header />}
        <Component {...pageProps} />
      </ChakraProvider>
    </UserProvider>
  );
}

export default MyApp;
