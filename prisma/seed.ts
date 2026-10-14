import { PrismaClient } from '@prisma/client';
import { addDays } from 'date-fns';

const db = new PrismaClient();

function getTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

async function main() {
  console.log('Seeding database...');

  // Create test user
  const user = await db.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
    },
  });

  console.log('Created user:', user.id);

  // Create collections
  const learningCol = await db.collection.upsert({
    where: { userId_name: { userId: user.id, name: 'Learning' } },
    update: {},
    create: { userId: user.id, name: 'Learning' },
  });

  const ideasCol = await db.collection.upsert({
    where: { userId_name: { userId: user.id, name: 'Ideas' } },
    update: {},
    create: { userId: user.id, name: 'Ideas' },
  });

  const linksCol = await db.collection.upsert({
    where: { userId_name: { userId: user.id, name: 'Links' } },
    update: {},
    create: { userId: user.id, name: 'Links' },
  });

  console.log('Created collections');

  // Create tags
  const importantTag = await db.tag.upsert({
    where: { userId_name: { userId: user.id, name: 'important' } },
    update: {},
    create: { userId: user.id, name: 'important' },
  });

  const reviewSoonTag = await db.tag.upsert({
    where: { userId_name: { userId: user.id, name: 'review-soon' } },
    update: {},
    create: { userId: user.id, name: 'review-soon' },
  });

  console.log('Created tags');

  const today = getTodayUTC();

  // Create notes with different review states
  const notes = [
    {
      title: 'Due Today - Daily Review',
      content: 'This note is due today for daily review',
      collectionId: learningCol.id,
      reviewInterval: 'daily',
      nextReviewDate: today,
      status: 'Active',
      tagIds: [importantTag.id],
    },
    {
      title: 'Overdue by 2 days',
      content: 'This note is overdue by 2 days',
      collectionId: learningCol.id,
      reviewInterval: 'weekly',
      nextReviewDate: addDays(today, -2),
      status: 'Active',
      tagIds: [reviewSoonTag.id],
    },
    {
      title: 'Due in 3 days',
      content: 'This note is due in 3 days',
      collectionId: ideasCol.id,
      reviewInterval: 'monthly',
      nextReviewDate: addDays(today, 3),
      status: 'Active',
      tagIds: [],
    },
    {
      title: 'No review schedule',
      content: 'This note has no review schedule',
      collectionId: linksCol.id,
      reviewInterval: 'none',
      nextReviewDate: null,
      status: 'Active',
      tagIds: [],
    },
    {
      title: 'Archived note',
      content: 'This note is archived and should not appear in notifications',
      collectionId: learningCol.id,
      reviewInterval: 'daily',
      nextReviewDate: today,
      status: 'Archived',
      tagIds: [],
    },
  ];

  for (const noteData of notes) {
    const { tagIds, ...rest } = noteData;
    const note = await db.note.create({
      data: {
        userId: user.id,
        ...rest,
      },
    });

    // Add tags
    for (const tagId of tagIds) {
      await db.noteTag.create({
        data: { noteId: note.id, tagId },
      });
    }
  }

  console.log('Created notes');
  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
