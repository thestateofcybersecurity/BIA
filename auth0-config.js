import { getSession } from '@auth0/nextjs-auth0';

export const getSessionAndUser = async (req, res) => {
  try {
    const session = await getSession(req, res);
    return { session, user: session?.user };
  } catch (error) {
    console.error('Error getting session:', error);
    return { session: null, user: null };
  }
};
