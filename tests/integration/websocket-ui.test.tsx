import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { NotificationProvider, useNotificationContext } from '@/lib/contexts/NotificationContext';
import { WebSocketNotification } from '@/lib/hooks/useWebSocket';

describe('WebSocket UI Integration (T069-T076)', () => {
  describe('T070: NotificationContext', () => {
    it('provides notification state management', () => {
      let contextValue: any;

      function TestComponent() {
        contextValue = useNotificationContext();
        return null;
      }

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      expect(contextValue).toBeDefined();
      expect(contextValue.notifications).toEqual([]);
      expect(contextValue.unreadCount).toBe(0);
      expect(typeof contextValue.addNotification).toBe('function');
      expect(typeof contextValue.markAsRead).toBe('function');
      expect(typeof contextValue.clearNotification).toBe('function');
      expect(typeof contextValue.clearAll).toBe('function');
      expect(typeof contextValue.dismiss).toBe('function');
    });

    it('adds notifications to state', async () => {
      const testNotification: WebSocketNotification = {
        id: 'test-1',
        noteId: 'note-1',
        title: 'Test Note',
        collection: 'Test Collection',
        nextReviewDate: '2026-10-05',
        overdue: false,
        daysOverdue: 0,
        dueToday: true,
      };

      let contextValue: any;

      function TestComponent() {
        contextValue = useNotificationContext();
        return (
          <button onClick={() => contextValue.addNotification(testNotification)}>
            Add Notification
          </button>
        );
      }

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(contextValue.notifications).toHaveLength(1);
        expect(contextValue.unreadCount).toBe(1);
      });
    });

    it('marks notifications as read', async () => {
      const testNotification: WebSocketNotification = {
        id: 'test-1',
        noteId: 'note-1',
        title: 'Test Note',
        collection: 'Test Collection',
        nextReviewDate: '2026-10-05',
        overdue: false,
        daysOverdue: 0,
        dueToday: true,
      };

      let contextValue: any;

      function TestComponent() {
        contextValue = useNotificationContext();
        return (
          <div>
            <button onClick={() => contextValue.addNotification(testNotification)}>
              Add
            </button>
            <button onClick={() => contextValue.markAsRead('test-1')}>
              Mark Read
            </button>
          </div>
        );
      }

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      const [addBtn, readBtn] = screen.getAllByRole('button');
      fireEvent.click(addBtn);

      await waitFor(() => {
        expect(contextValue.unreadCount).toBe(1);
      });

      fireEvent.click(readBtn);

      await waitFor(() => {
        expect(contextValue.unreadCount).toBe(0);
      });
    });

    it('clears individual notifications', async () => {
      const testNotification: WebSocketNotification = {
        id: 'test-1',
        noteId: 'note-1',
        title: 'Test Note',
        collection: 'Test Collection',
        nextReviewDate: '2026-10-05',
        overdue: false,
        daysOverdue: 0,
        dueToday: true,
      };

      let contextValue: any;

      function TestComponent() {
        contextValue = useNotificationContext();
        return (
          <div>
            <button onClick={() => contextValue.addNotification(testNotification)}>
              Add
            </button>
            <button onClick={() => contextValue.clearNotification('test-1')}>
              Clear
            </button>
          </div>
        );
      }

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      const [addBtn, clearBtn] = screen.getAllByRole('button');
      fireEvent.click(addBtn);

      await waitFor(() => {
        expect(contextValue.notifications).toHaveLength(1);
      });

      fireEvent.click(clearBtn);

      await waitFor(() => {
        expect(contextValue.notifications).toHaveLength(0);
      });
    });

    it('clears all notifications', async () => {
      const notification1: WebSocketNotification = {
        id: 'test-1',
        noteId: 'note-1',
        title: 'Test Note 1',
        collection: 'Collection 1',
        nextReviewDate: '2026-10-05',
        overdue: false,
        daysOverdue: 0,
        dueToday: true,
      };

      const notification2: WebSocketNotification = {
        id: 'test-2',
        noteId: 'note-2',
        title: 'Test Note 2',
        collection: 'Collection 2',
        nextReviewDate: '2026-10-06',
        overdue: true,
        daysOverdue: 1,
        dueToday: false,
      };

      let contextValue: any;

      function TestComponent() {
        contextValue = useNotificationContext();
        return (
          <div>
            <button onClick={() => contextValue.addNotification(notification1)}>
              Add 1
            </button>
            <button onClick={() => contextValue.addNotification(notification2)}>
              Add 2
            </button>
            <button onClick={() => contextValue.clearAll()}>
              Clear All
            </button>
          </div>
        );
      }

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      const [add1Btn, add2Btn, clearBtn] = screen.getAllByRole('button');
      fireEvent.click(add1Btn);
      fireEvent.click(add2Btn);

      await waitFor(() => {
        expect(contextValue.notifications).toHaveLength(2);
      });

      fireEvent.click(clearBtn);

      await waitFor(() => {
        expect(contextValue.notifications).toHaveLength(0);
        expect(contextValue.unreadCount).toBe(0);
      });
    });

    it('dismisses notifications (clears and marks read)', async () => {
      const testNotification: WebSocketNotification = {
        id: 'test-1',
        noteId: 'note-1',
        title: 'Test Note',
        collection: 'Test Collection',
        nextReviewDate: '2026-10-05',
        overdue: false,
        daysOverdue: 0,
        dueToday: true,
      };

      let contextValue: any;

      function TestComponent() {
        contextValue = useNotificationContext();
        return (
          <div>
            <button onClick={() => contextValue.addNotification(testNotification)}>
              Add
            </button>
            <button onClick={() => contextValue.dismiss('test-1')}>
              Dismiss
            </button>
          </div>
        );
      }

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      const [addBtn, dismissBtn] = screen.getAllByRole('button');
      fireEvent.click(addBtn);

      await waitFor(() => {
        expect(contextValue.notifications).toHaveLength(1);
        expect(contextValue.unreadCount).toBe(1);
      });

      fireEvent.click(dismissBtn);

      await waitFor(() => {
        expect(contextValue.notifications).toHaveLength(0);
        expect(contextValue.unreadCount).toBe(0);
      });
    });

    it('prevents duplicate notifications', async () => {
      const testNotification: WebSocketNotification = {
        id: 'test-1',
        noteId: 'note-1',
        title: 'Test Note',
        collection: 'Test Collection',
        nextReviewDate: '2026-10-05',
        overdue: false,
        daysOverdue: 0,
        dueToday: true,
      };

      let contextValue: any;

      function TestComponent() {
        contextValue = useNotificationContext();
        return (
          <button onClick={() => contextValue.addNotification(testNotification)}>
            Add
          </button>
        );
      }

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);
      fireEvent.click(button);

      await waitFor(() => {
        expect(contextValue.notifications).toHaveLength(1);
      });
    });
  });
});
