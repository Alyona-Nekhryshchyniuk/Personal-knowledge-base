'use client';

import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Button,
  useMediaQuery,
  useTheme,
  Typography,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FolderIcon from '@mui/icons-material/Folder';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import axios from 'axios';

interface Collection {
  id: string;
  name: string;
  noteCount: number;
}

export function Sidebar({ open, onClose }: { open?: boolean; onClose?: () => void }) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetchCollections();
  }, []);

  useEffect(() => {
    const handleCollectionsUpdate = () => {
      fetchCollections();
    };

    window.addEventListener('collectionsUpdated', handleCollectionsUpdate);
    return () => {
      window.removeEventListener('collectionsUpdated', handleCollectionsUpdate);
    };
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

  const handleNewCollection = () => {
    router.push('/dashboard/collections');
    onClose?.();
  };

  const handleNewTag = () => {
    router.push('/dashboard/tags');
    onClose?.();
  };

  const handleCollectionClick = (collectionId: string) => {
    router.push(`/dashboard?collection=${collectionId}`);
    onClose?.();
  };

  const content = (
    <Box
      sx={{
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            color: 'textSecondary',
            mb: 1,
            textTransform: 'uppercase',
            fontSize: '0.75rem',
            letterSpacing: '0.5px',
          }}
        >
          Management
        </Typography>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleNewCollection}
          sx={{
            textTransform: 'none',
            fontSize: '0.9rem',
            mb: 1,
          }}
        >
          New Collection
        </Button>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleNewTag}
          sx={{
            textTransform: 'none',
            fontSize: '0.9rem',
            mb: 2,
          }}
        >
          New Tag
        </Button>
      </Box>

      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 700,
          color: 'textSecondary',
          mb: 1,
          textTransform: 'uppercase',
          fontSize: '0.75rem',
          letterSpacing: '0.5px',
        }}
      >
        My Collections
      </Typography>

      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        <List sx={{ p: 0 }}>
          {loading ? (
            <ListItem>
              <ListItemText
                primary="Loading..."
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
          ) : collections.length === 0 ? (
            <ListItem>
              <ListItemText
                primary="No collections yet"
                secondary="Create one to organize your notes"
                primaryTypographyProps={{ variant: 'body2' }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItem>
          ) : (
            collections.map((collection) => (
              <ListItemButton
                key={collection.id}
                onClick={() => handleCollectionClick(collection.id)}
                sx={{
                  py: 1,
                  px: 1.5,
                  mb: 0.5,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  '&:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 0.08)',
                  },
                }}
              >
                <FolderIcon sx={{ fontSize: '1.2rem', color: '#1976d2' }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {collection.name}
                  </Typography>
                </Box>
                <Chip
                  label={collection.noteCount}
                  size="small"
                  variant="filled"
                  sx={{
                    height: 20,
                    fontSize: '0.7rem',
                    backgroundColor: 'rgba(25, 118, 210, 0.12)',
                    color: '#1976d2',
                  }}
                />
              </ListItemButton>
            ))
          )}
        </List>
      </Box>
    </Box>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onClose={onClose}>
        <Box sx={{ width: 280 }}>{content}</Box>
      </Drawer>
    );
  }

  return (
    <Box
      sx={{
        width: 280,
        borderRight: '1px solid #e0e0e0',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#fafafa',
        height: '100%',
        overflowY: 'auto',
      }}
    >
      {content}
    </Box>
  );
}
