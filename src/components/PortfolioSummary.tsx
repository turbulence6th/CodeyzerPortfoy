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
  totalDebt: number;
}

export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({
  totalValue,
  dailyChange,
  dailyChangePercent,
  loading,
  totalDebt,
}) => {
  const isPositiveChange = dailyChange >= 0;
  const netWorth = totalValue - totalDebt;

  return (
    <>
      {/* Toplam Değer Kartı */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Paper sx={{ 
          p: 2, 
          textAlign: 'center', 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center',
          overflow: 'hidden'
        }}>
          <Typography variant="h6" color="text.primary" sx={{ mb: 2 }}>
            Net Varlık Durumu
          </Typography>
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'space-around', 
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1
            }}
          >
            {/* Anapara */}
            <Box>
              <Typography variant="caption" color="text.secondary">TOPLAM VARLIKLAR</Typography>
              <Typography variant="h6" fontWeight="medium">
                ₺{totalValue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
              </Typography>
            </Box>
            
            <Typography variant="h5" color="text.secondary">-</Typography>
            
            {/* Borç */}
            <Box>
              <Typography variant="caption" color="text.secondary">TOPLAM BORÇ</Typography>
              <Typography variant="h6" fontWeight="medium">
                ₺{totalDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
              </Typography>
            </Box>

            <Typography variant="h5" color="primary">=</Typography>

            {/* Net Para */}
            <Box>
              <Typography variant="caption" color="text.secondary">NET VARLIK</Typography>
              <Typography variant="h5" color="primary" fontWeight="bold">
                ₺{netWorth.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
              </Typography>
            </Box>
          </Box>
          
          { !loading && (
            <Box sx={{ mt: 2 }}>
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