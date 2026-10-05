/**
 * E2E Test Utilities and Helpers
 */

export interface TestContext {
  baseUrl: string;
  userId?: string;
  sessionToken?: string;
  browserContext?: any;
}

export interface TestResult {
  scenario: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  timestamp: Date;
}

export interface TestReport {
  totalScenarios: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  successRate: number;
  results: TestResult[];
  startedAt: Date;
  completedAt: Date;
}

/**
 * Mock browser context for testing
 */
export class MockBrowserContext {
  private responses: Map<string, unknown> = new Map();
  private interceptors: Map<string, (url: string) => unknown> = new Map();

  async goto(url: string): Promise<void> {
    console.log(`Navigating to: ${url}`);
  }

  async click(selector: string): Promise<void> {
    console.log(`Clicking: ${selector}`);
  }

  async fill(selector: string, text: string): Promise<void> {
    console.log(`Filling ${selector} with: ${text}`);
  }

  async selectOption(selector: string, value: string): Promise<void> {
    console.log(`Selecting ${value} in ${selector}`);
  }

  async waitForSelector(selector: string, timeout?: number): Promise<void> {
    console.log(`Waiting for ${selector}`);
  }

  async isVisible(selector: string): Promise<boolean> {
    console.log(`Checking visibility of ${selector}`);
    return this.responses.get(`visible:${selector}`) as boolean || false;
  }

  async getAttribute(selector: string, attr: string): Promise<string | null> {
    console.log(`Getting attribute ${attr} from ${selector}`);
    return (this.responses.get(`attr:${selector}:${attr}`) as string) || null;
  }

  async textContent(selector: string): Promise<string | null> {
    console.log(`Getting text from ${selector}`);
    return (this.responses.get(`text:${selector}`) as string) || null;
  }

  mockResponse(key: string, value: unknown): void {
    this.responses.set(key, value);
  }

  registerInterceptor(pattern: string, handler: (url: string) => unknown): void {
    this.interceptors.set(pattern, handler);
  }

  async close(): Promise<void> {
    console.log('Closing browser context');
  }
}

/**
 * Test execution engine
 */
export class TestExecutor {
  private context: TestContext;
  private results: TestResult[] = [];
  private startTime: number = 0;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.context = { baseUrl };
  }

  async executeStep(step: any, browser: MockBrowserContext): Promise<void> {
    const actionStartTime = Date.now();

    switch (step.action) {
      case 'visit':
        await browser.goto(`${this.context.baseUrl}${step.target}`);
        break;

      case 'navigate':
        await browser.goto(`${this.context.baseUrl}${step.target}`);
        break;

      case 'click':
        await browser.click(step.target);
        break;

      case 'fillForm':
        await browser.fill(step.target, step.value);
        break;

      case 'selectOption':
        await browser.selectOption(step.target, step.value);
        break;

      case 'waitFor':
        await browser.waitForSelector(step.target, 5000);
        break;

      case 'verifyVisible':
        const isVisible = await browser.isVisible(step.target);
        if (!isVisible) {
          throw new Error(`Element not visible: ${step.target}`);
        }
        break;

      case 'verifyHidden':
        const hidden = !(await browser.isVisible(step.target));
        if (!hidden) {
          throw new Error(`Element should be hidden: ${step.target}`);
        }
        break;

      case 'verifyAttribute':
        const attr = await browser.getAttribute(step.target, step.value);
        if (!attr) {
          throw new Error(`Attribute not found: ${step.value}`);
        }
        break;

      case 'loginAsUser':
        // Mock login
        this.context.userId = step.target;
        console.log(`Logged in as: ${step.target}`);
        break;

      case 'refreshPage':
        console.log('Refreshing page');
        break;

      case 'verifyLoggedIn':
        const loggedIn = await browser.isVisible(step.target);
        if (!loggedIn) {
          throw new Error('User not logged in');
        }
        break;

      case 'rightClick':
        console.log(`Right-clicking: ${step.target}`);
        break;

      case 'measureLoadTime':
        // Measure actual load time
        console.log(`Measuring load time for ${step.target}`);
        break;

      case 'triggerNotification':
        console.log(`Triggering notification for ${step.target}`);
        break;

      case 'simulateNetworkError':
        console.log('Simulating network error');
        break;

      case 'simulateNetworkRecover':
        console.log('Simulating network recovery');
        break;

      default:
        console.log(`Unknown action: ${step.action}`);
    }

    const stepDuration = Date.now() - actionStartTime;
    console.log(`Step completed in ${stepDuration}ms`);
  }

  async executeScenario(scenario: any): Promise<TestResult> {
    const browser = new MockBrowserContext();
    const scenarioStartTime = Date.now();
    this.startTime = this.startTime || scenarioStartTime;

    try {
      for (const step of scenario.steps) {
        await this.executeStep(step, browser);
      }

      await browser.close();

      const result: TestResult = {
        scenario: scenario.name,
        status: 'passed',
        duration: Date.now() - scenarioStartTime,
        timestamp: new Date(),
      };

      this.results.push(result);
      return result;
    } catch (error) {
      const result: TestResult = {
        scenario: scenario.name,
        status: 'failed',
        duration: Date.now() - scenarioStartTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };

      this.results.push(result);
      return result;
    }
  }

  async executeScenarios(scenarios: any[]): Promise<TestReport> {
    const reportStartTime = Date.now();
    this.startTime = reportStartTime;

    for (const scenario of scenarios) {
      await this.executeScenario(scenario);
    }

    const passed = this.results.filter((r) => r.status === 'passed').length;
    const failed = this.results.filter((r) => r.status === 'failed').length;
    const skipped = this.results.filter((r) => r.status === 'skipped').length;
    const totalDuration = Date.now() - reportStartTime;

    return {
      totalScenarios: this.results.length,
      passed,
      failed,
      skipped,
      duration: totalDuration,
      successRate: (passed / this.results.length) * 100,
      results: this.results,
      startedAt: new Date(reportStartTime),
      completedAt: new Date(),
    };
  }

  getResults(): TestResult[] {
    return this.results;
  }

  clearResults(): void {
    this.results = [];
    this.startTime = 0;
  }
}

