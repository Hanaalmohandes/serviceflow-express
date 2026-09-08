import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const ACCESS_TOKEN_EXPIRES_IN = '1m';
const REFRESH_TOKEN_EXPIRES_IN = '10m';

function getAccessSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET is not configured');
  }

  return secret;
}

function getRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;

  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET is not configured');
  }

  return secret;
}

export function signAccessToken(payload: object) {
  return jwt.sign(
    {
      ...payload,
      tokenType: 'access'
    },
    getAccessSecret(),
    {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN
    }
  );
}

export function verifyAccessToken(token: string) {
  const decoded = jwt.verify(
    token,
    getAccessSecret()
  ) as jwt.JwtPayload;

  if (decoded.tokenType !== 'access') {
    throw new Error('Invalid access token');
  }

  return decoded;
}

export function signRefreshToken(payload: object) {
  return jwt.sign(
    {
      ...payload,
      tokenType: 'refresh'
    },
    getRefreshSecret(),
    {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN
    }
  );
}

export function verifyRefreshToken(token: string) {
  const decoded = jwt.verify(
    token,
    getRefreshSecret()
  ) as jwt.JwtPayload;

  if (decoded.tokenType !== 'refresh') {
    throw new Error('Invalid refresh token');
  }

  return decoded;
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function comparePassword(
  password: string,
  hash: string
) {
  return bcrypt.compare(password, hash);
}