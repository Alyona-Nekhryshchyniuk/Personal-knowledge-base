import Database from 'better-sqlite3';

const db = new Database('./dev.db');

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("provider", "providerUserId")
  );

  CREATE TABLE IF NOT EXISTS "Collection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE,
    UNIQUE("userId", "name")
  );

  CREATE TABLE IF NOT EXISTS "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE,
    UNIQUE("userId", "name")
  );

  CREATE TABLE IF NOT EXISTS "Note" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "reviewInterval" TEXT NOT NULL DEFAULT 'none',
    "customDays" INTEGER,
    "nextReviewDate" DATE,
    "lastReviewedDate" DATE,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE,
    FOREIGN KEY ("collectionId") REFERENCES "Collection" ("id") ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "NoteTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "noteId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    FOREIGN KEY ("noteId") REFERENCES "Note" ("id") ON DELETE CASCADE,
    FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE,
    UNIQUE("noteId", "tagId")
  );

  CREATE INDEX IF NOT EXISTS "Collection_userId_idx" ON "Collection"("userId");
  CREATE INDEX IF NOT EXISTS "Tag_userId_idx" ON "Tag"("userId");
  CREATE INDEX IF NOT EXISTS "Note_userId_nextReviewDate_idx" ON "Note"("userId", "nextReviewDate");
  CREATE INDEX IF NOT EXISTS "Note_userId_status_idx" ON "Note"("userId", "status");
  CREATE INDEX IF NOT EXISTS "Note_userId_collectionId_idx" ON "Note"("userId", "collectionId");
  CREATE INDEX IF NOT EXISTS "Note_userId_updatedAt_idx" ON "Note"("userId", "updatedAt");
  CREATE INDEX IF NOT EXISTS "NoteTag_noteId_idx" ON "NoteTag"("noteId");
  CREATE INDEX IF NOT EXISTS "NoteTag_tagId_idx" ON "NoteTag"("tagId");
`);

db.close();
console.log('✅ Database initialized successfully!');
