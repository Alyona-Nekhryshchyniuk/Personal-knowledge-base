'use client';

import { Box, Typography, Button, Stack } from '@mui/material';
import {
  FolderOpen,
  LibraryBooks,
  SearchOff,
  NotificationsNone,
} from '@mui/icons-material';

interface EmptyStateProps {
  type: 'no-collections' | 'no-notes' | 'no-results' | 'no-reminders';
  onAction?: () => void;
}

export function EmptyState({ type, onAction }: EmptyStateProps) {
  const configs = {
    'no-collections': {
      icon: FolderOpen,
      title: 'No Collections Yet',
      description: 'Create a collection to organize your notes',
      action: 'Create Collection',
    },
    'no-notes': {
      icon: LibraryBooks,
      title: 'No Notes Yet',
      description: 'Start by creating your first note to save and organize your knowledge',
      action: 'Create Note',
    },
    'no-results': {
      icon: SearchOff,
      title: 'No Notes Found',
      description: 'Try adjusting your search or filters to find what you are looking for',
      action: undefined,
    },
    'no-reminders': {
      icon: NotificationsNone,
      title: 'No Reminders',
      description: 'All your notes are up to date. Great job!',
      action: undefined,
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        px: 2,
        textAlign: 'center',
      }}
    >
      <Icon
        sx={{
          fontSize: 80,
          color: 'action.disabled',
          mb: 2,
          opacity: 0.5,
        }}
      />

      <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
        {config.title}
      </Typography>

      <Typography variant="body1" color="textSecondary" sx={{ mb: 3, maxWidth: 400 }}>
        {config.description}
      </Typography>

      {config.action && onAction && (
        <Button variant="contained" onClick={onAction}>
          {config.action}
        </Button>
      )}
    </Box>
  );
}
