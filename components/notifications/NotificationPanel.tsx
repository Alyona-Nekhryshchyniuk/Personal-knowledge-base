'use client';

import { useNotifications } from '@/components/NotificationProvider';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Stack,
  Typography,
  Chip,
  Box,
  IconButton,
  Collapse,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useSession } from 'next-auth/react';

export function NotificationPanel() {
  const { notifications, isConnected, isReconnecting, subscribe, dismissNotification } = useNotifications();
  const { data: session } = useSession();
  const [expanded, setExpanded] = useState(true);
  const [lastNotifCount, setLastNotifCount] = useState(0);

  useEffect(() => {
    if (notifications.length > lastNotifCount) {
      const newNotifs = notifications.slice(lastNotifCount);
      newNotifs.forEach((notif) => {
        const status = notif.overdue ? `Overdue by ${notif.daysOverdue} days` : 'Due today';
        toast.info(`${notif.title} - ${status}`);
      });
      setLastNotifCount(notifications.length);
    }
  }, [notifications, lastNotifCount]);

  if (!session) return null;

  return (
    <Card sx={{ mb: 2 }}>
      <CardHeader
        title={
          <Box display="flex" alignItems="center" gap={1}>
            <span>Review Reminders</span>
            {!isConnected && isReconnecting && <Chip label="Reconnecting..." size="small" color="warning" />}
            {!isConnected && !isReconnecting && <Chip label="Disconnected" size="small" color="error" />}
            {isConnected && <Chip label="Connected" size="small" color="success" />}
          </Box>
        }
        action={
          <IconButton
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-label="show more"
            size="small"
          >
            <ExpandMoreIcon sx={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s' }} />
          </IconButton>
        }
      />

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <CardContent>
          {notifications.length === 0 ? (
            <Typography variant="body2" color="textSecondary">
              No review reminders
            </Typography>
          ) : (
            <Stack spacing={1}>
              {notifications.map((notif, idx) => (
                <Box
                  key={`${notif.noteId}-${notif.nextReviewDate}-${idx}`}
                  sx={{
                    p: 1.5,
                    border: '1px solid',
                    borderColor: notif.overdue ? '#ff6b6b' : '#ffa500',
                    borderRadius: 1,
                    backgroundColor: notif.overdue ? 'rgba(255, 107, 107, 0.05)' : 'rgba(255, 165, 0, 0.05)',
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="start" gap={1}>
                    <Box flex={1}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {notif.title}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {notif.collectionName}
                      </Typography>
                      <Box mt={0.5}>
                        <Chip
                          label={
                            notif.overdue
                              ? `Overdue by ${notif.daysOverdue} day${notif.daysOverdue !== 1 ? 's' : ''}`
                              : 'Due today'
                          }
                          size="small"
                          color={notif.overdue ? 'error' : 'warning'}
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => dismissNotification(notif.noteId)}
                      sx={{ mt: -0.5 }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              ))}
            </Stack>
          )}

          <Box mt={2} display="flex" gap={1}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => subscribe()}
              disabled={!isConnected}
            >
              Refresh
            </Button>
          </Box>
        </CardContent>
      </Collapse>
    </Card>
  );
}
