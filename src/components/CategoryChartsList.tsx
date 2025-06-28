import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  IconButton,
  Chip,
  Card,
  CardContent,
  CardActions
} from '@mui/material';
import { MdDelete as DeleteIcon, MdEdit as EditIcon } from 'react-icons/md';
import { CategoryChart } from './CategoryChart';
import type { CategoryChart as CategoryChartType, Holding, PriceData } from '../models/types';

interface CategoryChartsListProps {
  charts: CategoryChartType[];
  holdings: Holding[];
  prices: Record<string, PriceData>;
  onDeleteChart: (chartId: string) => void;
  onEditChart?: (chartId: string) => void;
}

export const CategoryChartsList: React.FC<CategoryChartsListProps> = ({
  charts,
  holdings,
  prices,
  onDeleteChart,
  onEditChart
}) => {
  if (charts.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Henüz kategori grafiği oluşturulmamış
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Portföyünüzü kategorilere ayırarak özel grafikler oluşturabilirsiniz.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        Kategori Grafikleri ({charts.length})
      </Typography>
      
      <Grid container spacing={3}>
        {charts.map((chart) => (
          <Grid key={chart.id} size={{ xs: 12, lg: 6 }}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1, p: 0 }}>
                <CategoryChart
                  chart={chart}
                  holdings={holdings}
                  prices={prices}
                />
              </CardContent>
              
              <CardActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  <Chip
                    label={`Oluşturulma: ${new Date(chart.createdAt).toLocaleDateString('tr-TR')}`}
                    size="small"
                    variant="outlined"
                  />
                  {chart.updatedAt !== chart.createdAt && (
                    <Chip
                      label={`Güncelleme: ${new Date(chart.updatedAt).toLocaleDateString('tr-TR')}`}
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                  )}
                </Box>
                
                <Box>
                  {onEditChart && (
                    <IconButton
                      size="small"
                      onClick={() => onEditChart(chart.id)}
                      title="Grafiği Düzenle"
                    >
                      <EditIcon />
                    </IconButton>
                  )}
                  <IconButton
                    size="small"
                    onClick={() => onDeleteChart(chart.id)}
                    color="error"
                    title="Grafiği Sil"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}; 