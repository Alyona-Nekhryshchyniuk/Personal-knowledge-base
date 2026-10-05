'use client';

import { useEffect, useState } from 'react';
import { Box, Button, Typography, Paper, CircularProgress } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import axios from 'axios';
import { CollectionForm } from '@/components/collections/CollectionForm';
import { CollectionList } from '@/components/collections/CollectionList';
import { DeleteCollectionModal } from '@/components/collections/DeleteCollectionModal';

interface Collection {
  id: string;
  name: string;
  noteCount: number;
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(
    null
  );
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/collections');
      setCollections(data.collections || []);
    } catch (error) {
      console.error('Failed to fetch collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClick = () => {
    setSelectedCollection(null);
    setEditMode(false);
    setFormOpen(true);
  };

  const handleEditClick = (collection: Collection) => {
    setSelectedCollection(collection);
    setEditMode(true);
    setFormOpen(true);
  };

  const handleDeleteClick = (collection: Collection) => {
    setSelectedCollection(collection);
    setDeleteOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setSelectedCollection(null);
    setEditMode(false);
  };

  const handleFormSuccess = () => {
    fetchCollections();
  };

  const handleDeleteClose = () => {
    setDeleteOpen(false);
    setSelectedCollection(null);
  };

  const handleDeleteSuccess = () => {
    fetchCollections();
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
          Collections
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateClick}
          sx={{ textTransform: 'none', fontSize: '1rem' }}
        >
          New Collection
        </Button>
      </Box>

      <Paper sx={{ p: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <CollectionList
            collections={collections}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
          />
        )}
      </Paper>

      <CollectionForm
        open={formOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        mode={editMode ? 'edit' : 'create'}
        initialValues={
          editMode && selectedCollection
            ? { id: selectedCollection.id, name: selectedCollection.name }
            : undefined
        }
      />

      <DeleteCollectionModal
        open={deleteOpen}
        collection={selectedCollection || undefined}
        onClose={handleDeleteClose}
        onSuccess={handleDeleteSuccess}
      />
    </Box>
  );
}
