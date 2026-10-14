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
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Autocomplete,
  TextField,
} from '@mui/material';
import { Edit, Delete, Archive, Unarchive, LocalOffer, MoreVert, Add as AddIcon } from '@mui/icons-material';
import { ReviewBadge } from './ReviewBadge';
import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

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
  reviewInterval?: string;
  customDays?: number;
  nextReviewDate?: Date | null;
  lastReviewedDate?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  collections?: Collection[];
  allTags?: Tag[];
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onArchive?: (id: string) => void;
  onRestore?: (id: string) => void;
  onMove?: (noteId: string, collectionId: string) => void | Promise<void>;
  onTagsUpdate?: () => void | Promise<void>;
}

export function NoteCard({
  id,
  title,
  content,
  collection,
  tags,
  status,
  reviewInterval,
  customDays,
  nextReviewDate,
  lastReviewedDate,
  createdAt,
  updatedAt,
  collections = [],
  allTags = [],
  onEdit,
  onDelete,
  onArchive,
  onRestore,
  onMove,
  onTagsUpdate,
}: NoteCardProps) {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [isMoving, setIsMoving] = useState(false);
  const [tagsDialogOpen, setTagsDialogOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Tag[]>(tags);
  const [isUpdatingTags, setIsUpdatingTags] = useState(false);

  const formatDate = (date?: Date | string | null) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const hasTagsChanged = () => {
    if (selectedTags.length !== tags.length) return true;
    const selectedIds = selectedTags.map((t) => t.id).sort();
    const originalIds = tags.map((t) => t.id).sort();
    return JSON.stringify(selectedIds) !== JSON.stringify(originalIds);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleMoveClick = () => {
    setMoveDialogOpen(true);
    handleMenuClose();
  };

  const handleMoveDialogClose = () => {
    setMoveDialogOpen(false);
    setSelectedCollection('');
  };

  const handleMoveConfirm = async () => {
    if (!selectedCollection) {
      toast.error('Please select a collection');
      return;
    }

    if (selectedCollection === collection.id) {
      toast.error('Note is already in this collection');
      return;
    }

    setIsMoving(true);
    try {
      await axios.patch(`/api/notes/${id}/move`, { collectionId: selectedCollection });
      toast.success('Note moved successfully');
      await onMove?.(id, selectedCollection);
      handleMoveDialogClose();
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error || error.message
        : 'Failed to move note';
      toast.error(message);
    } finally {
      setIsMoving(false);
    }
  };

  const handleTagsDialogOpen = () => {
    setSelectedTags(tags);
    setTagsDialogOpen(true);
    handleMenuClose();
  };

  const handleTagsDialogClose = () => {
    setTagsDialogOpen(false);
    setSelectedTags(tags);
  };

  const handleTagsConfirm = async () => {
    setIsUpdatingTags(true);
    try {
      const tagIds = selectedTags.map((tag) => tag.id);
      await axios.patch(`/api/notes/${id}`, { tagIds });
      toast.success('Tags updated successfully');
      await onTagsUpdate?.();
      handleTagsDialogClose();
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error || error.message
        : 'Failed to update tags';
      toast.error(message);
    } finally {
      setIsUpdatingTags(false);
    }
  };

  const handleDeleteTag = async (tagIdToDelete: string) => {
    try {
      const newTags = tags.filter((tag) => tag.id !== tagIdToDelete);
      const tagIds = newTags.map((tag) => tag.id);
      await axios.patch(`/api/notes/${id}`, { tagIds });
      await onTagsUpdate?.();
      toast.success('Tag removed');
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error || error.message
        : 'Failed to remove tag';
      toast.error(message);
    }
  };
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
          <ReviewBadge nextReviewDate={nextReviewDate} status={status} size="small" />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
          {tags.length > 0 && (
            <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
              {tags.slice(0, 3).map((tag) => (
                <Chip
                  key={tag.id}
                  label={tag.name}
                  size="small"
                  variant="outlined"
                  icon={<LocalOffer sx={{ fontSize: '0.9rem !important' }} />}
                  onDelete={() => handleDeleteTag(tag.id)}
                  sx={{
                    backgroundColor: 'rgba(156, 39, 176, 0.08)',
                    borderColor: '#9c27b0',
                    color: '#7b1fa2',
                    maxWidth: '120px',
                    '& .MuiChip-label': {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    },
                    '& .MuiChip-icon': {
                      color: '#9c27b0',
                    },
                    '& .MuiChip-deleteIcon': {
                      color: '#9c27b0 !important',
                    },
                  }}
                />
              ))}
              {tags.length > 3 && (
                <Chip
                  label={`+${tags.length - 3}`}
                  size="small"
                  variant="outlined"
                  sx={{
                    borderColor: '#9c27b0',
                    color: '#7b1fa2',
                  }}
                />
              )}
            </Stack>
          )}
          {allTags.length > 0 && tags.length === 0 && (
            <Box
              onClick={handleTagsDialogOpen}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1.5,
                py: 0.5,
                borderRadius: '16px',
                backgroundColor: 'rgba(156, 39, 176, 0.08)',
                border: '1px solid #9c27b0',
                color: '#7b1fa2',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 500,
                transition: 'all 0.2s ease',
                ml: 'auto',
                '&:hover': {
                  backgroundColor: 'rgba(156, 39, 176, 0.12)',
                },
              }}
              title="Add tags"
            >
              <AddIcon sx={{ fontSize: '1rem' }} />
              <LocalOffer sx={{ fontSize: '1rem' }} />
            </Box>
          )}
          {allTags.length > 0 && tags.length > 0 && (
            <IconButton
              size="small"
              onClick={handleTagsDialogOpen}
              title="Add tags"
              sx={{ ml: 'auto', mt: -0.5 }}
            >
              <AddIcon sx={{ fontSize: '1.2rem', color: '#9c27b0' }} />
            </IconButton>
          )}
        </Box>

        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid #eee' }}>
          <Stack spacing={0.75} sx={{ fontSize: '0.75rem', color: 'textSecondary' }}>
            {reviewInterval && (
              <Typography variant="caption" display="block">
                <strong>Review:</strong> {reviewInterval}
                {reviewInterval === 'custom' && customDays && ` (${customDays} days)`}
              </Typography>
            )}
            {nextReviewDate && (
              <Typography variant="caption" display="block">
                <strong>Next review:</strong> {formatDate(nextReviewDate)}
              </Typography>
            )}
            {lastReviewedDate && (
              <Typography variant="caption" display="block">
                <strong>Last reviewed:</strong> {formatDate(lastReviewedDate)}
              </Typography>
            )}
            {createdAt && (
              <Typography variant="caption" display="block">
                <strong>Created:</strong> {formatDate(createdAt)}
              </Typography>
            )}
            {updatedAt && (
              <Typography variant="caption" display="block">
                <strong>Updated:</strong> {formatDate(updatedAt)}
              </Typography>
            )}
          </Stack>
        </Box>
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

        <IconButton
          size="small"
          onClick={handleMenuOpen}
          title="More options"
        >
          <MoreVert fontSize="small" />
        </IconButton>
      </CardActions>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {collections.length > 0 && (
          <MenuItem onClick={handleMoveClick}>
            Move to Collection
          </MenuItem>
        )}
      </Menu>

      <Dialog open={moveDialogOpen} onClose={handleMoveDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Move Note</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Select the collection to move this note to:
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              maxHeight: '300px',
              overflowY: 'auto',
            }}
          >
            {collections
              .filter((col) => col.id !== collection.id)
              .map((col) => (
                <Button
                  key={col.id}
                  variant={selectedCollection === col.id ? 'contained' : 'outlined'}
                  onClick={() => setSelectedCollection(col.id)}
                  fullWidth
                  sx={{ justifyContent: 'flex-start' }}
                >
                  {col.name}
                </Button>
              ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleMoveDialogClose} disabled={isMoving}>
            Cancel
          </Button>
          <Button
            onClick={handleMoveConfirm}
            variant="contained"
            disabled={isMoving || !selectedCollection}
            startIcon={isMoving && <CircularProgress size={20} />}
          >
            {isMoving ? 'Moving...' : 'Move'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={tagsDialogOpen} onClose={handleTagsDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Add Tags</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Autocomplete
            multiple
            options={allTags.filter((tag) => !selectedTags.some((st) => st.id === tag.id))}
            getOptionLabel={(tag: Tag) => tag.name}
            value={selectedTags}
            onChange={(event, newValue) => {
              setSelectedTags(newValue);
            }}
            noOptionsText="All available tags are already selected"
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select tags"
                placeholder="Add tags to this note..."
                sx={{ mt: 1.25 }}
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleTagsDialogClose} disabled={isUpdatingTags}>
            Cancel
          </Button>
          <Button
            onClick={handleTagsConfirm}
            variant="contained"
            disabled={isUpdatingTags || !hasTagsChanged()}
            startIcon={isUpdatingTags && <CircularProgress size={20} />}
          >
            {isUpdatingTags ? 'Saving...' : 'Save Tags'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
