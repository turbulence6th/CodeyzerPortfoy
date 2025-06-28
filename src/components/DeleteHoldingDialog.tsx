import React from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button
} from '@mui/material';
import type { Holding } from '../models/types';

interface DeleteHoldingDialogProps {
  open: boolean;
  holding: Holding | null;
  onClose: () => void;
  onDeleteHolding: (id: string) => void;
}

export const DeleteHoldingDialog: React.FC<DeleteHoldingDialogProps> = ({
  open,
  holding,
  onClose,
  onDeleteHolding
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const handleConfirm = () => {
    if (!holding) return;
    
    onDeleteHolding(holding.id);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth fullScreen={fullScreen}>
      <DialogTitle>Varlığı Sil</DialogTitle>
      <DialogContent>
        <Typography>
          <strong>{holding?.symbol}</strong> varlığını portföyünüzden silmek istediğinizden emin misiniz?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Bu işlem geri alınamaz.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>İptal</Button>
        <Button onClick={handleConfirm} variant="contained" color="error">
          Sil
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 