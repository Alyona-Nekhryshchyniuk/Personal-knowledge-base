'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import axios from 'axios';
import { toast } from 'sonner';

interface DeleteCollectionModalProps {
  open: boolean;
  collection?: { id: string; name: string; noteCount?: number };
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteCollectionModal({
  open,
  collection,
  onClose,
  onSuccess,
}: DeleteCollectionModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!collection?.id) return;

    try {
      setLoading(true);
      setError(null);

      await axios.delete(`/api/collections/${collection.id}`);
      toast.success('Collection deleted successfully');
      onSuccess();
      onClose();
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        'Failed to delete collection';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!collection) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Delete Collection</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 2,
            mb: 2,
          }}
        >
          <WarningIcon
            sx={{ color: '#d32f2f', mt: 0.5, flexShrink: 0 }}
          />
          <Box>
            <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
              Delete "{collection.name}"?
            </Typography>
            <Typography variant="body2" color="textSecondary">
              This will permanently delete the collection and all{' '}
              <strong>{collection.noteCount || 0} notes</strong> it contains.
              This action cannot be undone.
            </Typography>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleDelete}
          variant="contained"
          color="error"
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} />}
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}
