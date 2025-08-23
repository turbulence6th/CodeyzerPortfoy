import React from 'react';
import { Grid, Paper, Typography, Box } from '@mui/material';
import dayjs from 'dayjs';
import 'dayjs/locale/tr';

dayjs.locale('tr');

interface PortfolioSummaryProps {
  totalValue: number;
  dailyChange: number;
  dailyChangePercent: number;
  loading: boolean;
}

export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({
  totalValue,
  dailyChange,
  dailyChangePercent,
  loading,
}) => {
  const isPositiveChange = dailyChange >= 0;

  return (
    <>
      {/* Toplam Değer Kartı */}
      <Grid size={{ xs: 12 }}>
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
          { !loading && (
            <Box sx={{ mt: 0.5 }}>
              <Typography 
                variant="body2" 
                fontWeight="medium"
                color={isPositiveChange ? 'success.main' : 'error.main'}
              >
                {isPositiveChange ? '+' : ''}
                {dailyChange.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                {' ('}
                {isPositiveChange ? '+' : ''}
                {dailyChangePercent.toFixed(2)}%
                {')'}
              </Typography>
            </Box>
          )}
        </Paper>
      </Grid>
    </>
  );
}; 