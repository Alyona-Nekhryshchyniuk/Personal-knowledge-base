'use client';

import {
  List,
  ListItem,
  ListItemText,
  IconButton,
  Box,
  Typography,
  Chip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LabelIcon from '@mui/icons-material/Label';

interface Tag {
  id: string;
  name: string;
  noteCount: number;
}

interface TagListProps {
  tags: Tag[];
  loading?: boolean;
  onEdit?: (tag: Tag) => void;
  onDelete?: (tag: Tag) => void;
}

export function TagList({
  tags,
  loading,
  onEdit,
  onDelete,
}: TagListProps) {
  if (loading) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="textSecondary">Loading...</Typography>
      </Box>
    );
  }

  if (tags.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="textSecondary">
          No tags yet. Create one to label your notes.
        </Typography>
      </Box>
    );
  }

  return (
    <List sx={{ width: '100%' }}>
      {tags.map((tag) => (
        <ListItem
          key={tag.id}
          sx={{
            mb: 1,
            borderRadius: 1,
            border: '1px solid #e0e0e0',
            '&:hover': {
              backgroundColor: '#fafafa',
            },
          }}
          secondaryAction={
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <IconButton
                size="small"
                onClick={() => onEdit?.(tag)}
                title="Edit"
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => onDelete?.(tag)}
                title="Delete"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          }
        >
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LabelIcon sx={{ fontSize: '1.2rem', color: '#1976d2' }} />
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {tag.name}
                </Typography>
                <Chip
                  label={`${tag.noteCount} ${
                    tag.noteCount === 1 ? 'note' : 'notes'
                  }`}
                  size="small"
                  variant="outlined"
                />
              </Box>
            }
          />
        </ListItem>
      ))}
    </List>
  );
}
