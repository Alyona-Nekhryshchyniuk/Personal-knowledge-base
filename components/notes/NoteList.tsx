'use client';

import { Grid, Box, CircularProgress, Button, Stack } from '@mui/material';
import { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import axios from 'axios';
import { NoteCard } from './NoteCard';
import { FilterControls } from './FilterControls';

interface Collection {
  id: string;
  name: string;
}

interface Tag {
  id: string;
  name: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  collection: Collection;
  tags: Tag[];
  status: string;
  nextReviewDate?: Date;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onArchive?: (id: string) => void;
  onRestore?: (id: string) => void;
}

interface NoteListProps {
  collections: Collection[];
  tags?: Tag[];
  initialCollection?: string;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onArchive?: (id: string) => void;
  onRestore?: (id: string) => void;
  onRefresh?: () => void;
}

const fetcher = (url: string) => axios.get(url).then((r) => r.data);

export const NoteList = forwardRef(function NoteList(
  {
    collections,
    tags = [],
    initialCollection,
    onEdit,
    onDelete,
    onArchive,
    onRestore,
    onRefresh,
  }: NoteListProps,
  ref: any
) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedCollection, setSelectedCollection] = useState(initialCollection || '');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<'Active' | 'Archived' | ''>('');
  const [selectedReviewState, setSelectedReviewState] = useState<
    'due' | 'overdue' | 'next7days' | 'none' | ''
  >('');
  const [page, setPage] = useState(0);
  const pageSize = 6;

  useEffect(() => {
    if (initialCollection !== selectedCollection) {
      setSelectedCollection(initialCollection || '');
      setPage(0);
    }
  }, [initialCollection]);

  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (selectedCollection) params.append('collection', selectedCollection);
  if (selectedTags.length > 0) params.append('tags', selectedTags.join(','));
  if (selectedStatus) params.append('status', selectedStatus);
  if (selectedReviewState) params.append('reviewState', selectedReviewState);
  params.append('skip', String(page * pageSize));
  params.append('take', String(pageSize + 1));

  const { data, isLoading, mutate } = useSWR(`/api/notes?${params.toString()}`, fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  const allNotes = data?.notes || [];
  const hasNextPage = allNotes.length > pageSize;
  const notes = allNotes.slice(0, pageSize);

  useImperativeHandle(ref, () => ({
    mutate,
  }));

  const handleClearFilters = () => {
    setSearch('');
    setSelectedCollection('');
    setSelectedTags([]);
    setSelectedStatus('');
    setSelectedReviewState('');
    setPage(0);
  };

  const hasActiveFilters =
    search || selectedCollection || selectedTags.length > 0 || selectedStatus || selectedReviewState;

  return (
    <Box sx={{ width: '100%' }}>
      {/* Filter Controls */}
      <FilterControls
        collections={collections}
        tags={tags}
        search={search}
        collection={selectedCollection}
        selectedTags={selectedTags}
        status={selectedStatus}
        reviewState={selectedReviewState}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(0);
        }}
        onCollectionChange={(value) => {
          setSelectedCollection(value);
          setPage(0);
          if (value) {
            router.push(`/dashboard?collection=${value}`);
          } else {
            router.push('/dashboard');
          }
        }}
        onTagsChange={(value) => {
          setSelectedTags(value);
          setPage(0);
        }}
        onStatusChange={(value) => {
          setSelectedStatus(value);
          setPage(0);
        }}
        onReviewStateChange={(value) => {
          setSelectedReviewState(value);
          setPage(0);
        }}
        onClearFilters={handleClearFilters}
        loading={isLoading}
      />

      {/* Notes Grid */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : notes.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4, color: 'textSecondary' }}>
          No notes found. {hasActiveFilters ? 'Try adjusting your filters.' : 'Create one to get started.'}
        </Box>
      ) : (
        <>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {notes.map((note: Note) => (
              <Grid item xs={12} sm={6} md={4} key={note.id}>
                <NoteCard
                  {...note}
                  collections={collections}
                  allTags={tags}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onArchive={onArchive}
                  onRestore={onRestore}
                  onMove={() => mutate()}
                  onTagsUpdate={async () => {
                    await mutate();
                  }}
                  onReview={async () => {
                    mutate(undefined, { revalidate: true });
                  }}
                />
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          <Stack direction="row" spacing={2} sx={{ mt: 3, justifyContent: 'center' }}>
            <Button
              disabled={page === 0 || isLoading}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>

            <Box sx={{ display: 'flex', alignItems: 'center', px: 2 }}>
              Page {page + 1}
            </Box>

            <Button
              disabled={!hasNextPage || isLoading}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </Stack>
        </>
      )}
    </Box>
  );
});
