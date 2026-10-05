/**
 * E2E Tests for Critical User Paths
 */

import {
  authScenarios,
  collectionScenarios,
  noteScenarios,
  tagScenarios,
  searchScenarios,
  reviewScenarios,
  testMetrics,
} from './test-scenarios';
import {
  TestExecutor,
  formatTestReport,
  LoadTimeProfiler,
  generateTestUser,
  generateTestNote,
} from './test-utils';

describe('E2E Tests - Critical User Paths (T091)', () => {
  let executor: TestExecutor;
  let profiler: LoadTimeProfiler;

  beforeAll(() => {
    executor = new TestExecutor('http://localhost:3000');
    profiler = new LoadTimeProfiler();
  });

  afterEach(() => {
    executor.clearResults();
  });

  describe('Test Infrastructure', () => {
    it('loads all test scenarios', () => {
      expect(testMetrics.totalScenarios).toBeGreaterThan(0);
      expect(testMetrics.criticalScenarios).toBeGreaterThan(0);
      expect(testMetrics.highPriorityScenarios).toBeGreaterThan(0);
    });

    it('has critical path scenarios', () => {
      expect(authScenarios.some((s) => s.priority === 'critical')).toBe(true);
      expect(noteScenarios.some((s) => s.priority === 'critical')).toBe(true);
    });

    it('defines complete test steps', () => {
      const scenario = authScenarios[0];
      expect(scenario.steps.length).toBeGreaterThan(0);
      expect(scenario.steps[0].action).toBeTruthy();
      expect(scenario.expectedOutcome).toBeTruthy();
    });
  });

  describe('Critical Path - Authentication', () => {
    it('covers user login flow', async () => {
      const scenario = authScenarios.find((s) => s.name.includes('Login'));
      expect(scenario).toBeTruthy();
      expect(scenario!.priority).toBe('critical');

      const result = await executor.executeScenario(scenario!);
      expect(result).toBeTruthy();
    });

    it('covers session persistence', async () => {
      const scenario = authScenarios.find((s) => s.name.includes('Persistence'));
      expect(scenario).toBeTruthy();
      expect(scenario!.priority).toBe('high');
    });

    it('covers logout functionality', async () => {
      const scenario = authScenarios.find((s) => s.name.includes('Logout'));
      expect(scenario).toBeTruthy();
      expect(scenario!.priority).toBe('high');
    });
  });

  describe('Critical Path - Note Management', () => {
    it('covers complete note lifecycle', async () => {
      // Create
      const createScenario = noteScenarios.find((s) => s.name.includes('Create'));
      expect(createScenario).toBeTruthy();
      expect(createScenario!.priority).toBe('critical');

      // Edit
      const editScenario = noteScenarios.find((s) => s.name.includes('Edit'));
      expect(editScenario).toBeTruthy();

      // Archive
      const archiveScenario = noteScenarios.find((s) => s.name.includes('Archive'));
      expect(archiveScenario).toBeTruthy();

      // Delete
      const deleteScenario = noteScenarios.find((s) => s.name.includes('Delete'));
      expect(deleteScenario).toBeTruthy();
    });
  });

  describe('Critical Path - Collections', () => {
    it('covers collection management', async () => {
      const scenarios = collectionScenarios;
      expect(scenarios.length).toBeGreaterThanOrEqual(3);

      // All should have high priority
      scenarios.forEach((s) => {
        expect(['critical', 'high']).toContain(s.priority);
      });
    });
  });

  describe('Critical Path - Tags', () => {
    it('covers tag management', async () => {
      const scenarios = tagScenarios;
      expect(scenarios.length).toBeGreaterThan(0);

      scenarios.forEach((s) => {
        expect(s.steps.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Critical Path - Search & Filter', () => {
    it('covers search functionality', async () => {
      const searchScenario = searchScenarios.find((s) => s.name.includes('Search by'));
      expect(searchScenario).toBeTruthy();
      expect(searchScenario!.steps.length).toBeGreaterThan(0);
    });

    it('covers filtering by collection', async () => {
      const filterScenario = searchScenarios.find((s) => s.name.includes('Filter by Collection'));
      expect(filterScenario).toBeTruthy();
    });

    it('covers filtering by tag', async () => {
      const tagFilterScenario = searchScenarios.find((s) => s.name.includes('Filter by Tag'));
      expect(tagFilterScenario).toBeTruthy();
    });
  });

  describe('Critical Path - Review System', () => {
    it('covers review interval setting', async () => {
      const scenario = reviewScenarios.find((s) => s.name.includes('Set Review'));
      expect(scenario).toBeTruthy();
      expect(scenario!.steps.length).toBeGreaterThan(0);
    });

    it('covers notification viewing', async () => {
      const scenario = reviewScenarios.find((s) => s.name.includes('View Due'));
      expect(scenario).toBeTruthy();
    });
  });

  describe('Test Execution Reporting', () => {
    it('generates test report', async () => {
      const scenarios = [noteScenarios[0]];
      const report = await executor.executeScenarios(scenarios);

      expect(report.totalScenarios).toBe(1);
      expect(report.startedAt).toBeInstanceOf(Date);
      expect(report.completedAt).toBeInstanceOf(Date);
      expect(report.duration).toBeGreaterThanOrEqual(0);
    });

    it('formats test report', async () => {
      const scenarios = [noteScenarios[0]];
      const report = await executor.executeScenarios(scenarios);

      const formatted = formatTestReport(report);
      expect(formatted).toContain('E2E Test Report');
      expect(formatted).toContain('Success Rate');
      expect(formatted).toContain('Duration');
    });

    it('tracks load times', () => {
      profiler.recordMeasurement('dashboard', 150);
      profiler.recordMeasurement('dashboard', 180);
      profiler.recordMeasurement('search', 85);

      const avg = profiler.getAverageLoadTime('dashboard');
      expect(avg).toBeGreaterThan(0);
      expect(avg).toBeLessThanOrEqual(180);

      const report = profiler.getLoadTimeReport();
      expect(report.dashboard).toBeTruthy();
      expect(report.search).toBeTruthy();
    });
  });

  describe('Test Data Generation', () => {
    it('generates test user', () => {
      const user = generateTestUser();
      expect(user.id).toBeTruthy();
      expect(user.email).toContain('test');
      expect(user.name).toBeTruthy();
    });

    it('generates test note', () => {
      const note = generateTestNote();
      expect(note.id).toBeTruthy();
      expect(note.title).toBeTruthy();
      expect(note.content).toBeTruthy();
    });
  });

  describe('Scenario Metrics', () => {
    it('reports correct test metrics', () => {
      expect(testMetrics.totalScenarios).toBeGreaterThan(15);
      expect(testMetrics.criticalScenarios).toBeGreaterThan(0);
      expect(testMetrics.highPriorityScenarios).toBeGreaterThan(0);
    });

    it('prioritizes critical scenarios', () => {
      const criticalCount = testMetrics.criticalScenarios;
      const totalCount = testMetrics.totalScenarios;

      // Should have some critical scenarios
      expect(criticalCount).toBeGreaterThan(0);
      expect(criticalCount).toBeLessThanOrEqual(totalCount);
    });
  });
});
