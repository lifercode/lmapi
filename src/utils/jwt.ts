import jwt from 'jsonwebtoken';
import { env } from '@/constants/env';

export interface JwtPayload {
  userId: string;
  email: string;
}

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: '7d' // Token expires in 7 days
  });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
};

// export const decodeToken = (token: string): JwtPayload | null => {
//   try {
//     return jwt.decode(token) as JwtPayload;
//   } catch (error) {
//     return null;
//   }
// }; 