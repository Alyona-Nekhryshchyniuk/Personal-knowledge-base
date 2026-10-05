'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { Box, Button, Container, Typography, Paper, CircularProgress } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import GitHubIcon from '@mui/icons-material/GitHub';

export default function LoginPage() {
  const [loading, setLoading] = useState<'google' | 'github' | null>(null);

  const handleSignIn = async (provider: 'google' | 'github') => {
    setLoading(provider);
    try {
      await signIn(provider, { redirectTo: '/dashboard' });
    } catch (error) {
      console.error('Sign-in error:', error);
      setLoading(null);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          gap: 3,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            width: '100%',
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
              Personal Knowledge Base
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Organize, review, and master your knowledge
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button
              fullWidth
              variant="contained"
              startIcon={
                loading === 'google' ? <CircularProgress size={20} /> : <GoogleIcon />
              }
              onClick={() => handleSignIn('google')}
              disabled={loading !== null}
              sx={{
                py: 1.5,
                textTransform: 'none',
                fontSize: '1rem',
              }}
            >
              {loading === 'google' ? 'Signing in...' : 'Continue with Google'}
            </Button>

            <Button
              fullWidth
              variant="contained"
              startIcon={
                loading === 'github' ? <CircularProgress size={20} /> : <GitHubIcon />
              }
              onClick={() => handleSignIn('github')}
              disabled={loading !== null}
              sx={{
                py: 1.5,
                textTransform: 'none',
                fontSize: '1rem',
                backgroundColor: '#333',
                '&:hover': {
                  backgroundColor: '#444',
                },
              }}
            >
              {loading === 'github' ? 'Signing in...' : 'Continue with GitHub'}
            </Button>
          </Box>

          <Typography variant="caption" color="textSecondary" sx={{ textAlign: 'center' }}>
            By signing in, you agree to our Terms of Service and Privacy Policy
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
}
