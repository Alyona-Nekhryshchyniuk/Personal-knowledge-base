import { NextRequest, NextResponse } from 'next/server';
import { auth } from './auth';

/**
 * Middleware to require authentication on API routes
 */
export async function requireAuth(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return session;
}

/**
 * Helper to verify user owns a resource
 */
export function verifyOwnership(userId: string | undefined, ownerId: string | undefined): boolean {
  if (!userId || !ownerId) {
    return false;
  }
  return userId === ownerId;
}

/**
 * Forbidden response helper
 */
export function forbiddenResponse() {
  return NextResponse.json(
    { error: 'Forbidden' },
    { status: 403 }
  );
}

/**
 * Not found response helper
 */
export function notFoundResponse() {
  return NextResponse.json(
    { error: 'Not found' },
    { status: 404 }
  );
}

/**
 * Bad request response helper
 */
export function badRequestResponse(message: string) {
  return NextResponse.json(
    { error: message },
    { status: 400 }
  );
}

/**
 * Conflict response helper
 */
export function conflictResponse(message: string) {
  return NextResponse.json(
    { error: message },
    { status: 409 }
  );
}
