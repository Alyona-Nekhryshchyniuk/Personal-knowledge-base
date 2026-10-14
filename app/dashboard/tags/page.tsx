'use client';

import { useEffect, useState } from 'react';
import { Box, Button, Typography, Paper, CircularProgress } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import axios from 'axios';
import { TagForm } from '@/components/tags/TagForm';
import { TagList } from '@/components/tags/TagList';

interface Tag {
  id: string;
  name: string;
  noteCount: number;
}

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/tags');
      setTags(data.tags || []);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClick = () => {
    setSelectedTag(null);
    setEditMode(false);
    setFormOpen(true);
  };

  const handleEditClick = (tag: Tag) => {
    setSelectedTag(tag);
    setEditMode(true);
    setFormOpen(true);
  };

  const handleDeleteClick = (tag: Tag) => {
    setSelectedTag(tag);
    setDeleteOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setSelectedTag(null);
    setEditMode(false);
  };

  const handleFormSuccess = () => {
    fetchTags();
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTag?.id) return;

    try {
      setDeleteLoading(true);
      await axios.delete(`/api/tags/${selectedTag.id}`);
      setDeleteOpen(false);
      setSelectedTag(null);
      fetchTags();
    } catch (error) {
      console.error('Failed to delete tag:', error);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          Tags
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateClick}
          sx={{ textTransform: 'none', fontSize: '1rem' }}
        >
          New Tag
        </Button>
      </Box>

      <Paper sx={{ p: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TagList
            tags={tags}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
          />
        )}
      </Paper>

      <TagForm
        open={formOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        mode={editMode ? 'edit' : 'create'}
        initialValues={
          editMode && selectedTag
            ? { id: selectedTag.id, name: selectedTag.name }
            : undefined
        }
      />

      {/* Delete Confirmation Dialog */}
      {deleteOpen && selectedTag && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1300,
          }}
          onClick={() => setDeleteOpen(false)}
        >
          <Paper
            sx={{
              p: 3,
              maxWidth: '400px',
              backgroundColor: 'white',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
              Delete Tag "{selectedTag.name}"?
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              This tag will be removed from {selectedTag.noteCount}{' '}
              note{selectedTag.noteCount !== 1 ? 's' : ''}. The notes themselves will not be deleted.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button
                onClick={() => setDeleteOpen(false)}
                disabled={deleteLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteConfirm}
                variant="contained"
                color="error"
                disabled={deleteLoading}
                startIcon={deleteLoading && <CircularProgress size={20} />}
              >
                Delete
              </Button>
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
  );
}
