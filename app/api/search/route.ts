import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { searchNotes, advancedSearch, getSearchSuggestions } from '@/lib/services/search';
import { z } from 'zod';

const SearchSchema = z.object({
  query: z.string().min(1, 'Search query required'),
  collectionId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  status: z.enum(['Active', 'Archived']).optional(),
  reviewState: z.enum(['due', 'overdue', 'next7days', 'none']).optional(),
  skip: z.number().int().nonnegative().optional(),
  take: z.number().int().positive().max(100).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = SearchSchema.parse(body);

    const results = await searchNotes(session.user.id, parsed.query, {
      collectionId: parsed.collectionId,
      tagIds: parsed.tagIds,
      status: parsed.status,
      skip: parsed.skip,
      take: parsed.take,
    });

    return NextResponse.json({
      results,
      total: results.length,
      query: parsed.query,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('POST /api/search error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');

    if (type === 'suggestions') {
      const prefix = searchParams.get('prefix');
      if (!prefix) {
        return NextResponse.json({ error: 'Prefix required' }, { status: 400 });
      }

      const suggestions = await getSearchSuggestions(session.user.id, prefix, 10);
      return NextResponse.json({ suggestions });
    }

    // Advanced search
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : undefined;
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined;
    const hasUrl = searchParams.get('hasUrl')
      ? searchParams.get('hasUrl') === 'true'
      : undefined;

    const results = await advancedSearch(session.user.id, {
      query: searchParams.get('query') || undefined,
      collectionId: searchParams.get('collection') || undefined,
      tagIds: searchParams.get('tags')
        ? searchParams.get('tags')!.split(',').filter(Boolean)
        : undefined,
      status: (searchParams.get('status') as 'Active' | 'Archived') || undefined,
      reviewState: (searchParams.get('reviewState') as any) || undefined,
      startDate,
      endDate,
      hasUrl,
      skip: Math.max(0, parseInt(searchParams.get('skip') || '0')),
      take: Math.min(100, parseInt(searchParams.get('take') || '20')),
    });

    return NextResponse.json({
      results,
      total: results.length,
    });
  } catch (error) {
    console.error('GET /api/search error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
