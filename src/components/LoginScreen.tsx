import React from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import { MdFingerprint as FingerprintIcon } from 'react-icons/md';

interface LoginScreenProps {
  onUnlock: () => void;
  error?: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onUnlock, error }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        p: 2,
        backgroundColor: 'background.default',
      }}
    >
      <Paper
        elevation={4}
        sx={{
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
          borderRadius: 4,
          maxWidth: '400px',
          width: '100%',
        }}
      >
        <Typography variant="h5" component="h1" gutterBottom>
          Codeyzer Portföy
        </Typography>
        
        <FingerprintIcon size={64} style={{ color: 'var(--mui-palette-primary-main)' }} />

        <Typography variant="body1" color="text.secondary" align="center">
          Devam etmek için kimliğinizi doğrulayın.
        </Typography>

        {error && (
          <Typography variant="body2" color="error" align="center">
            {error}
          </Typography>
        )}

        <Button
          variant="contained"
          size="large"
          onClick={onUnlock}
          startIcon={<FingerprintIcon />}
          sx={{ mt: 2 }}
        >
          Uygulamayı Aç
        </Button>
      </Paper>
    </Box>
  );
};
