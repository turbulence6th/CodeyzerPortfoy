import React from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip
} from '@mui/material';
import type { CategoryChart as CategoryChartType } from '../models/types';

interface DeleteCategoryChartDialogProps {
  open: boolean;
  chart: CategoryChartType | null;
  onClose: () => void;
  onDeleteChart: (chartId: string) => void;
}

export const DeleteCategoryChartDialog: React.FC<DeleteCategoryChartDialogProps> = ({
  open,
  chart,
  onClose,
  onDeleteChart
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const handleDelete = () => {
    if (chart) {
      onDeleteChart(chart.id);
      onClose();
    }
  };

  if (!chart) return null;

  const totalAssets = chart.categories.reduce((sum, cat) => sum + cat.holdingIds.length, 0);

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      fullScreen={fullScreen}
    >
      <DialogTitle>Kategori Grafiğini Sil</DialogTitle>
      <DialogContent>
        <Box>
          <Typography variant="body1" sx={{ mb: 2 }}>
            <strong>"{chart.name}"</strong> adlı kategori grafiğini silmek istediğinizden emin misiniz?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Bu işlem geri alınamaz. Grafik ve içindeki tüm kategoriler silinecektir.
          </Typography>
        </Box>

        {chart.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {chart.description}
          </Typography>
        )}

        <Box sx={{ mt: 2, p: 2, backgroundColor: 'error.light', borderRadius: 1 }}>
          <Typography variant="body2" color="error.contrastText">
            <strong>Bu işlem geri alınamaz!</strong>
          </Typography>
          <Typography variant="body2" color="error.contrastText" sx={{ mt: 1 }}>
            • {chart.categories.length} kategori silinecek
          </Typography>
          <Typography variant="body2" color="error.contrastText">
            • {totalAssets} varlık kategorisinden çıkarılacak
          </Typography>
          <Typography variant="body2" color="error.contrastText">
            • Grafik verisi kalıcı olarak silinecek
          </Typography>
        </Box>

        {chart.categories.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Silinecek kategoriler:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {chart.categories.map((category) => (
                <Chip
                  key={category.id}
                  label={`${category.name} (${category.holdingIds.length})`}
                  size="small"
                  sx={{ 
                    backgroundColor: category.color + '20',
                    color: category.color 
                  }}
                />
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>İptal</Button>
        <Button 
          onClick={handleDelete} 
          variant="contained" 
          color="error"
        >
          Sil
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 