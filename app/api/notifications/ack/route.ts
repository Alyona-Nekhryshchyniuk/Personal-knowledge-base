import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  const session = await getServerSession(authConfig);

  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
    });
  }

  try {
    const { noteId } = await req.json();

    if (!noteId) {
      return new Response(JSON.stringify({ error: 'Missing noteId' }), {
        status: 400,
      });
    }

    // Mark notification as acknowledged
    await prisma.notificationLog.upsert({
      where: {
        userId_noteId: {
          userId: session.user.id,
          noteId,
        },
      },
      update: {
        ackedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        noteId,
        ackedAt: new Date(),
      },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
    });
  } catch (error) {
    console.error('[API] Error acknowledging notification:', error);
    return new Response(JSON.stringify({ error: 'Failed to acknowledge notification' }), {
      status: 500,
    });
  }
}
