import React from 'react';
import { Grid, Paper, Typography } from '@mui/material';
import dayjs from 'dayjs';
import 'dayjs/locale/tr';

dayjs.locale('tr');

interface PortfolioSummaryProps {
  totalValue: number;
  holdingsCount: number;
  loading: boolean;
  error: string | null;
  lastUpdate: string | null; // Artık string | null
}

export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({
  totalValue,
  holdingsCount,
  loading,
  error,
  lastUpdate
}) => {
  const lastUpdateFormatted = lastUpdate 
    ? dayjs(lastUpdate).format('DD MMMM YYYY, HH:mm')
    : 'Henüz güncellenmedi';

  return (
    <>
      {/* Toplam Değer Kartı */}
      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        <Paper sx={{ 
          p: 2, 
          textAlign: 'center', 
          height: '120px', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center',
          overflow: 'hidden'
        }}>
          <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 1 }}>
            Toplam Değer
          </Typography>
          <Typography 
            variant="h5" 
            color="primary" 
            fontWeight="bold"
            sx={{ 
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
              lineHeight: 1.2,
              wordBreak: 'break-word'
            }}
          >
            ₺{totalValue.toLocaleString('tr-TR', { 
              minimumFractionDigits: 0,
              maximumFractionDigits: 0 
            })}
          </Typography>
        </Paper>
      </Grid>

      {/* Varlık Sayısı Kartı */}
      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        <Paper sx={{ 
          p: 2, 
          textAlign: 'center', 
          height: '120px', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center',
          overflow: 'hidden'
        }}>
          <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 1 }}>
            Toplam Varlık
          </Typography>
          <Typography 
            variant="h5" 
            color="secondary" 
            fontWeight="bold"
            sx={{ 
              fontSize: { xs: '1.5rem', sm: '2rem' },
              lineHeight: 1.2
            }}
          >
            {holdingsCount}
          </Typography>
        </Paper>
      </Grid>

      {/* Son Güncelleme Kartı */}
      <Grid size={{ xs: 12, sm: 12, md: 4 }}>
        <Paper sx={{ 
          p: 2, 
          textAlign: 'center', 
          height: '120px', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center',
          overflow: 'hidden'
        }}>
          <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 1 }}>
            Son Güncelleme
          </Typography>
          <Typography 
            variant="body2" 
            fontWeight="medium"
            sx={{ 
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              lineHeight: 1.3,
              px: 1,
              wordBreak: 'break-word'
            }}
          >
            {loading ? 'Güncelleniyor...' : error ? 'Hata oluştu' : lastUpdateFormatted}
          </Typography>
        </Paper>
      </Grid>
    </>
  );
}; 