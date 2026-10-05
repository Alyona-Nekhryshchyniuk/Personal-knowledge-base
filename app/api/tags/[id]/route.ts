import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { updateTagSchema } from '@/lib/validation';
import { updateTag, deleteTag, getTag } from '@/lib/services/tags';

/**
 * GET /api/tags/:id
 * Get a single tag with note count
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
    const tag = await getTag(session.user.id, id);

    return NextResponse.json(tag);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    if (message === 'Tag not found') {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    console.error('Error fetching tag:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tag' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tags/:id
 * Rename a tag
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
    const validationResult = updateTagSchema.safeParse(body);
    if (!validationResult.success) {
      const error = validationResult.error.errors[0];
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    const { name } = validationResult.data;
    const { id } = await params;
    const tag = await updateTag(session.user.id, id, name);

    return NextResponse.json(tag);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    if (message === 'Tag not found') {
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

    console.error('Error updating tag:', error);
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/tags/:id
 * Delete a tag (removes from notes, doesn't delete notes)
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
    const result = await deleteTag(session.user.id, id);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    if (message === 'Tag not found') {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    console.error('Error deleting tag:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
