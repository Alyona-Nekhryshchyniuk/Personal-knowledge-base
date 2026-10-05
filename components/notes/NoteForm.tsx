'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
  MenuItem,
  Box,
  Typography,
  Autocomplete,
  Chip,
} from '@mui/material';
import { z } from 'zod';
import axios from 'axios';
import { toast } from 'sonner';
import useSWR from 'swr';

const NoteFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  content: z.string().min(1, 'Content is required'),
  collectionId: z.string().min(1, 'Collection is required'),
  sourceUrl: z.string().url().optional().or(z.literal('')),
  reviewInterval: z.enum(['none', 'daily', 'weekly', 'monthly', 'custom']),
  customDays: z.number().int().positive().optional(),
  tagIds: z.array(z.string()).optional(),
});

type NoteFormValues = z.infer<typeof NoteFormSchema>;

interface Collection {
  id: string;
  name: string;
}

interface Tag {
  id: string;
  name: string;
}

interface NoteFormProps {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initialData?: NoteFormValues & { id?: string };
  onSuccess?: () => void;
  defaultCollectionId?: string;
}

const fetcher = (url: string) => axios.get(url).then((r) => r.data);

export function NoteForm({ open, onClose, mode, initialData, onSuccess, defaultCollectionId }: NoteFormProps) {
  const [loading, setLoading] = useState(false);
  const { data: { collections = [] } = {} } = useSWR('/api/collections', fetcher);
  const { data: { tags = [] } = {} } = useSWR('/api/tags', fetcher);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    reset,
    watch,
  } = useForm<NoteFormValues>({
    resolver: zodResolver(NoteFormSchema),
    mode: 'onChange',
    defaultValues: {
      title: '',
      content: '',
      collectionId: defaultCollectionId || '',
      sourceUrl: '',
      reviewInterval: 'none',
      customDays: undefined,
      tagIds: [],
    },
  });

  const reviewInterval = watch('reviewInterval');
  const collectionId = watch('collectionId');
  const title = watch('title');
  const content = watch('content');

  const isCollectionPreset = !!defaultCollectionId;
  const isFormValid = isValid && isDirty;
  const isSubmitDisabled = loading || !isFormValid;

  useEffect(() => {
    if (open) {
      reset({
        title: initialData?.title || '',
        content: initialData?.content || '',
        collectionId: initialData?.collectionId || defaultCollectionId || '',
        sourceUrl: initialData?.sourceUrl || '',
        reviewInterval: (initialData?.reviewInterval || 'none') as any,
        customDays: initialData?.customDays,
        tagIds: initialData?.tagIds || [],
      });
    }
  }, [open, initialData, defaultCollectionId, reset]);

  const onSubmit = async (data: NoteFormValues) => {
    setLoading(true);
    try {
      const url = mode === 'create' ? '/api/notes' : `/api/notes/${initialData?.id}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';

      const response = await axios({
        method,
        url,
        data,
      });

      toast.success(mode === 'create' ? 'Note created' : 'Note updated');

      // Call onSuccess before closing to ensure data refresh completes
      await onSuccess?.();

      reset();
      onClose();
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error || error.message
        : 'Failed to save note';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {mode === 'create' ? 'Create Note' : 'Edit Note'}
        {isCollectionPreset && (
          <Typography variant="caption" display="block" sx={{ color: 'textSecondary', mt: 0.5 }}>
            Collection auto-selected from context
          </Typography>
        )}
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Controller
            name="title"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Title *"
                fullWidth
                placeholder="e.g., React Hooks Best Practices"
                error={!!errors.title}
                helperText={errors.title?.message || ''}
                disabled={loading}
                autoFocus
                inputProps={{ maxLength: 500 }}
              />
            )}
          />

          <Controller
            name="content"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Content *"
                fullWidth
                multiline
                rows={4}
                placeholder="Add your notes, insights, or links here..."
                error={!!errors.content}
                helperText={errors.content?.message || ''}
                disabled={loading}
              />
            )}
          />

          {!isCollectionPreset && (
            <Controller
              name="collectionId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Collection *"
                  fullWidth
                  error={!!errors.collectionId}
                  helperText={errors.collectionId?.message || ''}
                  disabled={loading}
                >
                  <MenuItem value="">Select a collection...</MenuItem>
                  {collections.map((col: Collection) => (
                    <MenuItem key={col.id} value={col.id}>
                      {col.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          )}

          <Controller
            name="sourceUrl"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Source URL (optional)"
                fullWidth
                type="url"
                placeholder="https://example.com"
                error={!!errors.sourceUrl}
                helperText={errors.sourceUrl?.message || ''}
                disabled={loading}
              />
            )}
          />

          <Controller
            name="tagIds"
            control={control}
            render={({ field: { value, onChange } }) => (
              <Autocomplete
                multiple
                options={tags}
                getOptionLabel={(tag: Tag) => tag.name}
                value={tags.filter((tag: Tag) => value?.includes(tag.id)) || []}
                onChange={(event, newValue) => {
                  onChange(newValue.map((tag: Tag) => tag.id));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Tags (optional)"
                    placeholder="Search or select tags..."
                  />
                )}
                disabled={loading}
              />
            )}
          />

          <Controller
            name="reviewInterval"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Review Reminder"
                fullWidth
                error={!!errors.reviewInterval}
                helperText={errors.reviewInterval?.message || ''}
                disabled={loading}
              >
                <MenuItem value="none">No reminder</MenuItem>
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="custom">Custom days</MenuItem>
              </TextField>
            )}
          />

          {reviewInterval === 'custom' && (
            <Controller
              name="customDays"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Review interval (days) *"
                  type="number"
                  inputProps={{ min: 1, max: 365 }}
                  fullWidth
                  error={!!errors.customDays}
                  helperText={errors.customDays?.message || 'Enter number between 1-365'}
                  disabled={loading}
                />
              )}
            />
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          variant="contained"
          disabled={isSubmitDisabled}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Saving...' : mode === 'create' ? 'Create Note' : 'Update Note'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
