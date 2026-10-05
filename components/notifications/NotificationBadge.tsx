'use client';

import React from 'react';
import { IconButton, Badge, Tooltip, Box } from '@mui/material';
import { Notifications as NotificationsIcon } from '@mui/icons-material';
import { useNotifications } from '@/components/NotificationProvider';

interface NotificationBadgeProps {
  onClick: () => void;
}

export function NotificationBadge({ onClick }: NotificationBadgeProps) {
  const { unreadCount } = useNotifications();

  return (
    <Tooltip title={`${unreadCount} new reminders`}>
      <IconButton onClick={onClick} size="large" color={unreadCount > 0 ? 'error' : 'inherit'}>
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
    </Tooltip>
  );
}
