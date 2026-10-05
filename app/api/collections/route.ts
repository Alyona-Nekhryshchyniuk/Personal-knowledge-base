import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { createCollectionSchema } from '@/lib/validation';
import {
  listCollections,
  createCollection,
} from '@/lib/services/collections';

/**
 * GET /api/collections
 * List all collections for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const collections = await listCollections(session.user.id);

    return NextResponse.json({
      collections,
    });
  } catch (error) {
    console.error('Error fetching collections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collections' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/collections
 * Create a new collection
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate input
    const validationResult = createCollectionSchema.safeParse(body);
    if (!validationResult.success) {
      const error = validationResult.error.errors[0];
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    const { name } = validationResult.data;
    const collection = await createCollection(session.user.id, name);

    return NextResponse.json(collection, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('already exists')) {
      return NextResponse.json(
        { error: message },
        { status: 409 }
      );
    }

    console.error('Error creating collection:', error);
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
