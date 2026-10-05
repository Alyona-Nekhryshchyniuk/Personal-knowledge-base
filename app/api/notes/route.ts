import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { listNotes, createNote } from '@/lib/services/notes';
import { z } from 'zod';

const CreateNoteSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  content: z.string().min(1, 'Content is required'),
  collectionId: z.string().min(1, 'Collection ID is required'),
  sourceUrl: z.string().url().optional().or(z.literal('')),
  reviewInterval: z.enum(['none', 'daily', 'weekly', 'monthly', 'custom']).optional(),
  customDays: z.number().int().positive().optional(),
  tagIds: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const collectionId = searchParams.get('collection') || undefined;
    const tagIds = searchParams.get('tags')
      ? searchParams.get('tags')!.split(',').filter(Boolean)
      : undefined;
    const status = searchParams.get('status') as 'Active' | 'Archived' | undefined;
    const reviewState = searchParams.get('reviewState') as
      | 'due'
      | 'overdue'
      | 'next7days'
      | 'none'
      | undefined;
    const search = searchParams.get('search') || undefined;
    const skip = Math.max(0, parseInt(searchParams.get('skip') || '0'));
    const take = Math.min(100, parseInt(searchParams.get('take') || '20'));

    const notes = await listNotes(
      session.user.id,
      {
        collectionId,
        tagIds,
        status,
        reviewState,
        search,
      },
      skip,
      take
    );

    return NextResponse.json({ notes, total: notes.length });
  } catch (error) {
    console.error('GET /api/notes error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = CreateNoteSchema.parse(body);

    const note = await createNote(session.user.id, {
      ...parsed,
      sourceUrl: parsed.sourceUrl || undefined,
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('POST /api/notes error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