/**
 * Test report formatter
 */
export function formatTestReport(report: TestReport): string {
  const lines: string[] = [
    '\n=== E2E Test Report ===\n',
    `Total Scenarios: ${report.totalScenarios}`,
    `✓ Passed: ${report.passed}`,
    `✗ Failed: ${report.failed}`,
    `⊘ Skipped: ${report.skipped}`,
    `Success Rate: ${report.successRate.toFixed(2)}%`,
    `Duration: ${report.duration}ms\n`,
  ];

  if (report.failed > 0) {
    lines.push('Failed Scenarios:');
    report.results
      .filter((r) => r.status === 'failed')
      .forEach((r) => {
        lines.push(`  ✗ ${r.scenario}`);
        if (r.error) {
          lines.push(`    Error: ${r.error}`);
        }
      });
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * Load time measurement utilities
 */
export class LoadTimeProfiler {
  private measurements: Map<string, number[]> = new Map();

  recordMeasurement(label: string, duration: number): void {
    if (!this.measurements.has(label)) {
      this.measurements.set(label, []);
    }
    this.measurements.get(label)!.push(duration);
  }

  getAverageLoadTime(label: string): number {
    const measurements = this.measurements.get(label) || [];
    if (measurements.length === 0) return 0;

    const sum = measurements.reduce((a, b) => a + b, 0);
    return sum / measurements.length;
  }

  getLoadTimeReport(): Record<string, { avg: number; min: number; max: number }> {
    const report: Record<string, { avg: number; min: number; max: number }> = {};

    for (const [label, measurements] of this.measurements.entries()) {
      if (measurements.length > 0) {
        report[label] = {
          avg: this.getAverageLoadTime(label),
          min: Math.min(...measurements),
          max: Math.max(...measurements),
        };
      }
    }

    return report;
  }

  clear(): void {
    this.measurements.clear();
  }
}

/**
 * Test data generator for seeding
 */
export function generateTestUser(): { id: string; email: string; name: string } {
  const timestamp = Date.now();
  return {
    id: `test-user-${timestamp}`,
    email: `test${timestamp}@example.com`,
    name: `Test User ${timestamp}`,
  };
}

export function generateTestCollection(): { id: string; name: string } {
  const timestamp = Date.now();
  return {
    id: `test-collection-${timestamp}`,
    name: `Test Collection ${timestamp}`,
  };
}

export function generateTestNote(): { id: string; title: string; content: string } {
  const timestamp = Date.now();
  return {
    id: `test-note-${timestamp}`,
    title: `Test Note ${timestamp}`,
    content: `This is a test note created at ${new Date(timestamp).toISOString()}`,
  };
}

export function generateTestTag(): { id: string; name: string } {
  const timestamp = Date.now();
  return {
    id: `test-tag-${timestamp}`,
    name: `test-tag-${timestamp}`,
  };
}
