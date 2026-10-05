/**
 * E2E Test Scenarios for Personal Knowledge Base
 * Covers complete user flows and critical paths
 */

export interface TestScenario {
  name: string;
  description: string;
  steps: TestStep[];
  expectedOutcome: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface TestStep {
  action: string;
  target: string;
  value?: string;
  waitFor?: string;
}

/**
 * Authentication Scenarios
 */
export const authScenarios: TestScenario[] = [
  {
    name: 'User Login with Google OAuth',
    description: 'User logs in successfully using Google OAuth',
    priority: 'critical',
    steps: [
      { action: 'visit', target: '/' },
      { action: 'click', target: '[data-testid="google-signin"]' },
      { action: 'fillForm', target: 'email', value: 'test@gmail.com' },
      { action: 'fillForm', target: 'password', value: 'testPassword123' },
      { action: 'click', target: 'button:contains("Next")' },
      { action: 'waitFor', target: '[data-testid="dashboard"]' },
    ],
    expectedOutcome: 'User is logged in and redirected to dashboard',
  },
  {
    name: 'Session Persistence',
    description: 'User session persists across page refreshes',
    priority: 'high',
    steps: [
      { action: 'loginAsUser', target: 'test@example.com' },
      { action: 'navigate', target: '/dashboard' },
      { action: 'verifyLoggedIn', target: '[data-testid="user-avatar"]' },
      { action: 'refreshPage', target: '' },
      { action: 'waitFor', target: '[data-testid="dashboard"]' },
      { action: 'verifyLoggedIn', target: '[data-testid="user-avatar"]' },
    ],
    expectedOutcome: 'User remains logged in after page refresh',
  },
  {
    name: 'Logout Functionality',
    description: 'User can successfully log out',
    priority: 'high',
    steps: [
      { action: 'loginAsUser', target: 'test@example.com' },
      { action: 'click', target: '[data-testid="user-avatar"]' },
      { action: 'click', target: '[data-testid="logout-button"]' },
      { action: 'waitFor', target: '[data-testid="signin-page"]' },
    ],
    expectedOutcome: 'User is logged out and redirected to login page',
  },
];

/**
 * Collection Management Scenarios
 */
export const collectionScenarios: TestScenario[] = [
  {
    name: 'Create New Collection',
    description: 'User can create a new collection',
    priority: 'critical',
    steps: [
      { action: 'loginAsUser', target: 'test@example.com' },
      { action: 'navigate', target: '/dashboard' },
      { action: 'click', target: '[data-testid="new-collection"]' },
      { action: 'fillForm', target: 'collectionName', value: 'Test Collection' },
      { action: 'click', target: '[data-testid="save-collection"]' },
      { action: 'waitFor', target: 'text=Test Collection' },
    ],
    expectedOutcome: 'Collection is created and appears in sidebar',
  },
  {
    name: 'Edit Collection Name',
    description: 'User can edit collection name',
    priority: 'high',
    steps: [
      { action: 'loginAsUser', target: 'test@example.com' },
      { action: 'navigate', target: '/dashboard/collections' },
      { action: 'rightClick', target: 'text=Test Collection' },
      { action: 'click', target: '[data-testid="edit-collection"]' },
      { action: 'fillForm', target: 'collectionName', value: 'Renamed Collection' },
      { action: 'click', target: '[data-testid="save-collection"]' },
      { action: 'waitFor', target: 'text=Renamed Collection' },
    ],
    expectedOutcome: 'Collection name is updated',
  },
  {
    name: 'Delete Collection',
    description: 'User can delete a collection',
    priority: 'high',
    steps: [
      { action: 'loginAsUser', target: 'test@example.com' },
      { action: 'navigate', target: '/dashboard/collections' },
      { action: 'rightClick', target: 'text=Test Collection' },
      { action: 'click', target: '[data-testid="delete-collection"]' },
      { action: 'click', target: '[data-testid="confirm-delete"]' },
      { action: 'waitFor', target: 'text=Collection deleted' },
    ],
    expectedOutcome: 'Collection is deleted with confirmation message',
  },
];

/**
 * Note Management Scenarios
 */
export const noteScenarios: TestScenario[] = [
  {
    name: 'Create Note in Collection',
    description: 'User can create a new note',
    priority: 'critical',
    steps: [
      { action: 'loginAsUser', target: 'test@example.com' },
      { action: 'navigate', target: '/dashboard' },
      { action: 'click', target: '[data-testid="new-note"]' },
      { action: 'fillForm', target: 'noteTitle', value: 'My First Note' },
      { action: 'fillForm', target: 'noteContent', value: 'This is a test note' },
      { action: 'selectOption', target: 'collection', value: 'Learning' },
      { action: 'click', target: '[data-testid="save-note"]' },
      { action: 'waitFor', target: 'text=My First Note' },
    ],
    expectedOutcome: 'Note is created and appears in dashboard',
  },
  {
    name: 'Edit Note',
    description: 'User can edit an existing note',
    priority: 'high',
    steps: [
      { action: 'loginAsUser', target: 'test@example.com' },
      { action: 'navigate', target: '/dashboard' },
      { action: 'click', target: 'text=My First Note' },
      { action: 'click', target: '[data-testid="edit-note"]' },
      { action: 'fillForm', target: 'noteTitle', value: 'Updated Note Title' },
      { action: 'click', target: '[data-testid="save-note"]' },
      { action: 'waitFor', target: 'text=Updated Note Title' },
    ],
    expectedOutcome: 'Note is updated with new content',
  },
  {
    name: 'Archive Note',
    description: 'User can archive a note',
    priority: 'high',
    steps: [
      { action: 'loginAsUser', target: 'test@example.com' },
      { action: 'navigate', target: '/dashboard' },
      { action: 'click', target: 'text=My First Note' },
      { action: 'click', target: '[data-testid="archive-note"]' },
      { action: 'waitFor', target: 'text=Note archived' },
      { action: 'click', target: '[data-testid="filter-status"]' },
      { action: 'selectOption', target: 'status', value: 'archived' },
      { action: 'verifyVisible', target: 'text=My First Note' },
    ],
    expectedOutcome: 'Note appears in archived section',
  },
  {
    name: 'Delete Note',
    description: 'User can delete a note',
    priority: 'high',
    steps: [
      { action: 'loginAsUser', target: 'test@example.com' },
      { action: 'navigate', target: '/dashboard' },
      { action: 'click', target: 'text=My First Note' },
      { action: 'click', target: '[data-testid="delete-note"]' },
      { action: 'click', target: '[data-testid="confirm-delete"]' },
      { action: 'waitFor', target: 'text=Note deleted' },
    ],
    expectedOutcome: 'Note is deleted permanently',
  },
];

/**
 * Tag Management Scenarios
 */
export const tagScenarios: TestScenario[] = [
  {
    name: 'Create Tag',
    description: 'User can create a new tag',
    priority: 'high',
    steps: [
      { action: 'loginAsUser', target: 'test@example.com' },
      { action: 'navigate', target: '/dashboard/tags' },
      { action: 'click', target: '[data-testid="new-tag"]' },
      { action: 'fillForm', target: 'tagName', value: 'important' },
      { action: 'click', target: '[data-testid="save-tag"]' },
      { action: 'waitFor', target: 'text=important' },
    ],
    expectedOutcome: 'Tag is created and appears in tag list',
  },
  {
    name: 'Assign Tag to Note',
    description: 'User can assign tags to notes',
    priority: 'high',
    steps: [
      { action: 'loginAsUser', target: 'test@example.com' },
      { action: 'navigate', target: '/dashboard' },
      { action: 'click', target: 'text=My First Note' },
      { action: 'click', target: '[data-testid="edit-tags"]' },
      { action: 'selectOption', target: 'tags', value: 'important' },
      { action: 'click', target: '[data-testid="save-tags"]' },
      { action: 'verifyVisible', target: 'text=important' },
    ],
    expectedOutcome: 'Tag appears on note',
  },
];

/**
 * Search and Filter Scenarios
 */
export const searchScenarios: TestScenario[] = [
  {
    name: 'Search by Title',
    description: 'User can search notes by title',
    priority: 'high',
    steps: [
      { action: 'loginAsUser', target: 'test@example.com' },
      { action: 'navigate', target: '/dashboard' },
      { action: 'fillForm', target: '[data-testid="search-input"]', value: 'First' },
      { action: 'waitFor', target: 'text=My First Note' },
      { action: 'verifyHidden', target: 'text=Other Note' },
    ],
    expectedOutcome: 'Only notes matching search appear',
  },
  {
    name: 'Filter by Collection',
    description: 'User can filter notes by collection',
    priority: 'high',
    steps: [
      { action: 'loginAsUser', target: 'test@example.com' },
      { action: 'navigate', target: '/dashboard' },
      { action: 'click', target: '[data-testid="filter-collection"]' },
      { action: 'selectOption', target: 'collection', value: 'Learning' },
      { action: 'verifyVisible', target: 'text=Learning Collection' },
    ],
    expectedOutcome: 'Only notes from selected collection appear',
  },
  {
    name: 'Filter by Tag',
    description: 'User can filter notes by tag',
    priority: 'high',
    steps: [
      { action: 'loginAsUser', target: 'test@example.com' },
      { action: 'navigate', target: '/dashboard' },
      { action: 'click', target: '[data-testid="filter-tag"]' },
      { action: 'selectOption', target: 'tags', value: 'important' },
      { action: 'verifyVisible', target: 'text=important' },
    ],
    expectedOutcome: 'Only notes with selected tag appear',
  },
];

/**
 * Review Reminder Scenarios
 */
export const reviewScenarios: TestScenario[] = [
  {
    name: 'Set Review Interval',
    description: 'User can set review interval for a note',
    priority: 'high',
    steps: [
      { action: 'loginAsUser', target: 'test@example.com' },
      { action: 'navigate', target: '/dashboard' },
      { action: 'click', target: 'text=My First Note' },
      { action: 'click', target: '[data-testid="edit-note"]' },
      { action: 'selectOption', target: 'reviewInterval', value: 'daily' },
      { action: 'click', target: '[data-testid="save-note"]' },
      { action: 'verifyVisible', target: '[data-testid="review-badge"]' },
    ],
    expectedOutcome: 'Note has review interval set and badge shows',
  },
  {
    name: 'View Due Notifications',
    description: 'User can see notifications for due reviews',
    priority: 'high',
    steps: [
      { action: 'loginAsUser', target: 'test@example.com' },
      { action: 'navigate', target: '/dashboard' },
      { action: 'click', target: '[data-testid="notification-badge"]' },
      { action: 'waitFor', target: '[data-testid="notification-panel"]' },
      { action: 'verifyVisible', target: '[data-testid="due-notification"]' },
    ],
    expectedOutcome: 'Notification panel shows due reviews',
  },
];

/**
 * WebSocket Notification Scenarios
 */
export const websocketScenarios: TestScenario[] = [
  {
    name: 'Receive Real-time Notification',
    description: 'User receives real-time notification when note becomes due',
    priority: 'high',
    steps: [
      { action: 'loginAsUser', target: 'test@example.com' },
      { action: 'navigate', target: '/dashboard' },
      { action: 'waitFor', target: '[data-testid="ws-indicator"]' },
      { action: 'verifyAttribute', target: '[data-testid="ws-indicator"]', value: 'connected' },
      { action: 'triggerNotification', target: 'noteId' },
      { action: 'waitFor', target: 'text=Review reminder' },
    ],
    expectedOutcome: 'Real-time notification is received and displayed',
  },
  {
    name: 'Reconnection on Network Error',
    description: 'WebSocket reconnects after network interruption',
    priority: 'medium',
    steps: [
      { action: 'loginAsUser', target: 'test@example.com' },
      { action: 'navigate', target: '/dashboard' },
      { action: 'verifyAttribute', target: '[data-testid="ws-indicator"]', value: 'connected' },
      { action: 'simulateNetworkError', target: '' },
      { action: 'waitFor', target: 'text=Attempting reconnection...' },
      { action: 'simulateNetworkRecover', target: '' },
      { action: 'waitFor', target: '[data-testid="ws-indicator"][connected]' },
    ],
    expectedOutcome: 'WebSocket reconnects automatically',
  },
];

/**
 * Performance Scenarios
 */
export const performanceScenarios: TestScenario[] = [
  {
    name: 'Dashboard Load Time',
    description: 'Dashboard loads within acceptable time',
    priority: 'high',
    steps: [
      { action: 'loginAsUser', target: 'test@example.com' },
      { action: 'measureLoadTime', target: '/dashboard', value: '2000' },
      { action: 'navigate', target: '/dashboard' },
      { action: 'waitFor', target: '[data-testid="dashboard"]' },
    ],
    expectedOutcome: 'Dashboard loads in less than 2 seconds',
  },
  {
    name: 'Search Performance',
    description: 'Search results load quickly',
    priority: 'medium',
    steps: [
      { action: 'loginAsUser', target: 'test@example.com' },
      { action: 'navigate', target: '/dashboard' },
      { action: 'measureLoadTime', target: 'search', value: '500' },
      { action: 'fillForm', target: '[data-testid="search-input"]', value: 'test' },
      { action: 'waitFor', target: '[data-testid="search-results"]' },
    ],
    expectedOutcome: 'Search results appear within 500ms',
  },
];

/**
 * Get all scenarios
 */
export function getAllScenarios(): TestScenario[] {
  return [
    ...authScenarios,
    ...collectionScenarios,
    ...noteScenarios,
    ...tagScenarios,
    ...searchScenarios,
    ...reviewScenarios,
    ...websocketScenarios,
    ...performanceScenarios,
  ];
}

/**
 * Get scenarios by priority
 */
export function getScenariosByPriority(
  priority: 'critical' | 'high' | 'medium' | 'low'
): TestScenario[] {
  return getAllScenarios().filter((s) => s.priority === priority);
}

/**
 * Get critical path scenarios
 */
export function getCriticalPathScenarios(): TestScenario[] {
  return getScenariosByPriority('critical');
}

export const testMetrics = {
  totalScenarios: getAllScenarios().length,
  criticalScenarios: getScenariosByPriority('critical').length,
  highPriorityScenarios: getScenariosByPriority('high').length,
  mediumPriorityScenarios: getScenariosByPriority('medium').length,
};
