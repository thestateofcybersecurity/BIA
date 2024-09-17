import { getSession } from '@auth0/nextjs-auth0';

export const checkAuth = async (req, res) => {
  const session = await getSession(req, res);
  if (!session) {
    res.status(401).json({ error: 'Not authenticated' });
    return false;
  }
  return true;
};
