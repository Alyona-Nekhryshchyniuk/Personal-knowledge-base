'use client';

import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Badge,
  Collapse,
} from '@mui/material';
import {
  Close as CloseIcon,
  NotificationsActive as NotificationsActiveIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { useNotifications, type ReviewReminder } from '@/components/NotificationProvider';
import { formatDistanceToNow } from 'date-fns';

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationPanel({ open, onClose }: NotificationPanelProps) {
  const {
    notifications,
    unreadCount,
    markAsRead,
    clearNotification,
    clearAll,
    dismiss,
  } = useNotifications();

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleNotificationClick = (notification: ReviewReminder) => {
    if (expandedId === notification.id) {
      setExpandedId(null);
    } else {
      setExpandedId(notification.id);
      markAsRead(notification.id);
    }
  };

  const getOverdueColor = (overdue: boolean, daysOverdue: number): 'error' | 'warning' | 'info' => {
    if (!overdue) return 'info';
    if (daysOverdue > 7) return 'error';
    return 'warning';
  };

  const getStatusLabel = (notification: ReviewReminder): string => {
    if (notification.overdue) {
      return `${notification.daysOverdue} days overdue`;
    }
    return 'Due today';
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose} sx={{ width: 400 }}>
      <Box sx={{ width: 400, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box
          sx={{
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <NotificationsActiveIcon />
            <Typography variant="h6">Review Reminders</Typography>
            {unreadCount > 0 && (
              <Badge badgeContent={unreadCount} color="error" sx={{ ml: 1 }} />
            )}
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Notification List */}
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          {notifications.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="textSecondary">No reminders at the moment</Typography>
            </Box>
          ) : (
            <List sx={{ width: '100%' }}>
              {notifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <ListItem
                    onClick={() => handleNotificationClick(notification)}
                    sx={{
                      cursor: 'pointer',
                      backgroundColor:
                        expandedId === notification.id ? 'action.hover' : 'transparent',
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: 600,
                              flex: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {notification.title}
                          </Typography>
                          <Chip
                            label={getStatusLabel(notification)}
                            size="small"
                            color={getOverdueColor(notification.overdue, notification.daysOverdue)}
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          <Typography variant="caption" component="div" color="textSecondary">
                            {notification.collection}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Due: {notification.nextReviewDate}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>

                  {/* Expanded Details */}
                  <Collapse
                    in={expandedId === notification.id}
                    timeout="auto"
                    unmountOnExit
                  >
                    <Box
                      sx={{
                        p: 2,
                        backgroundColor: 'action.hover',
                        display: 'flex',
                        gap: 1,
                        justifyContent: 'flex-end',
                      }}
                    >
                      <Button
                        size="small"
                        startIcon={<CheckIcon />}
                        variant="outlined"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await fetch('/api/notifications/ack', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ noteId: notification.noteId }),
                            });
                          } catch (error) {
                            console.error('[Notification] Failed to mark as read:', error);
                          }
                          markAsRead(notification.id);
                          clearNotification(notification.id);
                        }}
                      >
                        Mark Read
                      </Button>
                      <Button
                        size="small"
                        startIcon={<DeleteIcon />}
                        variant="outlined"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          dismiss(notification.id);
                        }}
                      >
                        Dismiss
                      </Button>
                    </Box>
                  </Collapse>

                  {index < notifications.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>

        {/* Footer */}
        {notifications.length > 0 && (
          <Box
            sx={{
              p: 2,
              borderTop: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              gap: 1,
            }}
          >
            <Button
              fullWidth
              size="small"
              variant="outlined"
              onClick={clearAll}
            >
              Clear All
            </Button>
          </Box>
        )}
      </Box>
    </Drawer>
  );
}
