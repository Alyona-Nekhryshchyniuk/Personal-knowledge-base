'use client';

import { useNotifications } from '@/components/NotificationProvider';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import { IconButton } from '@mui/material';
import { addDismissedNotification } from '@/lib/utils/dismissedNotifications';

/**
 * Toast notification renderer - shows notifications as pop-ups
 * Renders invisibly but triggers toasts when new notifications arrive
 */
export function NotificationPanel() {
  const { notifications, showNotifications, dismissNotification } = useNotifications();
  const lastProcessedRef = useRef<Set<string>>(new Set());
  const activeToastsRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    // If notifications are hidden, dismiss all toasts
    if (!showNotifications) {
      activeToastsRef.current.forEach((toastId) => {
        toast.dismiss(toastId);
      });
      activeToastsRef.current.clear();
      return;
    }

    // When showing notifications again, reset the processed set so toasts can be recreated
    if (showNotifications && activeToastsRef.current.size === 0) {
      lastProcessedRef.current.clear();
    }

    notifications.forEach((notif, index) => {
      const key = `${notif.noteId}-${notif.nextReviewDate}`;

      if (!lastProcessedRef.current.has(key)) {
        lastProcessedRef.current.add(key);

        const status = notif.overdue
          ? `Overdue by ${notif.daysOverdue} day${notif.daysOverdue !== 1 ? 's' : ''}`
          : 'Due today';

        const borderColor = notif.overdue ? '#ff6b6b' : '#ffa500';

        // Stagger toast creation to prevent overlap
        setTimeout(() => {
          const toastId: string = toast(
            <div style={{ position: 'relative', width: '100%', pr: '8px' }}>
              <IconButton
                size="small"
                onClick={() => {
                  addDismissedNotification(notif.noteId);
                  dismissNotification(notif.noteId);
                  toast.dismiss(toastId);
                }}
                sx={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  p: '4px',
                  minWidth: 'auto',
                  color: '#999',
                  '&:hover': { color: '#333' },
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
              <div style={{ paddingRight: '24px' }}>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                  {notif.title}
                </div>
                <div style={{ fontSize: '0.9em', color: '#666', marginBottom: '4px' }}>
                  {notif.collectionName}
                </div>
                <div
                  style={{
                    fontSize: '0.85em',
                    color: borderColor,
                    fontWeight: 600,
                  }}
                >
                  {status}
                </div>
              </div>
            </div>,
            {
              duration: 6000,
              style: {
                backgroundColor: '#ffffff',
                border: `2px solid ${borderColor}`,
                borderRadius: '8px',
                padding: '12px 16px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              },
            }
          );
          activeToastsRef.current.set(key, toastId);
        }, index * 200); // 200ms stagger between each toast
      }
    });
  }, [notifications, showNotifications]);

  return null;
}
