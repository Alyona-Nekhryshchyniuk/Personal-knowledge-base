import { getToken } from 'next-auth/jwt';
import { IncomingMessage } from 'http';

export async function authenticateConnection(req: IncomingMessage) {
  try {
    const token = await getToken({
      req: req as any,
      secret: process.env.NEXTAUTH_SECRET || '',
    });

    if (!token || !token.sub) {
      return null;
    }

    return {
      user: {
        id: token.sub,
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      console.error('[WS Auth] Error:', error.message);
    } else {
      console.error('[WS Auth] Error:', error);
    }
    return null;
  }
}
