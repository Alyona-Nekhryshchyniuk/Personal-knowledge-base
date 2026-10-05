'use client';

import { Chip, ChipProps } from '@mui/material';
import { isDueToday, isOverdue, isInNext7Days, getTodayUTC } from '@/lib/dates';
import { addDays } from 'date-fns';

interface ReviewBadgeProps {
  nextReviewDate?: Date | null;
  status?: string;
  size?: 'small' | 'medium';
}

function getDaysUntilReview(nextReviewDate: Date): number {
  const today = getTodayUTC();
  const reviewDate = new Date(nextReviewDate);
  const diffTime = reviewDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function ReviewBadge({ nextReviewDate, status = 'Active', size = 'small' }: ReviewBadgeProps) {
  if (status === 'Archived') {
    return (
      <Chip
        label="Archived"
        size={size}
        variant="outlined"
        sx={{
          backgroundColor: '#f5f5f5',
          color: '#666',
          borderColor: '#ccc',
        }}
      />
    );
  }

  if (!nextReviewDate) {
    return (
      <Chip
        label="No review"
        size={size}
        variant="outlined"
        sx={{
          backgroundColor: '#e8f5e9',
          color: '#2e7d32',
          borderColor: '#a5d6a7',
        }}
      />
    );
  }

  const nextReview = new Date(nextReviewDate);
  const dateString = new Date(nextReviewDate);

  if (isOverdue(dateString, status)) {
    return (
      <Chip
        label={`Overdue (${dateString.toLocaleDateString()})`}
        size={size}
        color="error"
        variant="filled"
      />
    );
  }

  if (isDueToday(dateString, status)) {
    return (
      <Chip
        label="Due today"
        size={size}
        color="warning"
        variant="filled"
      />
    );
  }

  if (isInNext7Days(dateString, status)) {
    const daysUntil = getDaysUntilReview(dateString);
    const label = daysUntil === 1 ? 'Due tomorrow' : `Due in ${daysUntil} days`;
    return (
      <Chip
        label={label}
        size={size}
        sx={{
          backgroundColor: '#fff3cd',
          color: '#856404',
          borderColor: '#ffeaa7',
        }}
        variant="outlined"
      />
    );
  }

  return (
    <Chip
      label={`Next: ${dateString.toLocaleDateString()}`}
      size={size}
      variant="outlined"
      sx={{
        backgroundColor: '#e3f2fd',
        color: '#1565c0',
        borderColor: '#90caf9',
      }}
    />
  );
}
