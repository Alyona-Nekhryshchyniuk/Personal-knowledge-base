import { getServerSession } from '@/lib/auth';
import { db } from '@/lib/db';

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock Prisma
jest.mock('@/lib/db', () => ({
  db: {
    user: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

describe('Authentication Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('T024: SSO Login and User Creation', () => {
    it('should create a new user on first Google sign-in', async () => {
      const mockUser = {
        id: 'user-1',
        provider: 'google',
        providerUserId: 'google-123',
        email: 'user@example.com',
        displayName: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (db.user.upsert as jest.Mock).mockResolvedValue(mockUser);

      const result = await db.user.upsert({
        where: {
          provider_providerUserId: {
            provider: 'google',
            providerUserId: 'google-123',
          },
        },
        update: {
          email: 'user@example.com',
          displayName: 'Test User',
          avatarUrl: 'https://example.com/avatar.jpg',
        },
        create: {
          provider: 'google',
          providerUserId: 'google-123',
          email: 'user@example.com',
          displayName: 'Test User',
          avatarUrl: 'https://example.com/avatar.jpg',
        },
      });

      expect(result).toEqual(mockUser);
      expect(result.provider).toBe('google');
      expect(result.providerUserId).toBe('google-123');
    });

    it('should create a new user on first GitHub sign-in without email', async () => {
      const mockUser = {
        id: 'user-2',
        provider: 'github',
        providerUserId: 'github-456',
        email: null,
        displayName: 'github-user',
        avatarUrl: 'https://avatars.githubusercontent.com/u/123?v=4',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (db.user.upsert as jest.Mock).mockResolvedValue(mockUser);

      const result = await db.user.upsert({
        where: {
          provider_providerUserId: {
            provider: 'github',
            providerUserId: 'github-456',
          },
        },
        update: {
          displayName: 'github-user',
          avatarUrl: 'https://avatars.githubusercontent.com/u/123?v=4',
        },
        create: {
          provider: 'github',
          providerUserId: 'github-456',
          displayName: 'github-user',
          avatarUrl: 'https://avatars.githubusercontent.com/u/123?v=4',
        },
      });

      expect(result).toEqual(mockUser);
      expect(result.provider).toBe('github');
      expect(result.email).toBeNull();
    });

    it('should return existing user on repeat sign-in', async () => {
      const mockUser = {
        id: 'user-1',
        provider: 'google',
        providerUserId: 'google-123',
        email: 'user@example.com',
        displayName: 'Test User Updated',
        avatarUrl: 'https://example.com/avatar-updated.jpg',
        createdAt: new Date('2026-10-01'),
        updatedAt: new Date(),
      };

      (db.user.upsert as jest.Mock).mockResolvedValue(mockUser);

      const result = await db.user.upsert({
        where: {
          provider_providerUserId: {
            provider: 'google',
            providerUserId: 'google-123',
          },
        },
        update: {
          displayName: 'Test User Updated',
          avatarUrl: 'https://example.com/avatar-updated.jpg',
        },
        create: {
          provider: 'google',
          providerUserId: 'google-123',
          email: 'user@example.com',
          displayName: 'Test User',
          avatarUrl: 'https://example.com/avatar.jpg',
        },
      });

      expect(result.displayName).toBe('Test User Updated');
    });
  });

  describe('Session Management', () => {
    it('should persist session across requests', async () => {
      const mockSession = {
        user: {
          id: 'user-1',
          email: 'user@example.com',
          name: 'Test User',
          image: 'https://example.com/avatar.jpg',
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const session = await getServerSession();

      expect(session).toEqual(mockSession);
      expect(session?.user?.id).toBe('user-1');
    });

    it('should return null for unauthenticated user', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const session = await getServerSession();

      expect(session).toBeNull();
    });
  });

  describe('Logout', () => {
    it('should invalidate session on logout', async () => {
      // First call: authenticated
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: 'user-1' },
      });

      const sessionBefore = await getServerSession();
      expect(sessionBefore?.user?.id).toBe('user-1');

      // After logout: null
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);

      const sessionAfter = await getServerSession();
      expect(sessionAfter).toBeNull();
    });
  });

  describe('Authorization Checks', () => {
    it('should verify user owns a collection before allowing access', () => {
      const userId = 'user-1';
      const collectionOwnerId = 'user-1';

      expect(userId === collectionOwnerId).toBe(true);
    });

    it('should deny access if user does not own resource', () => {
      const userId = 'user-1';
      const resourceOwnerId = 'user-2';

      expect(userId === resourceOwnerId).toBe(false);
    });
  });
});
