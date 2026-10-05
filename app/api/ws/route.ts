import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function GET(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET || '',
  });

  if (!token?.sub) {
    return new Response('Unauthorized', { status: 401 });
  }

  return new Response(JSON.stringify({ connected: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export const runtime = 'nodejs';
