'use client';

import { useNotifications } from '@/components/NotificationProvider';
import { Badge, IconButton, Tooltip } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';

export function NotificationBadge() {
  const { notifications, showNotifications, toggleNotifications } = useNotifications();

  return (
    <Tooltip title={showNotifications ? 'Hide notifications' : 'Show notifications'}>
      <IconButton size="small" onClick={toggleNotifications} sx={{ position: 'relative' }}>
        <Badge badgeContent={notifications.length} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
    </Tooltip>
  );
}
