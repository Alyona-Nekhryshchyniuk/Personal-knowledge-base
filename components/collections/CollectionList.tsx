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

interface Collection {
  id: string;
  name: string;
  noteCount: number;
}

interface CollectionListProps {
  collections: Collection[];
  loading?: boolean;
  onEdit?: (collection: Collection) => void;
  onDelete?: (collection: Collection) => void;
}

export function CollectionList({
  collections,
  loading,
  onEdit,
  onDelete,
}: CollectionListProps) {
  if (loading) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="textSecondary">Loading...</Typography>
      </Box>
    );
  }

  if (collections.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="textSecondary">
          No collections yet. Create one to get started.
        </Typography>
      </Box>
    );
  }

  return (
    <List sx={{ width: '100%' }}>
      {collections.map((collection) => (
        <ListItem
          key={collection.id}
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
                onClick={() => onEdit?.(collection)}
                title="Edit"
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => onDelete?.(collection)}
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
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {collection.name}
                </Typography>
                <Chip
                  label={`${collection.noteCount} ${
                    collection.noteCount === 1 ? 'note' : 'notes'
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
