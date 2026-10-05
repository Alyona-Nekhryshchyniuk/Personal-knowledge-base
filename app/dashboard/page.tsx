'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Box, Button, Paper, Stack, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Fab } from '@mui/material';
import { Add, Refresh } from '@mui/icons-material';
import axios from 'axios';
import { toast } from 'sonner';
import useSWR from 'swr';
import { NoteList } from '@/components/notes/NoteList';
import { NoteForm } from '@/components/notes/NoteForm';
import { EmptyState } from '@/components/notes/EmptyStates';
import { useNotifications } from '@/components/NotificationProvider';

interface Collection {
  id: string;
  name: string;
  noteCount?: number;
}

interface Note {
  id: string;
  title: string;
  content: string;
  collection: Collection;
  tags: any[];
  status: string;
  nextReviewDate?: Date;
  sourceUrl?: string;
  reviewInterval?: string;
  customDays?: number;
}

const fetcher = (url: string) => axios.get(url).then((r) => r.data);

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const collectionFromUrl = searchParams.get('collection');

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const noteListRef = useRef<any>(null);

  const notificationCtx = useNotifications();


  const { data: collectionsData, isLoading: collectionsLoading } = useSWR(
    '/api/collections',
    fetcher
  );
  const { data: tagsData } = useSWR('/api/tags', fetcher);
  const { data: notesData, mutate: mutateNotes } = useSWR('/api/notes', fetcher);

  const collections = collectionsData?.collections || [];
  const tags = tagsData?.tags || [];
  const notes = notesData?.notes || [];

  const handleCreateNote = () => {
    setFormMode('create');
    setSelectedNote(null);
    setFormOpen(true);
  };

  const handleEditNote = async (noteId: string) => {
    try {
      const response = await axios.get(`/api/notes/${noteId}`);
      setSelectedNote(response.data);
      setFormMode('edit');
      setFormOpen(true);
    } catch (error) {
      toast.error('Failed to load note');
    }
  };

  const handleDeleteNote = (noteId: string) => {
    setNoteToDelete(noteId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteNote = async () => {
    if (!noteToDelete) return;

    setDeletingId(noteToDelete);
    try {
      await axios.delete(`/api/notes/${noteToDelete}`);
      toast.success('Note deleted');
      mutateNotes();
      noteListRef.current?.mutate();
      setDeleteDialogOpen(false);
      setNoteToDelete(null);
    } catch (error) {
      toast.error('Failed to delete note');
    } finally {
      setDeletingId(null);
    }
  };

  const handleArchiveNote = async (noteId: string) => {
    try {
      await axios.post(`/api/notes/${noteId}/archive`);
      toast.success('Note archived', {
        description: 'Use the Status filter to view archived notes',
        action: {
          label: 'View Archived',
          onClick: () => {
            // This would require passing filter state to NoteList, so we'll just show the message
          },
        },
      });
      await mutateNotes();
      noteListRef.current?.mutate();
    } catch (error) {
      toast.error('Failed to archive note');
    }
  };

  const handleRestoreNote = async (noteId: string) => {
    try {
      await axios.post(`/api/notes/${noteId}/restore`);
      toast.success('Note restored');
      await mutateNotes();
      noteListRef.current?.mutate();
    } catch (error) {
      toast.error('Failed to restore note');
    }
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setSelectedNote(null);
  };

  const handleFormSuccess = async () => {
    await mutateNotes();
    noteListRef.current?.mutate();
  };

  const handleRefresh = async () => {
    await mutateNotes();
    noteListRef.current?.mutate();
  };

  if (collectionsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (collections.length === 0) {
    return (
      <Box sx={{ py: 4 }}>
        <EmptyState type="no-collections" />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, backgroundColor: '#f9f9f9' }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={2}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>
              My Notes
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {notes.length} {notes.length === 1 ? 'note' : 'notes'} across{' '}
              {collections.length} {collections.length === 1 ? 'collection' : 'collections'}
            </Typography>
          </Box>

          <Stack direction="row" spacing={2} sx={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleRefresh}
              size="small"
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Add />}
              onClick={handleCreateNote}
              sx={{ fontWeight: 600 }}
            >
              New Note
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Notes List */}
      {notes.length === 0 ? (
        <EmptyState type="no-notes" onAction={handleCreateNote} />
      ) : (
        <NoteList
          ref={noteListRef}
          collections={collections}
          tags={tags}
          initialCollection={collectionFromUrl || undefined}
          onEdit={handleEditNote}
          onDelete={handleDeleteNote}
          onArchive={handleArchiveNote}
          onRestore={handleRestoreNote}
          onRefresh={handleRefresh}
        />
      )}

      {/* Note Form Dialog */}
      <NoteForm
        open={formOpen}
        onClose={handleFormClose}
        mode={formMode}
        defaultCollectionId={collectionFromUrl || undefined}
        initialData={
          selectedNote && formMode === 'edit'
            ? {
                id: selectedNote.id,
                title: selectedNote.title,
                content: selectedNote.content,
                collectionId: selectedNote.collection.id,
                sourceUrl: selectedNote.sourceUrl || '',
                reviewInterval: (selectedNote.reviewInterval || 'none') as any,
                customDays: selectedNote.customDays,
                tagIds: selectedNote.tags.map((t: any) => t.id),
              }
            : undefined
        }
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Note?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this note? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deletingId !== null}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDeleteNote}
            variant="contained"
            color="error"
            disabled={deletingId !== null}
          >
            {deletingId ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button */}
      {collections.length > 0 && (
        <Fab
          color="primary"
          aria-label="add"
          onClick={handleCreateNote}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
          }}
        >
          <Add />
        </Fab>
      )}
    </Box>
  );
}
