import { promisify } from 'util';
import jsonwebtoken from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const client = jwksClient({
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
});

const getSigningKey = promisify(client.getSigningKey);

export const checkJwt = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    throw new Error('No token provided');
  }

  try {
    const decodedToken = jsonwebtoken.decode(token, { complete: true });
    const signingKey = await getSigningKey(decodedToken.header.kid);
    const publicKey = signingKey.getPublicKey();

    const verified = jsonwebtoken.verify(token, publicKey, {
      audience: process.env.AUTH0_AUDIENCE,
      issuer: `https://${process.env.AUTH0_DOMAIN}/`,
      algorithms: ['RS256']
    });

    req.user = verified;
  } catch (error) {
    throw new Error('Invalid token');
  }
};
