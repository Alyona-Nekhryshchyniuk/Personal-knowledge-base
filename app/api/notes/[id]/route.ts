import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { getNote, updateNote, deleteNote } from '@/lib/services/notes';
import { z } from 'zod';

const UpdateNoteSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title must not exceed 500 characters').optional(),
  content: z.string().min(1, 'Content is required').optional(),
  collectionId: z.string().cuid().optional(),
  sourceUrl: z.string().url('Source URL must be a valid URL').optional().or(z.literal('')).or(z.null()),
  reviewInterval: z.enum(['none', 'daily', 'weekly', 'monthly', 'custom']).optional(),
  customDays: z.number().int('Custom days must be an integer').positive('Custom days must be greater than 0').optional().or(z.null()),
  tagIds: z.array(z.string().cuid()).optional(),
}).refine(
  (data) => !data.reviewInterval || data.reviewInterval !== 'custom' || (data.customDays && data.customDays > 0),
  { message: 'Custom days must be greater than 0 when review interval is custom', path: ['customDays'] }
);

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const note = await getNote(session.user.id, id);
    return NextResponse.json(note);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error(`GET /api/notes/ error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = UpdateNoteSchema.parse(body);

    const note = await updateNote(session.user.id, id, {
      ...parsed,
      sourceUrl: parsed.sourceUrl || undefined,
    });

    return NextResponse.json(note);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error(`PATCH /api/notes/ error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await deleteNote(session.user.id, id);
    return NextResponse.json(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error(`DELETE /api/notes/ error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
