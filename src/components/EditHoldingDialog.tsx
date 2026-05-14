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
  const [buyTargetMin, setBuyTargetMin] = useState('');
  const [buyTargetMax, setBuyTargetMax] = useState('');
  const [error, setError] = useState('');

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (holding && open) {
      setSymbol(holding.symbol);
      setAmount(holding.amount.toString());
      setNote(holding.note || '');
      setBuyTargetMin(holding.buyTargetMin != null ? holding.buyTargetMin.toString() : '');
      setBuyTargetMax(holding.buyTargetMax != null ? holding.buyTargetMax.toString() : '');
    }
  }, [holding, open]);

  const handleSave = () => {
    setError('');

    if (!symbol.trim()) {
      setError('Sembol zorunludur');
      return;
    }

    const amountNum = parseFloat(amount);
    const isTry = symbol.toUpperCase().trim() === 'TRY';

    if (isNaN(amountNum) || (isTry ? amountNum === 0 : amountNum <= 0)) {
      setError(isTry ? 'Miktar 0 olamaz' : 'Geçerli bir miktar giriniz (0\'dan büyük)');
      return;
    }

    const minTrim = buyTargetMin.trim();
    const maxTrim = buyTargetMax.trim();
    let parsedMin: number | undefined;
    let parsedMax: number | undefined;
    if (holding?.type === 'STOCK' && (minTrim || maxTrim)) {
      if (!minTrim || !maxTrim) {
        setError('Alım aralığı için hem alt hem üst sınır girilmeli');
        return;
      }
      const minNum = parseFloat(minTrim);
      const maxNum = parseFloat(maxTrim);
      if (isNaN(minNum) || isNaN(maxNum) || minNum <= 0 || maxNum <= 0) {
        setError('Alım aralığı değerleri 0\'dan büyük olmalı');
        return;
      }
      if (minNum > maxNum) {
        setError('Alım aralığı alt sınırı üst sınırdan büyük olamaz');
        return;
      }
      parsedMin = minNum;
      parsedMax = maxNum;
    }

    if (holding) {
      const updates: Partial<Holding> = {
        symbol: symbol.toUpperCase().trim(),
        name: symbol.toUpperCase().trim(),
        amount: amountNum,
        note: note.trim() || undefined,
        buyTargetMin: parsedMin,
        buyTargetMax: parsedMax,
        updatedAt: new Date().toISOString(),
      };

      onUpdateHolding(holding.id, updates);
    }
  };

  const handleClose = () => {
    setSymbol('');
    setAmount('');
    setNote('');
    setBuyTargetMin('');
    setBuyTargetMax('');
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
                inputProps={{ step: 'any' }}
                required
              />
            </Grid>

            {/* Alım Aralığı — sadece STOCK */}
            {holding.type === 'STOCK' && (
              <>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    label="Alım Alt Sınır ₺"
                    type="number"
                    value={buyTargetMin}
                    onChange={(e) => setBuyTargetMin(e.target.value)}
                    inputProps={{ step: 'any', min: 0 }}
                    helperText="Opsiyonel"
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    label="Alım Üst Sınır ₺"
                    type="number"
                    value={buyTargetMax}
                    onChange={(e) => setBuyTargetMax(e.target.value)}
                    inputProps={{ step: 'any', min: 0 }}
                    helperText="Fiyat aralığa girince satır vurgulanır"
                  />
                </Grid>
              </>
            )}

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