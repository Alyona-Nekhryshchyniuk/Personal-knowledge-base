'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTagSchema } from '@/lib/validation';
import axios from 'axios';
import { toast } from 'sonner';
import type { CreateTagInput } from '@/lib/validation';

interface TagFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode?: 'create' | 'edit';
  initialValues?: { id: string; name: string };
}

export function TagForm({
  open,
  onClose,
  onSuccess,
  mode = 'create',
  initialValues,
}: TagFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateTagInput>({
    resolver: zodResolver(createTagSchema),
    defaultValues: {
      name: initialValues?.name || '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: initialValues?.name || '',
      });
      setError(null);
    }
  }, [open, initialValues, reset]);

  const handleClose = () => {
    reset();
    setError(null);
    onClose();
  };

  const onSubmit = async (data: CreateTagInput) => {
    try {
      setLoading(true);
      setError(null);

      if (mode === 'create') {
        await axios.post('/api/tags', data);
        toast.success('Tag created successfully');
      } else {
        await axios.patch(`/api/tags/${initialValues?.id}`, data);
        toast.success('Tag updated successfully');
      }

      reset();
      onSuccess();
      handleClose();
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        'Failed to save tag';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {mode === 'create' ? 'New Tag' : 'Rename Tag'}
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent sx={{ pt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            fullWidth
            label="Tag Name"
            placeholder="e.g., important, review-soon, archived"
            {...register('name')}
            error={!!errors.name}
            helperText={errors.name?.message}
            disabled={loading}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading && <CircularProgress size={20} />}
          >
            {mode === 'create' ? 'Create' : 'Save'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
