import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Alert,
  Snackbar,
} from '@mui/material';
import { useAppDispatch } from '../hooks/redux';
import { clearPriceCache } from '../store/portfolioSlice';

export function Settings() {
  const dispatch = useAppDispatch();
  const [snackbarOpen, setSnackbarOpen] = useState(false);

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
