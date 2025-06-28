import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  Box,
  Grid
} from '@mui/material';
import type { Holding } from '../models/types';

interface EditHoldingDialogProps {
  open: boolean;
  holding: Holding | null;
  onClose: () => void;
  onUpdateHolding: (id: string, updates: Partial<Holding>) => void;
}

export const EditHoldingDialog: React.FC<EditHoldingDialogProps> = ({
  open,
  holding,
  onClose,
  onUpdateHolding
}) => {
  const [symbol, setSymbol] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (holding && open) {
      setSymbol(holding.symbol);
      setAmount(holding.amount.toString());
      setNote(holding.note || '');
    }
  }, [holding, open]);

  const handleSave = () => {
    setError('');

    if (!symbol.trim()) {
      setError('Sembol zorunludur');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Geçerli bir miktar giriniz');
      return;
    }

    if (holding) {
      const updates: Partial<Holding> = {
        symbol: symbol.toUpperCase().trim(),
        name: symbol.toUpperCase().trim(),
        amount: amountNum,
        note: note.trim() || undefined,
        updatedAt: new Date().toISOString(),
      };

      onUpdateHolding(holding.id, updates);
    }
  };

  const handleClose = () => {
    setSymbol('');
    setAmount('');
    setNote('');
    setError('');
    onClose();
  };

  if (!holding) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
      <DialogTitle>Varlığı Düzenle</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ pt: 1 }}>
          <Grid container spacing={2}>
            {/* Sembol */}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Sembol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                required
              />
            </Grid>

            {/* Miktar */}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Miktar"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputProps={{ min: 0, step: 'any' }}
                required
              />
            </Grid>

            {/* Not */}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Not (Opsiyonel)"
                multiline
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Bu varlık hakkında notlarınız..."
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>İptal</Button>
        <Button
          variant="contained"
          onClick={handleSave}
        >
          Güncelle
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 