import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { createTagSchema } from '@/lib/validation';
import { listTags, createTag } from '@/lib/services/tags';

/**
 * GET /api/tags
 * List all tags for the authenticated user
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

    const tags = await listTags(session.user.id);

    return NextResponse.json({
      tags,
    });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tags
 * Create a new tag
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
    const validationResult = createTagSchema.safeParse(body);
    if (!validationResult.success) {
      const error = validationResult.error.errors[0];
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    const { name } = validationResult.data;
    const tag = await createTag(session.user.id, name);

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('already exists')) {
      return NextResponse.json(
        { error: message },
        { status: 409 }
      );
    }

    console.error('Error creating tag:', error);
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
