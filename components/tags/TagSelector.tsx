'use client';

import { useState, useEffect } from 'react';
import {
  Autocomplete,
  TextField,
  CircularProgress,
  Box,
  Chip,
} from '@mui/material';
import axios from 'axios';

interface Tag {
  id: string;
  name: string;
}

interface TagSelectorProps {
  selected?: string[];
  onChange?: (tagIds: string[]) => void;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
}

export function TagSelector({
  selected = [],
  onChange,
  disabled = false,
  label = 'Tags',
  placeholder = 'Select or create tags',
}: TagSelectorProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);

  useEffect(() => {
    fetchTags();
  }, []);

  useEffect(() => {
    // Update selected tags when selected IDs change
    if (tags.length > 0) {
      const newSelected = tags.filter((tag) => selected.includes(tag.id));
      setSelectedTags(newSelected);
    }
  }, [selected, tags]);

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

  const handleChange = (_event: any, newValue: Tag[]) => {
    setSelectedTags(newValue);
    onChange?.(newValue.map((tag) => tag.id));
  };

  return (
    <Autocomplete
      multiple
      options={tags}
      getOptionLabel={(tag) => tag.name}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      value={selectedTags}
      onChange={handleChange}
      disabled={disabled || loading}
      loading={loading}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderTags={(value, getTagProps) =>
        value.map((tag, index) => (
          <Chip
            key={tag.id}
            label={tag.name}
            {...getTagProps({ index })}
            size="small"
          />
        ))
      }
    />
  );
}
