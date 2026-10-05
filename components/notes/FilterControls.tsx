'use client';

import {
  Box,
  TextField,
  MenuItem,
  Button,
  Stack,
  Chip,
  Paper,
  Typography,
  Autocomplete,
} from '@mui/material';
import { FilterAlt, Clear } from '@mui/icons-material';
import { useState } from 'react';

interface Collection {
  id: string;
  name: string;
}

interface Tag {
  id: string;
  name: string;
}

interface FilterControlsProps {
  collections: Collection[];
  tags: Tag[];
  search?: string;
  collection?: string;
  selectedTags?: string[];
  status?: 'Active' | 'Archived' | '';
  reviewState?: 'due' | 'overdue' | 'next7days' | 'none' | '';
  onSearchChange?: (search: string) => void;
  onCollectionChange?: (collection: string) => void;
  onTagsChange?: (tags: string[]) => void;
  onStatusChange?: (status: 'Active' | 'Archived' | '') => void;
  onReviewStateChange?: (state: 'due' | 'overdue' | 'next7days' | 'none' | '') => void;
  onClearFilters?: () => void;
  loading?: boolean;
}

export function FilterControls({
  collections,
  tags,
  search = '',
  collection = '',
  selectedTags = [],
  status = '',
  reviewState = '',
  onSearchChange,
  onCollectionChange,
  onTagsChange,
  onStatusChange,
  onReviewStateChange,
  onClearFilters,
  loading = false,
}: FilterControlsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const activeFiltersCount = [
    search ? 1 : 0,
    collection ? 1 : 0,
    selectedTags.length > 0 ? 1 : 0,
    status ? 1 : 0,
    reviewState ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const hasActiveFilters = activeFiltersCount > 0;

  return (
    <Box sx={{ width: '100%' }}>
      {/* Main Search Bar */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, backgroundColor: '#f5f5f5' }}>
        <TextField
          placeholder="Search notes by title, content, or URL..."
          value={search}
          onChange={(e) => onSearchChange?.(e.target.value)}
          fullWidth
          size="small"
          disabled={loading}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'white',
            },
          }}
        />
      </Paper>

      {/* Filter Toggle and Quick Filters */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <Button
          variant={showAdvanced ? 'contained' : 'outlined'}
          startIcon={<FilterAlt />}
          onClick={() => setShowAdvanced(!showAdvanced)}
          size="small"
          disabled={loading}
        >
          {showAdvanced ? 'Hide Filters' : 'Show Filters'}
          {hasActiveFilters && (
            <Chip
              label={activeFiltersCount}
              size="small"
              sx={{ ml: 1 }}
              color="primary"
            />
          )}
        </Button>

        {hasActiveFilters && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<Clear />}
            onClick={onClearFilters}
            size="small"
            disabled={loading}
          >
            Clear All
          </Button>
        )}

        <Box sx={{ flex: 1 }} />

        {/* Quick Status Filter */}
        <TextField
          select
          label={status ? `Status: ${status}` : 'Status: All'}
          value={status}
          onChange={(e) => onStatusChange?.(e.target.value as 'Active' | 'Archived' | '')}
          size="small"
          sx={{ minWidth: 140 }}
          disabled={loading}
        >
          <MenuItem value="">All Notes</MenuItem>
          <MenuItem value="Active">Active Only</MenuItem>
          <MenuItem value="Archived">Archived Only</MenuItem>
        </TextField>
      </Stack>

      {/* Advanced Filters */}
      {showAdvanced && (
        <Paper elevation={0} sx={{ p: 2, mb: 3, backgroundColor: '#fafafa', border: '1px solid #eee' }}>
          <Stack spacing={2}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Advanced Filters
            </Typography>

            {/* Collection Filter */}
            <TextField
              select
              label="Collection"
              value={collection}
              onChange={(e) => onCollectionChange?.(e.target.value)}
              fullWidth
              size="small"
              disabled={loading}
            >
              <MenuItem value="">All Collections</MenuItem>
              {collections.map((col) => (
                <MenuItem key={col.id} value={col.id}>
                  {col.name}
                </MenuItem>
              ))}
            </TextField>

            {/* Tag Filter */}
            <Autocomplete
              multiple
              options={tags}
              getOptionLabel={(tag: Tag) => tag.name}
              value={tags.filter((tag) => selectedTags.includes(tag.id))}
              onChange={(event, newValue) => {
                onTagsChange?.(newValue.map((tag) => tag.id));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Filter by Tags (AND logic)"
                  placeholder="Select tags..."
                  size="small"
                />
              )}
              disabled={loading}
            />

            {/* Review State Filter */}
            <TextField
              select
              label="Review State"
              value={reviewState}
              onChange={(e) =>
                onReviewStateChange?.(e.target.value as 'due' | 'overdue' | 'next7days' | 'none' | '')
              }
              fullWidth
              size="small"
              disabled={loading}
            >
              <MenuItem value="">All Review States</MenuItem>
              <MenuItem value="overdue">🔴 Overdue</MenuItem>
              <MenuItem value="due">🟠 Due Today</MenuItem>
              <MenuItem value="next7days">🟡 Due in 7 Days</MenuItem>
              <MenuItem value="none">⚪ No Review</MenuItem>
            </TextField>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <Box>
                <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
                  Active Filters:
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                  {search && (
                    <Chip
                      label={`Search: "${search}"`}
                      onDelete={() => onSearchChange?.('')}
                      size="small"
                      variant="outlined"
                    />
                  )}
                  {collection && (
                    <Chip
                      label={`Collection: ${collections.find((c) => c.id === collection)?.name}`}
                      onDelete={() => onCollectionChange?.('')}
                      size="small"
                      variant="outlined"
                    />
                  )}
                  {selectedTags.length > 0 && (
                    <Chip
                      label={`Tags: ${selectedTags.length}`}
                      onDelete={() => onTagsChange?.([])}
                      size="small"
                      variant="outlined"
                    />
                  )}
                  {status && (
                    <Chip
                      label={`Status: ${status}`}
                      onDelete={() => onStatusChange?.('')}
                      size="small"
                      variant="outlined"
                    />
                  )}
                  {reviewState && (
                    <Chip
                      label={`Review: ${reviewState}`}
                      onDelete={() => onReviewStateChange?.('')}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Stack>
              </Box>
            )}
          </Stack>
        </Paper>
      )}
    </Box>
  );
}
