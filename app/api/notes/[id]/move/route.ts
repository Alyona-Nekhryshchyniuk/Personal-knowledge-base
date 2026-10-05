import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { moveNote } from '@/lib/services/notes';
import { z } from 'zod';

const MoveNoteSchema = z.object({
  collectionId: z.string().min(1, 'Collection ID is required'),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = MoveNoteSchema.parse(body);

    const note = await moveNote(session.user.id, id, parsed.collectionId);
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

    console.error(`PATCH /api/notes//move error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
