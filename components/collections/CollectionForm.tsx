'use client';

import { useState, useEffect, useRef } from 'react';
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
import { createCollectionSchema } from '@/lib/validation';
import axios from 'axios';
import { toast } from 'sonner';
import type { CreateCollectionInput } from '@/lib/validation';

interface CollectionFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode?: 'create' | 'edit';
  initialValues?: { id: string; name: string };
}

export function CollectionForm({
  open,
  onClose,
  onSuccess,
  mode = 'create',
  initialValues,
}: CollectionFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateCollectionInput>({
    resolver: zodResolver(createCollectionSchema),
    defaultValues: {
      name: '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: initialValues?.name || '',
      });
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open, initialValues, reset]);

  const handleClose = () => {
    reset();
    setError(null);
    onClose();
  };

  const onSubmit = async (data: CreateCollectionInput) => {
    try {
      setLoading(true);
      setError(null);

      if (mode === 'create') {
        await axios.post('/api/collections', data);
        toast.success('Collection created successfully');
        window.dispatchEvent(new Event('collectionsUpdated'));
      } else {
        await axios.patch(`/api/collections/${initialValues?.id}`, data);
        toast.success('Collection updated successfully');
        window.dispatchEvent(new Event('collectionsUpdated'));
      }

      reset();
      onSuccess();
      handleClose();
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        'Failed to save collection';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {mode === 'create' ? 'New Collection' : 'Rename Collection'}
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent sx={{ pt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            inputRef={inputRef}
            fullWidth
            label="Collection Name"
            placeholder="e.g., Learning, Projects, Ideas"
            {...register('name')}
            error={!!errors.name}
            helperText={errors.name?.message}
            disabled={loading}
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
