'use client';

import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  IconButton,
  Chip,
  Stack,
} from '@mui/material';
import { Edit, Delete, Archive, Unarchive } from '@mui/icons-material';
import { ReviewBadge } from './ReviewBadge';

interface Tag {
  id: string;
  name: string;
}

interface Collection {
  id: string;
  name: string;
}

interface NoteCardProps {
  id: string;
  title: string;
  content: string;
  collection: Collection;
  tags: Tag[];
  status: string;
  nextReviewDate?: Date | null;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onArchive?: (id: string) => void;
  onRestore?: (id: string) => void;
}

export function NoteCard({
  id,
  title,
  content,
  collection,
  tags,
  status,
  nextReviewDate,
  onEdit,
  onDelete,
  onArchive,
  onRestore,
}: NoteCardProps) {
  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: 4,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent sx={{ flex: 1 }}>
        <Typography variant="h6" component="h3" gutterBottom noWrap sx={{ mb: 1 }}>
          {title}
        </Typography>

        <Typography
          variant="body2"
          color="textSecondary"
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            mb: 2,
            minHeight: '2.8em',
          }}
        >
          {content}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
          <Chip
            label={collection.name}
            size="small"
            variant="outlined"
            color="primary"
          />
          <ReviewBadge nextReviewDate={nextReviewDate} status={status} size="small" />
        </Box>

        {tags.length > 0 && (
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
            {tags.slice(0, 3).map((tag) => (
              <Chip key={tag.id} label={tag.name} size="small" variant="filled" />
            ))}
            {tags.length > 3 && (
              <Chip label={`+${tags.length - 3}`} size="small" variant="outlined" />
            )}
          </Stack>
        )}
      </CardContent>

      <CardActions sx={{ justifyContent: 'flex-end' }}>
        {onEdit && (
          <IconButton
            size="small"
            onClick={() => onEdit(id)}
            title="Edit note"
            color="primary"
          >
            <Edit fontSize="small" />
          </IconButton>
        )}

        {status === 'Active' && onArchive && (
          <IconButton
            size="small"
            onClick={() => onArchive(id)}
            title="Archive note"
            color="warning"
          >
            <Archive fontSize="small" />
          </IconButton>
        )}

        {status === 'Archived' && onRestore && (
          <IconButton
            size="small"
            onClick={() => onRestore(id)}
            title="Restore note"
            color="success"
          >
            <Unarchive fontSize="small" />
          </IconButton>
        )}

        {onDelete && (
          <IconButton
            size="small"
            onClick={() => onDelete(id)}
            title="Delete note"
            color="error"
          >
            <Delete fontSize="small" />
          </IconButton>
        )}
      </CardActions>
    </Card>
  );
}
