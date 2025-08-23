import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Alert,
  Snackbar,
  Switch,
  FormControlLabel,
  Divider,
} from '@mui/material';
import { useAppDispatch } from '../hooks/redux';
import { clearPriceCache } from '../store/portfolioSlice';
import { useTheme } from '../contexts/ThemeContext';

export function Settings() {
  const dispatch = useAppDispatch();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState<boolean>(() => {
    return JSON.parse(localStorage.getItem('isBiometricEnabled') || 'false');
  });
  const { isDarkMode, toggleTheme } = useTheme();

  useEffect(() => {
    localStorage.setItem('isBiometricEnabled', JSON.stringify(isBiometricEnabled));
  }, [isBiometricEnabled]);

  const handleClearCache = () => {
    dispatch(clearPriceCache());
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Ayarlar
      </Typography>

      <Paper sx={{ p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 8 }}>
            <Typography variant="h6">Koyu Tema</Typography>
            <Typography variant="body2" color="text.secondary">
              Uygulamanın görsel temasını açık veya koyu olarak değiştirin.
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }} sx={{ textAlign: { md: 'right' } }}>
            <FormControlLabel
              control={
                <Switch
                  checked={isDarkMode}
                  onChange={toggleTheme}
                />
              }
              label={isDarkMode ? 'Aktif' : 'Pasif'}
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />
        
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 8 }}>
            <Typography variant="h6">Uygulama Kilidi</Typography>
            <Typography variant="body2" color="text.secondary">
              Uygulamayı açarken parmak izi veya yüz tanıma ile koruma sağlayın.
              (Cihazınızın desteklemesi gerekmektedir)
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }} sx={{ textAlign: { md: 'right' } }}>
            <FormControlLabel
              control={
                <Switch
                  checked={isBiometricEnabled}
                  onChange={(e) => setIsBiometricEnabled(e.target.checked)}
                />
              }
              label={isBiometricEnabled ? 'Aktif' : 'Pasif'}
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />
        
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 8 }}>
            <Typography variant="h6">Fiyat Önbelleği</Typography>
            <Typography variant="body2" color="text.secondary">
              Uygulamanın daha hızlı açılması için fiyat verileri cihazınızda saklanır.
              Eğer fiyatlarda bir tutarsızlık olduğunu düşünüyorsanız, tüm önbelleği temizleyebilirsiniz.
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }} sx={{ textAlign: { md: 'right' } }}>
            <Button
              variant="contained"
              color="warning"
              onClick={handleClearCache}
            >
              Önbelleği Temizle
            </Button>
          </Grid>
        </Grid>
      </Paper>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity="success" sx={{ width: '100%' }}>
          Fiyat önbelleği başarıyla temizlendi!
        </Alert>
      </Snackbar>
    </Box>
  );
}
