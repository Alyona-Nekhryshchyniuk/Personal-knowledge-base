import { getToken } from 'next-auth/jwt';
import { IncomingMessage } from 'http';

export async function authenticateConnection(req: IncomingMessage) {
  try {
    console.log('[WS Auth] Attempting to authenticate WebSocket connection');
    const cookieHeader = req.headers.cookie;

    if (!cookieHeader) {
      console.warn('[WS Auth] No cookies in request - authentication failed');
      return null;
    }

    const cookies = parseCookies(cookieHeader);
    const sessionToken = cookies['authjs.session-token'];

    console.log('[WS Auth] Cookies found:', Object.keys(cookies).join(', '));
    console.log('[WS Auth] Session token present:', !!sessionToken);

    if (!sessionToken) {
      console.warn('[WS Auth] No session token found in cookies');
      console.log('[WS Auth] Available cookies:', Object.keys(cookies));
      return null;
    }

    // Create a mock request object that next-auth's getToken expects
    const mockReq = {
      headers: {
        cookie: cookieHeader,
      },
    };

    const token = await getToken({
      req: mockReq as any,
      secret: process.env.NEXTAUTH_SECRET || '',
    });

    console.log('[WS Auth] Token validated:', !!token);

    if (!token?.sub) {
      console.warn('[WS Auth] Token validation failed - no sub claim');
      return null;
    }

    console.log('[WS Auth] ✓ Authenticated user:', token.sub);
    return {
      user: {
        id: token.sub,
      },
    };
  } catch (error) {
    console.error('[WS Auth] Error during authentication:',
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader.split(/;\s*/).forEach(pair => {
    const [name, ...valueParts] = pair.split('=');
    if (name) {
      const decodedName = decodeURIComponent(name.trim());
      const decodedValue = decodeURIComponent(valueParts.join('='));
      cookies[decodedName] = decodedValue;
    }
  });
  return cookies;
}
