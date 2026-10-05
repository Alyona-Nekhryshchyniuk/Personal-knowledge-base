import {
  recordQuery,
  getQueryStats,
  getSlowQueries,
  getRecommendations,
} from '@/lib/performance/query-analyzer';
import { cache, cacheKeys, cacheInvalidation } from '@/lib/performance/cache-strategy';
import { monitor, recordApiCall, recordDatabaseCall, getDashboardData } from '@/lib/performance/monitoring';
import {
  errorTracker,
  trackDatabaseError,
  trackValidationError,
  checkAlertThresholds,
} from '@/lib/performance/error-tracking';
import { analytics, analyticsEvents, trackFeatureUsage, getUsageStatistics } from '@/lib/performance/analytics';
import { benchmarker, performanceTargets, checkSLOCompliance } from '@/lib/performance/benchmarks';

describe('Performance & Monitoring (T085-T090)', () => {
  describe('T085: Query Analysis', () => {
    beforeEach(() => {
      // Clear previous metrics
    });

    it('records query performance', () => {
      recordQuery('getUserNotes', 45, 'read', true, 10);
      recordQuery('getUserNotes', 52, 'read', true, 10);
      recordQuery('getUserNotes', 38, 'read', true, 10);

      const stats = getQueryStats('getUserNotes') as any;
      expect(stats.count).toBe(3);
      expect(stats.avgDuration).toBeGreaterThan(0);
      expect(stats.minDuration).toBe(38);
      expect(stats.maxDuration).toBe(52);
    });

    it('identifies slow queries', () => {
      recordQuery('getFastQuery', 25, 'read', true, 1);
      recordQuery('getSlowQuery', 250, 'read', true, 1);

      const slowQueries = getSlowQueries(10);
      expect(slowQueries.some((q) => q.name === 'getSlowQuery')).toBe(true);
    });

    it('calculates query statistics', () => {
      recordQuery('test1', 100, 'read', true);
      recordQuery('test1', 200, 'read', true);
      recordQuery('test2', 50, 'read', true);

      const allStats = getQueryStats() as any;
      expect(Object.keys(allStats).length).toBeGreaterThanOrEqual(2);
    });

    it('provides performance recommendations', () => {
      // Create slow query pattern
      for (let i = 0; i < 20; i++) {
        recordQuery('slowQueryPattern', 300, 'read', true);
      }

      const recommendations = getRecommendations();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].recommendation).toBeTruthy();
    });
  });

  describe('T086: Caching Strategy', () => {
    beforeEach(() => {
      cache.clear();
    });

    it('stores and retrieves cached values', () => {
      const testData = { id: '1', name: 'Test' };
      const key = cacheKeys.userCollections('user-1');

      cache.set(key, testData, 5000, ['collections']);
      const retrieved = cache.get(key);

      expect(retrieved).toEqual(testData);
    });

    it('expires cached values', async () => {
      const key = 'test-key';
      cache.set(key, 'value', 100); // 100ms TTL

      let retrieved = cache.get(key);
      expect(retrieved).toBe('value');

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      retrieved = cache.get(key);
      expect(retrieved).toBeNull();
    });

    it('invalidates by tag', () => {
      cache.set('key1', 'value1', 5000, ['collections']);
      cache.set('key2', 'value2', 5000, ['collections']);
      cache.set('key3', 'value3', 5000, ['notes']);

      cache.invalidate('collections');

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBe('value3');
    });

    it('handles cache invalidation on data changes', () => {
      const userId = 'user-1';

      // Simulate cached collections
      cache.set(cacheKeys.userCollections(userId), { id: '1' }, 5000, [
        'collections',
        `user-${userId}`,
      ]);

      expect(cache.get(cacheKeys.userCollections(userId))).toBeTruthy();

      // Invalidate on collection change
      cacheInvalidation.onCollectionChange(userId);

      expect(cache.get(cacheKeys.userCollections(userId))).toBeNull();
    });
  });

  describe('T087: Performance Monitoring', () => {
    beforeEach(() => {
      monitor.clearMetrics();
    });

    it('records API call metrics', () => {
      recordApiCall('/api/notes', 'GET', 200, 45);
      recordApiCall('/api/notes', 'GET', 200, 52);

      const data = getDashboardData();
      expect(data.summary).toBeTruthy();
      expect(data.summary.apiLatency.avgMs).toBeGreaterThan(0);
    });

    it('records database call metrics', () => {
      recordDatabaseCall('findMany', 35, true);
      recordDatabaseCall('findMany', 40, true);
      recordDatabaseCall('update', 50, true);

      const data = getDashboardData();
      expect(data.summary).toBeTruthy();
    });

    it('calculates percentile latencies', () => {
      // Record various latencies
      for (let i = 0; i < 100; i++) {
        recordApiCall('/api/notes', 'GET', 200, Math.random() * 200);
      }

      const data = getDashboardData();
      const { p50, p95, p99 } = data.summary.apiLatency;

      expect(p50).toBeGreaterThan(0);
      expect(p95).toBeGreaterThanOrEqual(p50);
      expect(p99).toBeGreaterThanOrEqual(p95);
    });

    it('generates dashboard data', () => {
      recordApiCall('/api/notes', 'GET', 200, 45);
      recordDatabaseCall('findMany', 35, true);

      const data = getDashboardData();

      expect(data.summary).toBeTruthy();
      expect(data.stats).toBeTruthy();
      expect(data.recentErrors).toBeDefined();
      expect(data.slowRequests).toBeDefined();
    });
  });

  describe('T088: Error Tracking', () => {
    beforeEach(() => {
      errorTracker.clearErrors();
      errorTracker.clearAlerts();
    });

    it('tracks errors with severity', () => {
      trackDatabaseError('Connection timeout', 'stack trace', {
        operation: 'findMany',
      });

      const errors = errorTracker.getErrors();
      expect(errors.length).toBe(1);
      expect(errors[0].severity).toBe('high');
      expect(errors[0].type).toBe('DatabaseError');
    });

    it('tracks validation errors', () => {
      trackValidationError('Invalid email format', { field: 'email' });

      const errors = errorTracker.getErrors({
        type: 'ValidationError',
      });

      expect(errors.length).toBe(1);
      expect(errors[0].severity).toBe('low');
    });

    it('resolves errors', () => {
      const errorResult = trackDatabaseError('Test error');
      const errors = errorTracker.getErrors();
      const error = errors[0];

      expect(error.resolved).toBe(false);

      const resolved = errorTracker.resolveError(error.id);
      expect(resolved).toBe(true);

      const retrievedError = errorTracker.getError(error.id);
      expect(retrievedError?.resolved).toBe(true);
    });

    it('creates alerts for critical errors', () => {
      trackDatabaseError('Critical database error');

      const alerts = errorTracker.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
    });

    it('checks alert thresholds', () => {
      const stats = {
        errorRate: 0.08, // 8% - exceeds 5% threshold
        criticalErrors: 2,
        avgResponseTime: 3000, // exceeds 5000ms threshold? No, within limit
        avgDatabaseLatency: 500, // within 1000ms threshold
      };

      const breachedAlerts = checkAlertThresholds(stats);
      expect(breachedAlerts.some((a) => a.includes('Error rate'))).toBe(true);
    });
  });

  describe('T089: Analytics Collection', () => {
    beforeEach(() => {
      analytics.clearEvents();
    });

    it('tracks analytics events', () => {
      analytics.trackEvent(analyticsEvents.NOTE_CREATED, 'user-1', {
        collectionId: 'col-1',
      });

      const events = analytics.getEvents({
        eventType: analyticsEvents.NOTE_CREATED,
      });

      expect(events.length).toBe(1);
      expect(events[0].userId).toBe('user-1');
    });

    it('tracks feature usage', () => {
      trackFeatureUsage(analyticsEvents.SEARCH_PERFORMED, 'user-1', {
        query: 'test',
      });

      const usage = analytics.getFeatureUsage();
      expect(usage.some((f) => f.feature === analyticsEvents.SEARCH_PERFORMED)).toBe(true);
    });

    it('calculates usage statistics', () => {
      analytics.trackEvent(analyticsEvents.NOTE_CREATED, 'user-1');
      analytics.trackEvent(analyticsEvents.NOTE_CREATED, 'user-2');
      analytics.trackEvent(analyticsEvents.NOTE_VIEWED, 'user-1');

      const stats = getUsageStatistics();

      expect(stats.activeUsers).toBe(2);
      expect(stats.eventCounts[analyticsEvents.NOTE_CREATED]).toBe(2);
      expect(stats.topFeatures.length).toBeGreaterThan(0);
    });

    it('tracks user-specific analytics', () => {
      analytics.trackEvent(analyticsEvents.NOTE_CREATED, 'user-1');
      analytics.trackEvent(analyticsEvents.NOTE_VIEWED, 'user-1');
      analytics.trackEvent(analyticsEvents.NOTE_CREATED, 'user-2');

      const user1Events = analytics.getEvents({ userId: 'user-1' });

      expect(user1Events.length).toBe(2);
      expect(user1Events.every((e) => e.userId === 'user-1')).toBe(true);
    });
  });

  describe('T090: Benchmarks & Load Testing', () => {
    it('runs benchmark', async () => {
      const result = await benchmarker.benchmark(
        'simple-operation',
        () => {
          return Promise.resolve(1 + 1);
        },
        100
      );

      expect(result.name).toBe('simple-operation');
      expect(result.iterations).toBe(100);
      expect(result.avgTime).toBeGreaterThan(0);
      expect(result.throughput).toBeGreaterThan(0);
    });

    it('compares benchmark results', async () => {
      await benchmarker.benchmark('operation-1', async () => {
        return new Promise((resolve) => setTimeout(resolve, 10));
      }, 10);

      await benchmarker.benchmark('operation-2', async () => {
        return new Promise((resolve) => setTimeout(resolve, 5));
      }, 10);

      const comparison = benchmarker.compareResults('operation-1', 'operation-2');

      expect(comparison.name1).toBeTruthy();
      expect(comparison.name2).toBeTruthy();
      // improvement can be positive (operation-1 is slower) or negative (operation-2 is slower)
      // We just check that comparison happened
      expect(typeof comparison.improvement).toBe('number');
    });

    it('checks SLO compliance', () => {
      const metrics = {
        apiP50: 80, // Within 100ms target
        apiP95: 450, // Within 500ms target
        cacheHitRate: 0.85, // Above 80% target
        errorRate: 0.005, // Below 1% target
      };

      const slos = checkSLOCompliance(metrics);

      expect(slos.every((s) => s.compliant)).toBe(true);
    });

    it('identifies SLO violations', () => {
      const metrics = {
        apiP50: 150, // Exceeds 100ms target
        apiP95: 600, // Exceeds 500ms target
        cacheHitRate: 0.7, // Below 80% target
        errorRate: 0.02, // Exceeds 1% target
      };

      const slos = checkSLOCompliance(metrics);

      expect(slos.some((s) => !s.compliant)).toBe(true);
    });
  });
});
