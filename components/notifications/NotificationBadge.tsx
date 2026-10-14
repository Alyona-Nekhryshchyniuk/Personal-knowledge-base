'use client';

import { useNotifications } from '@/components/NotificationProvider';
import { Badge, IconButton, Tooltip } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';

export function NotificationBadge() {
  const { notifications } = useNotifications();

  return (
    <Tooltip title="Review reminders">
      <IconButton size="small" sx={{ position: 'relative' }}>
        <Badge badgeContent={notifications.length} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
    </Tooltip>
  );
}
