import { SignJWT, jwtVerify } from 'jose';

function getSecret(): Uint8Array {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error(
      'JWT_SECRET environment variable is not set. Please add it to your project environment variables.'
    );
  }
  return new TextEncoder().encode(jwtSecret);
}

const EXPIRATION_TIME = '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export async function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(EXPIRATION_TIME)
    .sign(getSecret());

  return token;
}

export async function verifyToken(token: string): Promise<JWTPayload> {
  try {
    const verified = await jwtVerify(token, getSecret());
    return verified.payload as unknown as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}
