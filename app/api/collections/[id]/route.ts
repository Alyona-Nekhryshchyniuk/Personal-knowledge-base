import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { updateCollectionSchema } from '@/lib/validation';
import {
  updateCollection,
  deleteCollection,
  getCollection,
} from '@/lib/services/collections';

/**
 * GET /api/collections/:id
 * Get a single collection with note count
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const collection = await getCollection(session.user.id, id);

    return NextResponse.json(collection);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    if (message === 'Collection not found') {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    console.error('Error fetching collection:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collection' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/collections/:id
 * Rename a collection
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const validationResult = updateCollectionSchema.safeParse(body);
    if (!validationResult.success) {
      const error = validationResult.error.errors[0];
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    const { name } = validationResult.data;
    const { id } = await params;
    const collection = await updateCollection(session.user.id, id, name);

    return NextResponse.json(collection);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    if (message === 'Collection not found') {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    if (message.includes('already exists')) {
      return NextResponse.json(
        { error: message },
        { status: 409 }
      );
    }

    console.error('Error updating collection:', error);
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/collections/:id
 * Delete a collection and cascade delete all notes
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    await deleteCollection(session.user.id, id);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    if (message === 'Collection not found') {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    console.error('Error deleting collection:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
